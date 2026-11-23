import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resumoDoMes } from "@/lib/resumoDoMes";
import { lerMes, nomeDoMes, ROTULO_FORMA } from "@/lib/financeiro";
import FinanceiroClient from "./FinanceiroClient";

export const dynamic = "force-dynamic";

/**
 * O financeiro do jeito que ele precisa ler.
 *
 * TRÊS ABAS, não cinco. A tela antiga tinha Caixa, Fluxo de Caixa, Vendas,
 * Lançamentos e Cartão — e ele chamou de varal, com razão. Aqui são Vendas,
 * Saídas e Cartão, com os números do mês acima delas, sempre visíveis.
 *
 * SALDO EM CAIXA NÃO EXISTE AQUI. Ele guarda o dinheiro da loja junto com o
 * pessoal; qualquer saldo que o sistema calculasse seria ficção. O painel
 * completo antigo continua acessível para quem quiser o detalhe.
 *
 * VENDIDO E ENTROU SÃO DOIS NÚMEROS, e os dois aparecem. A venda no link é
 * faturamento do mês da venda e dinheiro do mês seguinte; mostrar só um e
 * chamar de faturamento é o que faz o dono se enganar sobre o próprio mês.
 */
export default async function FinanceiroPage({
  searchParams,
}: { searchParams: Promise<{ mes?: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin") redirect("/");

  const { mes: pedido } = await searchParams;
  const agora = new Date();
  const { ano, mes } = pedido && /^\d{4}-\d{2}$/.test(pedido)
    ? lerMes(pedido)
    : { ano: agora.getUTCFullYear(), mes: agora.getUTCMonth() };

  const resumo = await resumoDoMes(ano, mes);

  const de = new Date(Date.UTC(ano, mes, 1, 3, 0, 0));
  const ate = new Date(Date.UTC(mes === 11 ? ano + 1 : ano, mes === 11 ? 0 : mes + 1, 1, 3, 0, 0));

  const [vendas, recebimentos, despesas] = await Promise.all([
    prisma.order.findMany({
      where: { status: { not: "cancelled" }, createdAt: { gte: de, lt: ate } },
      select: {
        id: true, total: true, createdAt: true, paymentMethod: true, paymentStatus: true,
        amountPaid: true, user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { receivedAt: { gte: de, lt: ate }, order: { status: { not: "cancelled" } } },
      select: {
        id: true, amount: true, receivedAt: true, paymentMethod: true,
        order: { select: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { receivedAt: "desc" },
    }),
    prisma.expense.findMany({
      where: { date: { gte: de, lt: ate } },
      select: {
        id: true, description: true, amount: true, date: true, category: true,
        paymentMethod: true, dueDate: true, installments: true, installmentNumber: true,
      },
      orderBy: { date: "desc" },
    }),
  ]);

  // Os meses que o seletor oferece: os doze últimos, que é o alcance de
  // qualquer pergunta que ele faz sobre o passado.
  const mesesDisponiveis = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - i, 15));
    return {
      valor: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      rotulo: nomeDoMes(d.getUTCFullYear(), d.getUTCMonth()),
    };
  });

  return (
    <FinanceiroClient
      mesAtual={`${ano}-${String(mes + 1).padStart(2, "0")}`}
      nomeMes={nomeDoMes(ano, mes)}
      meses={mesesDisponiveis}
      resumo={resumo}
      vendas={vendas.map(o => ({
        id: o.id,
        cliente: o.user?.name || o.user?.email || "sem nome",
        valor: o.total,
        data: o.createdAt.toISOString(),
        forma: ROTULO_FORMA[o.paymentMethod] || o.paymentMethod,
        pago: o.paymentStatus === "paid",
        emAberto: Math.max(0, Math.round((o.total - o.amountPaid) * 100) / 100),
      }))}
      recebimentos={recebimentos.map(p => ({
        id: p.id,
        cliente: p.order?.user?.name || p.order?.user?.email || "—",
        valor: p.amount,
        data: p.receivedAt.toISOString(),
        forma: ROTULO_FORMA[p.paymentMethod] || p.paymentMethod,
      }))}
      despesas={despesas.map(e => ({
        id: e.id, descricao: e.description, valor: e.amount,
        data: e.date.toISOString(), categoria: e.category,
        forma: e.paymentMethod,
        vencimento: e.dueDate ? e.dueDate.toISOString() : null,
        parcela: e.installments > 1 ? `${e.installmentNumber}/${e.installments}` : null,
      }))}
    />
  );
}
