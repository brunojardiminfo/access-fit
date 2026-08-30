export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/firebase-admin";
import { restoreProductStock, ajustarEstoquePorStatus, consomeEstoque } from "@/lib/stock";
import { recalcOrderTotals } from "@/lib/orderTotals";

const STATUS_NOTIFICATION: Record<string, { title: string; body: string }> = {
  confirmed: { title: "Pedido confirmado ✅", body: "Já estamos preparando tudo para você." },
  shipped: { title: "Pedido a caminho 📦", body: "Seu pedido saiu para entrega." },
  delivered: { title: "Pedido entregue 🎉", body: "Esperamos que você ame suas peças!" },
  cancelled: { title: "Pedido cancelado", body: "Seu pedido foi cancelado." },
};

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const before = await prisma.order.findUnique({ where: { id }, select: { status: true, amountPaid: true, paymentMethod: true } });
  const previousStatus = before?.status;
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.paymentStatus !== undefined) data.paymentStatus = body.paymentStatus;
  if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;
  if (body.amountPaid !== undefined) data.amountPaid = body.amountPaid;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.installmentCount !== undefined) data.installmentCount = body.installmentCount;
  if (body.userId !== undefined) data.userId = body.userId;
  if (body.discount !== undefined) data.discount = Math.max(0, Number(body.discount) || 0);

  // Estoque acompanha o status: sai ao confirmar/enviar/entregar/try-on e volta
  // ao cancelar. Pedido que nunca passou por esses status nao tem o que devolver.
  if (body.status !== undefined && body.status !== previousStatus) {
    await ajustarEstoquePorStatus(id, previousStatus, body.status);
  }

  // Marca data de entrega na primeira vez que o status vira "delivered"
  if (body.status === "delivered") {
    const current = await prisma.order.findUnique({ where: { id }, select: { deliveredAt: true } });
    if (current && !current.deliveredAt) data.deliveredAt = new Date();
  }

  const order = await prisma.order.update({ where: { id }, data });

  // Registra no razão de pagamentos o valor recebido nesta edição (se aumentou)
  if (body.amountPaid !== undefined && before) {
    const delta = body.amountPaid - before.amountPaid;
    if (delta > 0.001) {
      await prisma.payment.create({
        data: { orderId: id, amount: delta, paymentMethod: body.paymentMethod ?? before.paymentMethod },
      });
    }
  }

  // Registra a mudança de status na jornada do pedido
  if (body.status !== undefined && body.status !== previousStatus) {
    await prisma.orderStatusHistory.create({ data: { orderId: id, status: body.status } });
  }

  // Notifica o cliente por push quando o status muda (não bloqueia a resposta em caso de falha)
  if (body.status !== undefined && body.status !== previousStatus) {
    const notification = STATUS_NOTIFICATION[body.status];
    if (notification) {
      sendPushToUser(order.userId, notification.title, notification.body).catch(err =>
        console.error("[push] Erro ao notificar pedido", id, err)
      );
    }
  }

  // Append items to existing order
  if (body.addItems?.length) {
    const vendaManual = await prisma.product.findFirst({ where: { name: "Venda Manual" } });
    if (!vendaManual) return NextResponse.json({ error: "Produto 'Venda Manual' não encontrado" }, { status: 500 });

    const addedTotal = body.addItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    await prisma.orderItem.createMany({
      data: body.addItems.map((i: any) => ({
        orderId: id,
        productId: i.productId || vendaManual.id,
        quantity: i.quantity,
        price: i.price,
        size: i.description || null,
      })),
    });
    await prisma.order.update({
      where: { id },
      data: { total: { increment: addedTotal }, subtotal: { increment: addedTotal } },
    });
  }

  // Generate installments when dueDate + installmentCount are provided
  if (body.dueDate && body.installmentCount && body.installmentCount > 0 && body.generateInstallments) {
    const count = body.installmentCount;
    const firstDue = new Date(body.dueDate);
    const totalSaldo = order.total - (typeof body.amountPaid === 'number' ? body.amountPaid : order.amountPaid);
    const perInstallment = Math.round((totalSaldo / count) * 100) / 100;

    // Delete existing installments
    await prisma.installment.deleteMany({ where: { orderId: id } });

    // Create new installments
    for (let i = 0; i < count; i++) {
      const due = new Date(firstDue);
      due.setMonth(due.getMonth() + i);
      await prisma.installment.create({
        data: {
          orderId: id,
          number: i + 1,
          amount: i === count - 1 ? Math.round((totalSaldo - perInstallment * (count - 1)) * 100) / 100 : perInstallment,
          dueDate: due,
          status: "pending",
        },
      });
    }
  }

  // Desconto mudou: total volta a ser subtotal menos desconto
  if (body.discount !== undefined) await recalcOrderTotals(id);

  const updated = await prisma.order.findUnique({
    where: { id },
    include: {
      installments: { orderBy: { number: "asc" } },
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  // Restaurar estoque dos itens vinculados a produtos reais
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (order && consomeEstoque(order.status)) {
    for (const item of order.items) {
      await restoreProductStock(item.productId, item.quantity, item.size);
    }
  }

  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
