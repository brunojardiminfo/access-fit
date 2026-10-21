export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const fromDate = from ? new Date(from) : new Date();
  const toDate = to ? new Date(to + "T23:59:59") : new Date();

  // Receita: sum de Order.total criados no período
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: fromDate, lte: toDate },
      status: { not: "cancelled" },
    },
    select: {
      total: true, paymentMethod: true, dueDate: true,
      // O custo do catálogo entra junto: pedido feito pelo site não grava o
      // custo no item, e sem esta queda a venda online contava como se a peça
      // fosse de graça — o mesmo fallback que métricas e analytics já faziam.
      items: { select: { costPrice: true, quantity: true, product: { select: { costPrice: true } } } },
    },
  });

  // Receita total
  const receita = orders.reduce((s, o) => s + o.total, 0);

  // Recebimentos do Caderno (orders com paymentMethod = "caderno" e dueDate no período)
  const recebimentos = orders
    .filter(o => o.paymentMethod === "caderno" && o.dueDate && new Date(o.dueDate) >= fromDate && new Date(o.dueDate) <= toDate)
    .reduce((s, o) => s + o.total, 0);

  // Custos de Produtos (sum de costPrice * quantity)
  const custos = orders.reduce((s, o) =>
    s + o.items.reduce((si, item) =>
      si + ((item.costPrice ?? item.product?.costPrice ?? 0) * item.quantity), 0), 0);

  // Despesas Gerais (todas as despesas exceto taxa_operadora)
  const despesas = await prisma.expense.findMany({
    where: {
      date: { gte: fromDate, lte: toDate },
      category: { not: "taxa_operadora" },
    },
    select: { amount: true },
  });

  const despesasTotal = despesas.reduce((s, e) => s + e.amount, 0);

  return NextResponse.json({
    receita,
    recebimentos,
    custos,
    despesas: despesasTotal,
  });
}
