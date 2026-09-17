export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MOVIMENTA_CAIXA } from "@/lib/credito";

// Receitas recebidas no período
export async function GET(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const startDate = from ? new Date(from + "T00:00:00") : new Date("2020-01-01");
  const endDate = to ? new Date(to + "T23:59:59") : new Date();

  // Pagamentos recebidos no período, de qualquer forma (Pix, cartão, dinheiro, caderno quitado)
  const pagamentos = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      receivedAt: { gte: startDate, lte: endDate },
      order: { status: { not: "cancelled" } }, ...MOVIMENTA_CAIXA,
    },
  });

  return NextResponse.json({ total: pagamentos._sum.amount || 0 });
}
