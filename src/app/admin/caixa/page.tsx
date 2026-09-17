import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MOVIMENTA_CAIXA } from "@/lib/credito";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

export const dynamic = 'force-dynamic';

export default async function CaixaPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") redirect("/");

  const now = new Date();
  const start30 = new Date(now); start30.setDate(now.getDate() - 29); start30.setHours(0,0,0,0);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextM1 = new Date(now.getFullYear(), now.getMonth() + 1, 10);
  const nextM2 = new Date(now.getFullYear(), now.getMonth() + 2, 10);
  const nextM3 = new Date(now.getFullYear(), now.getMonth() + 3, 10);

  const [payments30, expenses30, paymentsMonth, expensesMonth,
    allPaymentsReceived, allExpenses, cadernoAberto, cartaoFuturo] = await Promise.all([
    prisma.payment.findMany({
      where: { order: { status: { not: "cancelled" } }, ...MOVIMENTA_CAIXA, receivedAt: { gte: start30 } },
      select: { amount: true, receivedAt: true },
      orderBy: { receivedAt: "asc" },
    }),
    prisma.expense.findMany({
      where: { date: { gte: start30 } },
      select: { amount: true, date: true },
      orderBy: { date: "asc" },
    }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { order: { status: { not: "cancelled" } }, ...MOVIMENTA_CAIXA, receivedAt: { gte: startMonth } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: startMonth } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { order: { status: { not: "cancelled" } }, ...MOVIMENTA_CAIXA } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.order.findMany({
      where: { paymentStatus: { not: "paid" }, status: { not: "cancelled" } },
      select: { total: true, amountPaid: true, dueDate: true, user: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.expense.findMany({
      where: { paymentMethod: "cartao_credito", dueDate: { gte: now, lte: nextM3 } },
      select: { amount: true, dueDate: true, installments: true },
    }),
  ]);

  const receitaTotal = allPaymentsReceived._sum.amount || 0;
  const despesaTotal = allExpenses._sum.amount || 0;
  const saldoAtual = receitaTotal - despesaTotal;
  const receitaMes = paymentsMonth._sum.amount || 0;
  const despesaMes = expensesMonth._sum.amount || 0;
  const lucroMes = receitaMes - despesaMes;
  const aReceber = cadernoAberto.reduce((s, o) => s + (o.total - o.amountPaid), 0);
  const vencidos = cadernoAberto.filter(o => o.dueDate && new Date(o.dueDate) < now);
  const totalVencido = vencidos.reduce((s, o) => s + (o.total - o.amountPaid), 0);

  const cartaoMes = (ref: Date) => cartaoFuturo
    .filter(e => e.dueDate && new Date(e.dueDate).getMonth() === ref.getMonth() && new Date(e.dueDate).getFullYear() === ref.getFullYear())
    .reduce((s, e) => s + e.amount / (e.installments || 1), 0);

  // Fluxo diário (30 dias)
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(start30); d.setDate(d.getDate() + i);
    const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const entrada = payments30.filter(p => new Date(p.receivedAt).toDateString() === d.toDateString()).reduce((s, p) => s + p.amount, 0);
    const saida = expenses30.filter(e => new Date(e.date).toDateString() === d.toDateString()).reduce((s, e) => s + e.amount, 0);
    return { label, entrada, saida, saldo: entrada - saida };
  });

  const maxVal = Math.max(...days.map(d => Math.max(d.entrada, d.saida)), 1);
  const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.25rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#1a1510" }}>💵 Caixa</h1>
        <p style={{ color: "#9a8060", fontSize: "0.875rem", marginTop: "0.2rem" }}>Fluxo de caixa e projeções</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { emoji: "💰", label: "Saldo Atual", value: formatCurrency(saldoAtual), color: saldoAtual >= 0 ? "#1a8a2a" : "#c04040", bg: saldoAtual >= 0 ? "#e8f8e8" : "#fee8e8", sub: "receitas − despesas acumuladas" },
          { emoji: "📈", label: "Receita este mês", value: formatCurrency(receitaMes), color: "#b8891a", bg: "#fff", sub: `${formatCurrency(receitaTotal)} total acumulado` },
          { emoji: "📉", label: "Despesas este mês", value: formatCurrency(despesaMes), color: "#c04040", bg: "#fff", sub: `${formatCurrency(despesaTotal)} total acumulado` },
          { emoji: "✨", label: "Lucro este mês", value: formatCurrency(lucroMes), color: lucroMes >= 0 ? "#1a8a2a" : "#c04040", bg: "#fff", sub: lucroMes >= 0 ? "positivo 🎉" : "atenção ⚠️" },
        ].map(k => (
          <div key={k.label} style={{ backgroundColor: k.bg, border: "1px solid rgba(140,100,20,0.1)", borderRadius: "1rem", padding: "1.25rem" }}>
            <div style={{ fontSize: "1.2rem", marginBottom: "0.3rem" }}>{k.emoji}</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9a8060", marginTop: "0.2rem" }}>{k.label}</div>
            <div style={{ fontSize: "0.65rem", color: "#b8a080", marginTop: "0.1rem" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
        {/* A receber */}
        <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)", borderRadius: "1rem", padding: "1.25rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1a1510", marginBottom: "1rem" }}>📥 A Receber</h2>
          <div style={{ backgroundColor: "#e8f8e8", borderRadius: "0.75rem", padding: "0.875rem", marginBottom: "0.75rem" }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1a6a2a" }}>TOTAL EM ABERTO</p>
            <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "#1a8a2a" }}>{formatCurrency(aReceber)}</p>
            {totalVencido > 0 && <p style={{ fontSize: "0.72rem", color: "#c04040", marginTop: "0.2rem" }}>⚠️ {formatCurrency(totalVencido)} em atraso</p>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: 200, overflowY: "auto" }}>
            {cadernoAberto.slice(0, 8).map((o, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", padding: "0.3rem 0", borderBottom: "1px solid rgba(140,100,20,0.05)" }}>
                <span style={{ color: "#5a4a2a" }}>{o.user.name}</span>
                <span style={{ fontWeight: 700, color: o.dueDate && new Date(o.dueDate) < now ? "#c04040" : "#1a8a2a" }}>{formatCurrency(o.total - o.amountPaid)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* A pagar */}
        <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)", borderRadius: "1rem", padding: "1.25rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1a1510", marginBottom: "1rem" }}>📤 A Pagar (Cartão)</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              { label: `${MESES[now.getMonth()]} (atual)`, valor: cartaoMes(now) },
              { label: `${MESES[nextM1.getMonth()]} (próximo)`, valor: cartaoMes(nextM1) },
              { label: `${MESES[nextM2.getMonth()]}`, valor: cartaoMes(nextM2) },
            ].map(m => (
              <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.625rem 0.875rem", backgroundColor: "#FAF6EE", borderRadius: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", color: "#5a4a2a" }}>{m.label}</span>
                <span style={{ fontWeight: 700, color: m.valor > 0 ? "#6a30b8" : "#b8a080" }}>{m.valor > 0 ? `-${formatCurrency(m.valor)}` : "—"}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid rgba(140,100,20,0.1)", paddingTop: "0.75rem", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#5a4a2a" }}>Saldo projetado</span>
              <span style={{ fontWeight: 900, color: aReceber - cartaoMes(nextM1) >= 0 ? "#1a8a2a" : "#c04040" }}>
                {formatCurrency(aReceber - cartaoMes(nextM1))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico fluxo 30 dias */}
      <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)", borderRadius: "1rem", padding: "1.5rem" }}>
        <h2 style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1a1510", marginBottom: "1.5rem" }}>📊 Fluxo dos últimos 30 dias</h2>
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", gap: "3px", alignItems: "flex-end", height: 120, minWidth: 600 }}>
            {days.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", minWidth: 16 }}>
                <div style={{ width: "100%", display: "flex", gap: "1px", alignItems: "flex-end", height: 100 }}>
                  <div style={{ flex: 1, height: Math.max(d.entrada / maxVal * 90, d.entrada > 0 ? 3 : 0), backgroundColor: "#b8891a", borderRadius: "2px 2px 0 0" }} title={`Entrada: ${formatCurrency(d.entrada)}`} />
                  <div style={{ flex: 1, height: Math.max(d.saida / maxVal * 90, d.saida > 0 ? 3 : 0), backgroundColor: "#fee8e8", borderRadius: "2px 2px 0 0" }} title={`Saída: ${formatCurrency(d.saida)}`} />
                </div>
                {i % 5 === 0 && <span style={{ fontSize: "0.55rem", color: "#b8a080", whiteSpace: "nowrap" }}>{d.label}</span>}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(140,100,20,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#9a8060" }}>
            <div style={{ width: 10, height: 10, backgroundColor: "#b8891a", borderRadius: 2 }} /> Entradas
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#9a8060" }}>
            <div style={{ width: 10, height: 10, backgroundColor: "#fee8e8", border: "1px solid #c04040", borderRadius: 2 }} /> Saídas
          </div>
        </div>
      </div>
    </div>
  );
}
