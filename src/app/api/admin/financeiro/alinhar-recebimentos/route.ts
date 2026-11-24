export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quandoEntra, temPrazo, PRAZO_DE_RECEBIMENTO } from "@/lib/financeiro";

const FORMAS_COM_PRAZO = Object.entries(PRAZO_DE_RECEBIMENTO)
  .filter(([, dias]) => dias > 0).map(([forma]) => forma);

/**
 * Move os recebimentos antigos para o mês em que o dinheiro realmente caiu.
 *
 * O cadastro novo já grava a data certa, mas o que está no banco foi gravado
 * com a data da venda — e é esse histórico que ele está olhando hoje.
 *
 * SÓ MEXE NO QUE NINGUÉM ENCOSTOU. A condição é estreita de propósito: forma
 * com prazo (link, cartão) E `receivedAt` exatamente igual ao `createdAt` do
 * pedido, que é a assinatura de um registro automático nunca ajustado. Um
 * recebimento que ele já corrigiu à mão tem outra data e não é tocado.
 *
 * Por isso rodar duas vezes não faz nada na segunda: depois do primeiro
 * ajuste a data deixa de bater com a da venda.
 *
 * O VALOR NUNCA MUDA — só o mês em que ele aparece.
 */
async function desalinhados() {
  const pagamentos = await prisma.payment.findMany({
    // só as formas que têm prazo, lidas da mesma tabela que o resto do
    // sistema usa — listar "link, cartao" à mão aqui deixaria os dois lugares
    // discordando no dia em que uma forma nova aparecesse
    where: { paymentMethod: { in: FORMAS_COM_PRAZO } },
    select: {
      id: true, amount: true, paymentMethod: true, receivedAt: true,
      order: { select: { createdAt: true, status: true, user: { select: { name: true, email: true } } } },
    },
  });

  return pagamentos.filter(p =>
    p.order &&
    p.order.status !== "cancelled" &&
    temPrazo(p.paymentMethod) &&
    Math.abs(p.receivedAt.getTime() - p.order.createdAt.getTime()) < 1000,
  );
}

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const lista = await desalinhados();
  return NextResponse.json({
    quantos: lista.length,
    total: Math.round(lista.reduce((s, p) => s + p.amount, 0) * 100) / 100,
    /**
     * Com nome e valor, não só a contagem.
     *
     * "3 recebimentos estão no mês errado" pede fé; "Isadora Lazzari, R$ 236,
     * de 23/11 para 24/12" deixa ele conferir antes de clicar — e é ele que
     * sabe se aquela venda foi no link ou não.
     */
    exemplos: lista.slice(0, 8).map(p => ({
      cliente: p.order!.user?.name || p.order!.user?.email || "sem nome",
      valor: p.amount, forma: p.paymentMethod,
      de: p.receivedAt, para: quandoEntra(p.paymentMethod, p.order!.createdAt),
    })),
  });
}

export async function POST() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const lista = await desalinhados();
  for (const p of lista) {
    await prisma.payment.update({
      where: { id: p.id },
      data: { receivedAt: quandoEntra(p.paymentMethod, p.order!.createdAt) },
    });
  }
  return NextResponse.json({ corrigidos: lista.length });
}
