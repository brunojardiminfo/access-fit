export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MOVIMENTA_CAIXA } from "@/lib/credito";

const MARKER = "__saldo_abertura__";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const startDate = from ? new Date(from + "T00:00:00.000Z") : new Date("2020-01-01");
  const endDate = to ? new Date(to + "T23:59:59.999Z") : new Date();

  // Verificar se existe saldo de abertura configurado
  const aberturaEntry = await prisma.cashInjection.findFirst({
    where: { description: { startsWith: MARKER } },
    orderBy: { createdAt: "desc" },
  });

  const aberturaDate = aberturaEntry ? aberturaEntry.date : null;
  const aberturaAmount = aberturaEntry ? aberturaEntry.amount : null;

  // Compara apenas a parte da data (YYYY-MM-DD) para evitar problemas de hora/timezone
  const toDateStr = (d: Date) => d.toISOString().split("T")[0];
  const usarAbertura = aberturaDate && toDateStr(startDate) >= toDateStr(aberturaDate);

  let saldoAnterior: number;

  if (usarAbertura && aberturaAmount !== null) {
    // Calcula apenas o que aconteceu entre a data de abertura e o início do período filtrado
    if (toDateStr(startDate) === toDateStr(aberturaDate)) {
      // Período começa exatamente na data de abertura
      saldoAnterior = aberturaAmount;
    } else {
      // Há transações entre abertura e início do período
      const [pagamentosInter, aportesInter] = await Promise.all([
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { receivedAt: { gte: aberturaDate, lt: startDate }, order: { status: { not: "cancelled" } }, ...MOVIMENTA_CAIXA },
        }),
        prisma.cashInjection.aggregate({
          _sum: { amount: true },
          where: { date: { gte: aberturaDate, lt: startDate }, NOT: { description: { startsWith: MARKER } } },
        }),
      ]);
      saldoAnterior = aberturaAmount + (pagamentosInter._sum.amount || 0) + (aportesInter._sum.amount || 0);
    }
  } else {
    // Sem saldo de abertura: soma tudo antes do período
    const [pagamentosAntes, aportesAntes] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { receivedAt: { lt: startDate }, order: { status: { not: "cancelled" } }, ...MOVIMENTA_CAIXA },
      }),
      prisma.cashInjection.aggregate({
        _sum: { amount: true },
        where: { date: { lt: startDate }, NOT: { description: { startsWith: MARKER } } },
      }),
    ]);
    saldoAnterior = (pagamentosAntes._sum.amount || 0) + (aportesAntes._sum.amount || 0);
  }

  // Buscar movimentações do período (apenas entradas/saídas de caixa reais)
  const [payments, aportes] = await Promise.all([
    prisma.payment.findMany({
      where: {
        receivedAt: { gte: startDate, lte: endDate },
        order: { status: { not: "cancelled" } }, ...MOVIMENTA_CAIXA,
      },
      select: {
        id: true, receivedAt: true, amount: true, paymentMethod: true,
        order: { select: { user: { select: { name: true } } } },
      },
      orderBy: { receivedAt: "asc" },
    }),
    prisma.cashInjection.findMany({
      where: { date: { gte: startDate, lte: endDate }, NOT: { description: { startsWith: MARKER } } },
      select: { id: true, date: true, amount: true, description: true },
      orderBy: { date: "asc" },
    }),
  ]);

  type Mov = { id: string; date: Date; description: string; tipo: "entrada" | "saida"; categoria: string; valor: number };

  const movs: Mov[] = [
    ...payments.map(p => ({
      id: "payment-" + p.id,
      date: p.receivedAt,
      description: `Venda — ${p.order?.user?.name || "cliente"}`,
      tipo: "entrada" as const,
      categoria: "venda",
      valor: p.amount,
    })),
    ...aportes.map(a => ({
      id: "aporte-" + a.id,
      date: a.date,
      description: a.description || (a.amount >= 0 ? "Aporte de capital" : "Retirada de capital"),
      tipo: (a.amount >= 0 ? "entrada" : "saida") as "entrada" | "saida",
      categoria: "aporte",
      valor: Math.abs(a.amount),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let saldo = saldoAnterior;
  const extrato = movs.map(m => {
    if (m.tipo === "entrada") saldo += m.valor;
    else saldo -= m.valor;
    return { ...m, date: m.date.toISOString(), saldo };
  });

  const totalEntradas = movs.filter(m => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0);
  const totalSaidas = movs.filter(m => m.tipo === "saida").reduce((s, m) => s + m.valor, 0);

  return NextResponse.json({
    saldoAnterior,
    saldoFinal: saldo,
    totalEntradas,
    totalSaidas,
    extrato,
    abertura: aberturaEntry ? { amount: aberturaEntry.amount, date: aberturaEntry.date.toISOString().split("T")[0] } : null,
  });
}
