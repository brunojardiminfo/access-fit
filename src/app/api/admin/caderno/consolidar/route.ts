export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redividirSaldo } from "@/lib/parcelas";

/**
 * Reparcela a dívida inteira de uma cliente do caderno, de uma vez.
 *
 * Quem tem sete pedidos no caderno não quer entrar em sete telas para combinar
 * "vamos fazer em 3×". O combinado é com a pessoa, não com o pedido.
 *
 * Cada pedido é redividido no mesmo número de vezes e nos mesmos vencimentos,
 * com valor proporcional ao que ele ainda deve. Somando tudo, cada mês fecha em
 * dívida ÷ vezes — que é o número que você falou para ela.
 *
 * Os pedidos continuam separados de propósito: é neles que estão as peças, o
 * custo e a margem. Juntar a dívida numa nota só perderia isso.
 *
 * Parcelas já pagas ficam onde estão, em qualquer pedido.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { clientId, parcelas, primeiroVencimento } = await req.json();
  if (!clientId) return NextResponse.json({ error: "Cliente obrigatório" }, { status: 400 });

  const vezes = parseInt(String(parcelas), 10) || 1;
  if (vezes < 1 || vezes > 24)
    return NextResponse.json({ error: "Número de parcelas inválido" }, { status: 400 });

  const primeiro = new Date(primeiroVencimento || new Date().toISOString().slice(0, 10));
  if (Number.isNaN(primeiro.getTime()))
    return NextResponse.json({ error: "Data de vencimento inválida" }, { status: 400 });

  const pedidos = await prisma.order.findMany({
    where: {
      userId: clientId,
      paymentMethod: "caderno",
      paymentStatus: { not: "paid" },
      status: { not: "cancelled" },
    },
    select: { id: true, total: true, amountPaid: true },
    orderBy: { createdAt: "asc" },
  });

  if (!pedidos.length)
    return NextResponse.json({ error: "Nenhum pedido em aberto no caderno" }, { status: 404 });

  const resultados = await Promise.all(
    pedidos.map(p => redividirSaldo({ orderId: p.id, vezes, primeiroVencimento: primeiro })),
  );

  const feitos = resultados.filter(r => r.ok);
  const divida = feitos.reduce((s, r) => s + r.saldo, 0);

  // Um pedido pode ficar de fora sem ser erro: saldo zerado por um pagamento
  // que entrou no meio do caminho.
  return NextResponse.json({
    ok: true,
    pedidos: feitos.length,
    ignorados: resultados.length - feitos.length,
    divida: Math.round(divida * 100) / 100,
    vezes,
    porMes: Math.round((divida / vezes) * 100) / 100,
  });
}
