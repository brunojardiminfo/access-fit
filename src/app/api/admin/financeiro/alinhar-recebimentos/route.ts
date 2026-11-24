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
 * COMO ELE RECONHECE O ERRADO. Forma com prazo (link, cartão) e `receivedAt`
 * no mesmo dia da venda. Com o prazo aplicado a data estaria 31 dias à frente,
 * então um recebimento de link datado no dia da venda só pode ser um registro
 * que não passou pelo prazo — não existe link que caia no mesmo dia.
 *
 * A PRIMEIRA VERSÃO EXIGIA IGUALDADE AO MILISSEGUNDO com o `createdAt` do
 * pedido, e com isso só pegava os pagamentos gravados junto com a venda. A
 * venda da Isadora foi marcada como paga editando o pedido, minutos depois —
 * `receivedAt` virou a hora da edição, não bateu ao milissegundo, e ela ficou
 * de fora da correção enquanto continuava somada em novembro.
 *
 * Um recebimento que ele já ajustou à mão tem data longe do dia da venda e
 * segue intocado. Rodar duas vezes não faz nada na segunda: depois do ajuste
 * a data está 31 dias adiante.
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

  const DIA = 86400000;
  return pagamentos.filter(p => {
    if (!p.order || p.order.status === "cancelled" || !temPrazo(p.paymentMethod)) return false;
    const certo = quandoEntra(p.paymentMethod, p.order.createdAt);
    // já está no lugar certo (ou perto dele): não encosta
    if (Math.abs(p.receivedAt.getTime() - certo.getTime()) < DIA) return false;
    // errado é estar colado na data da venda, de qualquer lado dela
    return p.receivedAt.getTime() - p.order.createdAt.getTime() < DIA
        && p.receivedAt.getTime() - p.order.createdAt.getTime() > -DIA;
  });
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
