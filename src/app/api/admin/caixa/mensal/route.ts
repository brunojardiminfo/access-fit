export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MOVIMENTA_CAIXA } from "@/lib/credito";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const meses: { [key: string]: { receitas: number; despesas: number } } = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mesKey = d.toISOString().slice(0, 7);

      const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
      const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const [pagamentos, despesas] = await Promise.all([
        // Pagamentos recebidos no mês, de qualquer forma
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            receivedAt: { gte: inicio, lte: fim },
            order: { status: { not: "cancelled" } }, ...MOVIMENTA_CAIXA,
          },
        }),
        // Despesas do mês
        prisma.expense.aggregate({
          _sum: { amount: true },
          where: { date: { gte: inicio, lte: fim } },
        }),
      ]);

      meses[mesKey] = {
        receitas: pagamentos._sum.amount || 0,
        despesas: despesas._sum.amount || 0,
      };
    }

    return NextResponse.json({ meses });
  } catch (err) {
    console.error("Erro ao calcular dados mensais:", err);
    return NextResponse.json({ error: "Erro ao calcular" }, { status: 500 });
  }
}
