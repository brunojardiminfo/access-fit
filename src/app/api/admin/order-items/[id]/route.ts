export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalcOrderTotals } from "@/lib/orderTotals";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const { costPrice, price } = await req.json();

  const data: { costPrice?: number | null; price?: number } = {};
  if (costPrice !== undefined) {
    data.costPrice = costPrice !== null && costPrice !== "" ? parseFloat(costPrice) : null;
  }
  if (price !== undefined && price !== null && price !== "") {
    // Pedido já pago não pode ter o preço de venda alterado
    const current = await prisma.orderItem.findUnique({ where: { id }, include: { order: true } });
    if (current?.order.paymentStatus === "paid") {
      return NextResponse.json({ error: "Pedido já pago não pode ter o preço alterado" }, { status: 409 });
    }
    data.price = parseFloat(price);
  }

  const item = await prisma.orderItem.update({ where: { id }, data });

  // Preço de venda mudou: recalcula o total do pedido
  if (data.price !== undefined) {
    await recalcOrderTotals(item.orderId);
  }

  return NextResponse.json(item);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const item = await prisma.orderItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  await prisma.orderItem.delete({ where: { id } });

  // Recalcula o total do pedido
  const pedido = await recalcOrderTotals(item.orderId);

  return NextResponse.json({ ok: true, newTotal: pedido.total });
}
