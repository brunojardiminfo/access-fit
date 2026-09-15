export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { receberNasParcelas } from "@/lib/parcelas";

/**
 * Recebe um valor da cliente e distribui entre os pedidos dela no caderno, do
 * mais antigo para o mais novo.
 *
 * Quando o pedido tem parcelas, o dinheiro entra PELAS parcelas — que são a
 * verdade do saldo. Escrever o `amountPaid` direto, como era antes, funcionava
 * até alguém mexer numa parcela na aba Pedidos: o valor era recalculado a partir
 * das parcelas e o pagamento sumia sem aviso.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { clientId, valor, metodo } = await req.json();
  if (!clientId || !valor || valor <= 0)
    return NextResponse.json({ error: "Cliente e valor são obrigatórios" }, { status: 400 });

  const paymentMethod = metodo || "pix";

  const pedidos = await prisma.order.findMany({
    where: {
      userId: clientId,
      paymentMethod: "caderno",
      paymentStatus: { not: "paid" },
      status: { not: "cancelled" },
    },
    select: { id: true, total: true, amountPaid: true, _count: { select: { installments: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (!pedidos.length)
    return NextResponse.json({ error: "Nenhum pedido em aberto" }, { status: 404 });

  let restante = Math.round(valor * 100) / 100;
  const atualizados: string[] = [];

  for (const p of pedidos) {
    if (restante < 0.01) break;
    const saldo = Math.round((p.total - p.amountPaid) * 100) / 100;
    if (saldo < 0.01) continue;

    const pagar = Math.min(restante, saldo);

    if (p._count.installments > 0) {
      const r = await receberNasParcelas(p.id, pagar, paymentMethod);
      if ("erro" in r) continue;
    } else {
      const novoPago = Math.round((p.amountPaid + pagar) * 100) / 100;
      await prisma.order.update({
        where: { id: p.id },
        data: {
          amountPaid: novoPago,
          paymentStatus: novoPago >= p.total - 0.01 ? "paid" : "partial",
        },
      });
      await prisma.payment.create({
        data: { orderId: p.id, amount: pagar, paymentMethod, notes: "Quitação de caderno" },
      });
    }

    atualizados.push(p.id);
    restante = Math.round((restante - pagar) * 100) / 100;
  }

  const emAberto = await prisma.order.aggregate({
    where: {
      userId: clientId, paymentMethod: "caderno",
      paymentStatus: { not: "paid" }, status: { not: "cancelled" },
    },
    _sum: { total: true, amountPaid: true },
  });

  return NextResponse.json({
    ok: true,
    atualizados: atualizados.length,
    valorAplicado: Math.round((valor - restante) * 100) / 100,
    // Sobra quando o valor recebido passa do que ela devia.
    troco: restante,
    saldoRestante: Math.max(0, Math.round(((emAberto._sum.total || 0) - (emAberto._sum.amountPaid || 0)) * 100) / 100),
  });
}
