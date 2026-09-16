export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalcOrderTotals } from "@/lib/orderTotals";
import { consomeEstoque, restoreProductStock } from "@/lib/stock";
import { parseJson } from "@/lib/utils";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin")
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

/**
 * Tira uma peça do pedido e devolve ela ao estoque.
 *
 * É o caminho do Home Try-On: a cliente levou cinco peças, ficou com duas, e as
 * outras três saem do pedido. Elas voltaram para a loja de verdade, então
 * precisam voltar para o estoque — antes só sumiam do pedido, e a peça ficava
 * contada como vendida para sempre.
 *
 * A devolução só acontece se aquele pedido tinha mesmo dado baixa: pedido ainda
 * "Aguardando" nunca tirou nada do estoque, e pedido cancelado já devolveu tudo
 * quando foi cancelado. Devolver de novo criaria estoque do nada.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const item = await prisma.orderItem.findUnique({
    where: { id },
    include: { order: { select: { id: true, status: true } } },
  });
  if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

  // Item que já voltou ao estoque por uma devolução não volta outra vez.
  const devolucoes = await prisma.return.findMany({
    where: { orderId: item.orderId, stockRestored: true },
    select: { orderItemIds: true },
  });
  const jaDevolvido = devolucoes.some(d => parseJson<string[]>(d.orderItemIds, []).includes(id));

  const devolveAoEstoque = consomeEstoque(item.order.status) && !jaDevolvido;
  if (devolveAoEstoque) {
    await restoreProductStock(item.productId, item.quantity, item.size, item.color);
  }

  await prisma.orderItem.delete({ where: { id } });

  const pedido = await recalcOrderTotals(item.orderId);

  return NextResponse.json({ ok: true, newTotal: pedido.total, estoqueDevolvido: devolveAoEstoque });
}
