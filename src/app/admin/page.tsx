import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { parseJson } from "@/lib/utils";
import { resumoDoMes, ultimosMeses } from "@/lib/resumoDoMes";
import PainelInicial, { DadosDoPainel } from "./PainelInicial";

export const dynamic = "force-dynamic";

/**
 * A tela inicial do admin: o que ele precisa ver na primeira hora do dia.
 *
 * O QUE SAIU, E POR QUÊ. A tela antiga abria com Home Try-On, envios do dia,
 * caderno atrasado, lucro acumulado, projeção de caixa e mais seis cartões.
 * Tudo isso existe e continua existindo nas telas próprias — mas numa tela de
 * abertura, informação que não muda o que ele vai fazer agora é ruído, e
 * ruído faz a pessoa parar de olhar.
 *
 * A ORDEM É A DA DECISÃO: primeiro o que exige ação hoje (pedido atrasado,
 * peça esgotada na vitrine), depois os números do mês, depois a tendência,
 * depois o estoque.
 *
 * VENDIDO E ENTROU APARECEM OS DOIS. Vender R$ 10 mil e receber R$ 6 mil são
 * as duas coisas verdadeiras ao mesmo tempo quando se vende no link, que cai
 * 31 dias depois. Mostrar só um e chamar de "faturamento" é o que faz o dono
 * se enganar sobre o próprio mês.
 *
 * SALDO EM CAIXA NÃO APARECE: o dinheiro da loja mora junto com o pessoal,
 * então qualquer saldo que o sistema calculasse seria ficção.
 */
export default async function AdminPage() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin") redirect("/");

  const agora = new Date();
  const ano = agora.getUTCFullYear(), mes = agora.getUTCMonth();
  const inicioDoDia = new Date(agora); inicioDoDia.setUTCHours(3, 0, 0, 0);

  const [esteMes, passado, grafico, vendasHoje, emAtraso, pecas] = await Promise.all([
    resumoDoMes(ano, mes),
    resumoDoMes(mes === 0 ? ano - 1 : ano, mes === 0 ? 11 : mes - 1),
    ultimosMeses(6, agora),
    prisma.order.findMany({
      where: { status: { not: "cancelled" }, createdAt: { gte: inicioDoDia } },
      select: { total: true },
    }),
    prisma.order.findMany({
      where: {
        status: { not: "cancelled" }, paymentStatus: { not: "paid" },
        dueDate: { lt: agora },
      },
      select: { id: true, total: true, amountPaid: true, dueDate: true, user: { select: { name: true, email: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, name: true, stock: true, price: true, images: true },
    }),
  ]);

  const DIA = 86400000;
  const dados: DadosDoPainel = {
    hoje: {
      vendido: arredonda(vendasHoje.reduce((s, o) => s + o.total, 0)),
      pedidos: vendasHoje.length,
    },
    mes: {
      vendido: esteMes.vendido, pedidos: esteMes.pedidos, ticket: esteMes.ticket,
      entrou: esteMes.entrou, saiu: esteMes.saiu, aReceber: esteMes.aReceber,
      porForma: esteMes.porForma, naoEntrou: esteMes.naoEntrou,
    },
    mesPassado: { vendido: passado.vendido },
    grafico: grafico.map(m => ({ rotulo: m.rotulo, vendido: m.vendido, entrou: m.entrou, saiu: m.saiu })),
    atrasados: emAtraso.map(o => ({
      id: o.id,
      cliente: o.user?.name || o.user?.email || "sem nome",
      valor: arredonda(Math.max(0, o.total - o.amountPaid)),
      dias: o.dueDate ? Math.max(1, Math.floor((agora.getTime() - new Date(o.dueDate).getTime()) / DIA)) : 1,
    })),
    semEstoque: pecas.filter(p => p.stock === 0).length,
    /**
     * "Acabando" é 1 ou 2 unidades, não 5.
     *
     * Com 5 a lista enche de peça que ainda tem semanas de folga, e a que vai
     * acabar amanhã se perde no meio — que é o oposto do que a lista serve.
     */
    estoqueBaixo: pecas.filter(p => p.stock > 0 && p.stock <= 2)
      .sort((a, b) => a.stock - b.stock)
      .map(p => ({ id: p.id, nome: p.name.trim(), estoque: p.stock })),
    semFoto: pecas.filter(p => parseJson<string[]>(p.images, []).filter(u => (u || "").trim()).length === 0).length,
    valorEmEstoque: arredonda(pecas.reduce((s, p) => s + p.price * Math.max(0, p.stock), 0)),
  };

  const primeiroNome = (session.user as { name?: string })?.name?.split(" ")[0] || "";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.75rem 1.1rem 6rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ color: "#1a1510", fontSize: "1.6rem", fontWeight: 900, margin: 0 }}>
          Olá{primeiroNome ? `, ${primeiroNome}` : ""} 👋
        </h1>
        <p style={{ color: "#9a8060", fontSize: "0.86rem", marginTop: "0.2rem" }}>
          {dados.hoje.pedidos > 0
            ? `Hoje já são ${dados.hoje.pedidos} pedido${dados.hoje.pedidos === 1 ? "" : "s"} · ${dados.hoje.vendido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
            : "Nenhuma venda registrada hoje ainda."}
        </p>
      </div>
      <PainelInicial d={dados} />
    </div>
  );
}

function arredonda(v: number) {
  return Math.round(v * 100) / 100;
}
