export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrementProductStock, restoreProductStock } from "@/lib/stock";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = {};
  if (status) where.status = status;

  const returns = await prisma.return.findMany({
    where,
    include: {
      order: {
        include: {
          user: true,
          items: { include: { product: true } },
        },
      },
      replacementProduct: true,
    },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json({ returns });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { orderId, reason, amount, itemIds } = await req.json();

  if (!orderId || !amount) {
    return NextResponse.json({ error: "Faltam campos" }, { status: 400 });
  }

  // Bloqueia duplicidade: não deixa abrir uma segunda devolução para um item que já tem uma em andamento
  if (itemIds?.length) {
    const existing = await prisma.return.findMany({
      where: { orderId, status: { not: "rejeitado" } },
    });
    const jaEmDevolucao = existing.some(r => {
      const existingIds: string[] = JSON.parse(r.orderItemIds || "[]");
      return existingIds.some(id => itemIds.includes(id));
    });
    if (jaEmDevolucao) {
      return NextResponse.json({ error: "Já existe uma devolução em andamento para um desses itens." }, { status: 409 });
    }
  }

  // Guarda uma foto dos itens devolvidos (produto/cor/tamanho/quantidade) antes de qualquer troca de produto
  const items = itemIds?.length
    ? await prisma.orderItem.findMany({ where: { id: { in: itemIds } } })
    : [];
  const returnedItemsSnapshot = items.map(i => ({ productId: i.productId, size: i.size, color: i.color, quantity: i.quantity }));

  const devolution = await prisma.return.create({
    data: {
      orderId,
      reason,
      amount,
      orderItemIds: JSON.stringify(itemIds || []),
      returnedItemsSnapshot: JSON.stringify(returnedItemsSnapshot),
    },
    include: { order: true },
  });

  return NextResponse.json({ devolution });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id, status, replacementProductId, replacementSize, replacementColor } = await req.json();

  // Troca do produto substituto (independente da mudança de status)
  if (replacementProductId !== undefined) {
    const current = await prisma.return.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Devolução não encontrada" }, { status: 404 });

    const itemIds: string[] = JSON.parse(current.orderItemIds || "[]");
    const items = itemIds.length
      ? await prisma.orderItem.findMany({ where: { id: { in: itemIds } } })
      : [];
    const quantity = items.reduce((s, i) => s + i.quantity, 0) || 1;

    // Se já havia um substituto enviado, restaura o estoque dele antes de trocar
    if (current.replacementProductId && current.replacementSentAt) {
      await restoreProductStock(current.replacementProductId, quantity, current.replacementSize, current.replacementColor);
    }

    if (replacementProductId) {
      await decrementProductStock(replacementProductId, quantity, replacementSize, replacementColor);

      // Atualiza o item do pedido para refletir o produto de troca (quando há exatamente 1 item vinculado)
      if (items.length === 1) {
        const newProduct = await prisma.product.findUnique({ where: { id: replacementProductId } });
        if (newProduct) {
          await prisma.orderItem.update({
            where: { id: items[0].id },
            data: {
              productId: replacementProductId,
              size: replacementSize || null,
              color: replacementColor || null,
              price: newProduct.price,
              costPrice: newProduct.costPrice ?? null,
            },
          });
          const remaining = await prisma.orderItem.findMany({ where: { orderId: items[0].orderId } });
          const newTotal = remaining.reduce((s, i) => s + i.price * i.quantity, 0);
          await prisma.order.update({ where: { id: items[0].orderId }, data: { total: newTotal, subtotal: newTotal } });
        }
      }
    }

    const devolution = await prisma.return.update({
      where: { id },
      data: {
        replacementProductId: replacementProductId || null,
        replacementSize: replacementSize || null,
        replacementColor: replacementColor || null,
        replacementSentAt: replacementProductId ? new Date() : null,
      },
    });
    return NextResponse.json({ devolution });
  }

  const statusMap: { [key: string]: string } = {
    aprovar: "aprovado",
    rejeitar: "rejeitado",
    receber: "recebido",
    reembolsar: "reembolsado",
  };

  // Restaura o estoque dos itens devolvidos ao marcar como "recebido" (uma única vez)
  if (status === "receber") {
    const current = await prisma.return.findUnique({
      where: { id },
      include: { order: { include: { items: true } } },
    });
    if (current && !current.stockRestored) {
      const snapshot: { productId: string; size: string | null; color?: string | null; quantity: number }[] = JSON.parse(current.returnedItemsSnapshot || "[]");
      if (snapshot.length) {
        // Usa a foto tirada na solicitação — continua correta mesmo se o item do pedido já foi trocado por outro produto
        for (const s of snapshot) {
          await restoreProductStock(s.productId, s.quantity, s.size, s.color);
        }
      } else {
        const itemIds: string[] = JSON.parse(current.orderItemIds || "[]");
        const items = itemIds.length
          ? current.order.items.filter(i => itemIds.includes(i.id))
          : current.order.items; // devoluções antigas sem itemIds/snapshot: restaura o pedido todo
        for (const item of items) {
          await restoreProductStock(item.productId, item.quantity, item.size, item.color);
        }
      }
    }
  }

  const devolution = await prisma.return.update({
    where: { id },
    data: {
      status: statusMap[status] || status,
      ...(status === "aprovar" && { approvedAt: new Date() }),
      ...(status === "receber" && { returnedAt: new Date(), stockRestored: true }),
      ...(status === "reembolsar" && { reimbursedAt: new Date() }),
    },
  });

  return NextResponse.json({ devolution });
}
