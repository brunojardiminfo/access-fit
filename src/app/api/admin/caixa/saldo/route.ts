export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MOVIMENTA_CAIXA } from "@/lib/credito";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const dateFilter = from ? { gte: new Date(from) } : undefined;

  const [receitas, todasDespesas, despesasEstoque, aportes, estoque, cadernoAberto] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { order: { status: { not: "cancelled" } }, ...MOVIMENTA_CAIXA, ...(dateFilter ? { receivedAt: dateFilter } : {}) },
    }),
    // Todas as despesas (incluindo estoque)
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: dateFilter ? { date: dateFilter } : {},
    }),
    // Estoque separado só para info
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { category: "estoque", ...(dateFilter ? { date: dateFilter } : {}) },
    }),
    prisma.cashInjection.aggregate({
      _sum: { amount: true },
      where: dateFilter ? { date: dateFilter } : {},
    }),
    // Valor do estoque atual ao custo
    prisma.product.aggregate({
      _sum: { costPrice: true },
      where: { active: true, NOT: { slug: "venda-manual" } },
    }),
    // A receber
    prisma.order.findMany({
      where: { paymentStatus: { not: "paid" }, status: { not: "cancelled" } },
      select: { total: true, amountPaid: true },
    }),
  ]);

  const receitasVal    = receitas._sum.amount || 0;
  const despesasVal    = todasDespesas._sum.amount || 0;
  const despesasEstVal = despesasEstoque._sum.amount || 0;
  const aportesVal     = aportes._sum.amount || 0;
  const estoqueVal     = estoque._sum.costPrice || 0;
  const aReceberVal    = cadernoAberto.reduce((s, o) => s + (o.total - o.amountPaid), 0);

  // Caixa real = receitas + aportes - TODAS as despesas (incluindo estoque)
  const caixa = receitasVal + aportesVal - despesasVal;

  // Patrimônio = caixa + estoque (ao custo) + a receber
  const patrimonio = caixa + estoqueVal + aReceberVal;

  return NextResponse.json({
    caixa,
    despesas: despesasVal,
    despesasEstoque: despesasEstVal,
    estoqueValor: estoqueVal,
    aReceber: aReceberVal,
    patrimonio,
    receitas: receitasVal,
    aportes: aportesVal,
    from: from || null,
  });
}
