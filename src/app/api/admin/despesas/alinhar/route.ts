export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Conserta as despesas que já estão no banco com a data errada.
 *
 * O DEFEITO. As parcelas e as cobranças recorrentes nasciam todas com a data
 * do lançamento, e só o vencimento mudava. Como os relatórios somam por
 * `date`, os doze meses de uma assinatura caíam no mesmo mês: R$ 113 viravam
 * R$ 1.356 em novembro e R$ 0 nos outros onze.
 *
 * Consertar só o cadastro novo deixaria o estrago no passado. Isto realinha o
 * que já está lá.
 *
 * SÓ MEXE EM LINHA COM VENCIMENTO, e só quando o MÊS do vencimento difere do
 * mês da data. Despesa à vista não tem vencimento e não é tocada; linha já
 * certa fica como está. Rodar duas vezes não muda nada na segunda.
 *
 * O VALOR NUNCA É ALTERADO — só o mês em que a linha aparece. Esta rota não
 * soma, não divide e não apaga nada.
 */
export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const candidatas = await desalinhadas();
  return NextResponse.json({
    quantas: candidatas.length,
    total: Math.round(candidatas.reduce((s, e) => s + e.amount, 0) * 100) / 100,
    exemplos: candidatas.slice(0, 6).map(e => ({
      descricao: e.description, valor: e.amount, de: e.date, para: e.dueDate,
    })),
  });
}

export async function POST() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const candidatas = await desalinhadas();
  for (const e of candidatas) {
    await prisma.expense.update({ where: { id: e.id }, data: { date: e.dueDate! } });
  }
  return NextResponse.json({ corrigidas: candidatas.length });
}

/** Linhas cujo mês de vencimento não bate com o mês em que elas aparecem. */
async function desalinhadas() {
  const comVencimento = await prisma.expense.findMany({
    where: { dueDate: { not: null } },
    select: { id: true, description: true, amount: true, date: true, dueDate: true },
    orderBy: { dueDate: "asc" },
  });
  const mes = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
  return comVencimento.filter(e => mes(e.date) !== mes(e.dueDate!));
}
