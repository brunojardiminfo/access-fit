import { prisma } from "@/lib/prisma";
import { inicioDoMes, fimDoMes, somarEntradas, quandoEntra } from "@/lib/financeiro";
import { MOVIMENTA_CAIXA } from "@/lib/credito";

/**
 * Os números de um mês, do jeito que ele precisa ler.
 *
 * Uma função só, usada pela tela do Financeiro E pela tela inicial — porque
 * dois lugares calculando "quanto vendi este mês" por conta própria divergem
 * no dia em que um deles mudar, e aí nenhum dos dois merece confiança.
 */
export type ResumoDoMes = {
  vendido: number;          // o que a loja vendeu no mês, caia quando cair
  pedidos: number;
  ticket: number;
  entrou: number;           // o que virou dinheiro na conta no mês
  porForma: { forma: string; rotulo: string; valor: number }[];
  saiu: number;             // despesas do mês
  aReceber: number;         // já vendido, ainda não caiu
  emAberto: number;         // pedidos sem pagamento integral
  atrasados: number;        // com vencimento passado e saldo em aberto
};

export async function resumoDoMes(ano: number, mes: number): Promise<ResumoDoMes> {
  const de = inicioDoMes(ano, mes);
  const ate = fimDoMes(ano, mes);
  const agora = new Date();

  const [vendas, entradas, despesas, aberto] = await Promise.all([
    prisma.order.findMany({
      where: { status: { not: "cancelled" }, createdAt: { gte: de, lt: ate } },
      select: { total: true },
    }),
    prisma.payment.findMany({
      where: {
        receivedAt: { gte: de, lt: ate },
        order: { status: { not: "cancelled" } },
      },
      select: { amount: true, paymentMethod: true },
    }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: de, lt: ate } } }),
    prisma.order.findMany({
      where: { status: { not: "cancelled" }, paymentStatus: { not: "paid" } },
      select: { total: true, amountPaid: true, dueDate: true },
    }),
  ]);

  const vendido = arredonda(vendas.reduce((s, o) => s + o.total, 0));
  const { total: entrou, porForma } = somarEntradas(entradas);

  /**
   * O que já foi vendido e ainda não caiu: pagamentos marcados para o futuro.
   * É o número que explica por que "vendi muito" e "entrou pouco" convivem.
   */
  const futuros = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { receivedAt: { gt: agora }, order: { status: { not: "cancelled" } }, ...MOVIMENTA_CAIXA },
  });

  const saldoAberto = aberto.map(o => Math.max(0, o.total - o.amountPaid));
  const atrasados = aberto.filter(o => o.dueDate && new Date(o.dueDate) < agora).length;

  return {
    vendido,
    pedidos: vendas.length,
    ticket: vendas.length ? arredonda(vendido / vendas.length) : 0,
    entrou,
    porForma,
    saiu: arredonda(despesas._sum.amount || 0),
    aReceber: arredonda(futuros._sum.amount || 0),
    emAberto: arredonda(saldoAberto.reduce((s, v) => s + v, 0)),
    atrasados,
  };
}

/** Os últimos N meses, para o gráfico. */
export async function ultimosMeses(n: number, ate: Date = new Date()) {
  const meses: { rotulo: string; ano: number; mes: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ate.getUTCFullYear(), ate.getUTCMonth() - i, 15));
    meses.push({
      rotulo: d.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", ""),
      ano: d.getUTCFullYear(), mes: d.getUTCMonth(),
    });
  }
  return Promise.all(meses.map(async m => ({ ...m, ...(await resumoDoMes(m.ano, m.mes)) })));
}

export { quandoEntra };

function arredonda(v: number) {
  return Math.round(v * 100) / 100;
}
