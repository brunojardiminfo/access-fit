export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalcularPeloParcelamento } from "@/lib/parcelas";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const before = await prisma.installment.findUnique({ where: { id }, select: { status: true, amount: true } });
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) { data.status = body.status; data.paidAt = body.status === "paid" ? new Date() : null; }
  if (body.dueDate !== undefined) data.dueDate = new Date(body.dueDate);
  if (body.amount !== undefined) data.amount = body.amount;

  const installment = await prisma.installment.update({ where: { id }, data });

  // Registra ou reverte o pagamento no razão conforme a mudança de status da parcela
  if (body.status !== undefined && body.status !== before?.status) {
    if (body.status === "paid") {
      const order = await prisma.order.findUnique({ where: { id: installment.orderId }, select: { paymentMethod: true } });
      await prisma.payment.create({
        data: { orderId: installment.orderId, installmentId: installment.id, amount: installment.amount, paymentMethod: order?.paymentMethod || "pix" },
      });
    } else if (before?.status === "paid") {
      const lastPayment = await prisma.payment.findFirst({ where: { installmentId: installment.id }, orderBy: { createdAt: "desc" } });
      if (lastPayment) await prisma.payment.delete({ where: { id: lastPayment.id } });
    }
  }

  // Mudar o valor de uma parcela JA PAGA precisa corrigir o pagamento que ela
  // gerou no razao. Sem isso o financeiro fica contando o valor antigo.
  if (body.amount !== undefined && body.status === undefined && before?.status === "paid") {
    const pagamento = await prisma.payment.findFirst({
      where: { installmentId: installment.id },
      orderBy: { createdAt: "desc" },
    });
    if (pagamento) {
      await prisma.payment.update({ where: { id: pagamento.id }, data: { amount: installment.amount } });
    }
  }

  // Uma conta so, compartilhada com o Caderno: as parcelas sao a verdade.
  await recalcularPeloParcelamento(installment.orderId);

  return NextResponse.json(installment);
}
