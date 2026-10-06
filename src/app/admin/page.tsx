import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import DashboardKPIs from "./DashboardKPIs";
import ProjecaoCaixa from "./ProjecaoCaixa";

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") redirect("/");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const [
    tryOnOrders, todayShipments,
    cadernoAtrasado,
    revenueThisMonth, revenueLastMonth, revenue,
    totalExpenses, expensesThisMonth,
    lowStock, zeroStock,
    orderCount, ordersThisMonth,
    recentOrders,
    stockData,
  ] = await Promise.all([
    // Home Try-On em aberto (para calcular vencidos)
    prisma.order.findMany({
      where: { status: "try-on" },
      include: { user: true, items: { include: { product: { select: { name: true } } } } },
      orderBy: { dueDate: "asc" },
    }),
    // Envios do dia (try-on criados hoje)
    prisma.order.findMany({
      where: { status: "try-on", createdAt: { gte: todayStart, lte: todayEnd } },
      include: { user: true },
    }),
    // Caderno atrasado — todos com saldo em aberto e vencimento passado
    prisma.order.findMany({
      where: {
        paymentStatus: { not: "paid" },
        status: { not: "cancelled" },
        dueDate: { lt: now },
      },
      include: { user: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: "cancelled" }, createdAt: { gte: startOfMonth } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: "cancelled" }, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: "cancelled" } } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfMonth } } }),
    prisma.product.count({ where: { active: true, stock: { gt: 0, lte: 5 } } }),
    prisma.product.count({ where: { active: true, stock: 0 } }),
    prisma.order.count({ where: { status: { not: "cancelled" } } }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth }, status: { not: "cancelled" } } }),
    prisma.order.findMany({
      take: 5, orderBy: { createdAt: "desc" },
      where: { status: { not: "try-on" } },
      include: { user: true, items: true },
    }),
    prisma.product.findMany({ where: { active: true }, select: { price: true, costPrice: true, stock: true } }),
  ]);

  const receitaMes = revenueThisMonth._sum.total || 0;
  const receitaMesPassado = revenueLastMonth._sum.total || 0;
  const variacaoReceita = receitaMesPassado > 0 ? ((receitaMes - receitaMesPassado) / receitaMesPassado) * 100 : 0;
  const totalGastos = totalExpenses._sum.amount || 0;
  const gastosMes = expensesThisMonth._sum.amount || 0;
  const lucroLiquido = receitaMes - gastosMes;
  const valorVenda = stockData.reduce((a, p) => a + p.price * p.stock, 0);

  // Home Try-On vencidos (dueDate < now ou sem dueDate e criado há +2 dias)
  const tryOnVencidos = tryOnOrders.filter(o => {
    if (o.dueDate) return new Date(o.dueDate) < now;
    const criado = new Date(o.createdAt);
    return (now.getTime() - criado.getTime()) > 2 * 24 * 60 * 60 * 1000;
  });
  const tryOnNoPrazo = tryOnOrders.filter(o => !tryOnVencidos.find(v => v.id === o.id));

  const cadernoSaldo = cadernoAtrasado.reduce((s, o) => s + (o.total - o.amountPaid), 0);

  const statusColors: Record<string, { bg: string; color: string }> = {
    "try-on":  { bg: "#fce8ff", color: "#8a1ab8" },
    pending:   { bg: "#fff8e1", color: "#b8891a" },
    confirmed: { bg: "#e8f4fd", color: "#1a6a9a" },
    delivered: { bg: "#e8f8e8", color: "#1a8a2a" },
    cancelled: { bg: "#fee8e8", color: "#c04040" },
  };
  const statusLabel: Record<string, string> = {
    "try-on": "Home Try-On", pending: "Aguardando",
    confirmed: "Confirmado", delivered: "Entregue", cancelled: "Cancelado",
  };

  const adminName = (session.user as any)?.name?.split(" ")[0] || "Admin";
  const totalAlertas = tryOnVencidos.length + cadernoAtrasado.length + zeroStock;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1.25rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>

      {/* Saudação */}
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <p style={{ color: "#9a8060", fontSize: "0.8rem" }}>Olá, {adminName} 👋</p>
          <h1 style={{ color: "#1a1510", fontSize: "1.5rem", fontWeight: 900, lineHeight: 1.1 }}>
            {totalAlertas > 0 ? `${totalAlertas} item${totalAlertas > 1 ? "s" : ""} precisam de atenção` : "Tudo em ordem hoje ✓"}
          </h1>
        </div>
        <a href="/admin/pedidos/novo" style={{ backgroundColor: "#b8891a", color: "#fff", padding: "0.6rem 1.25rem", borderRadius: "0.75rem", fontWeight: 800, fontSize: "0.875rem", textDecoration: "none" }}>
          + Novo Pedido
        </a>
      </div>

      {/* ===== ALERTAS ===== */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>

        {/* Home Try-On vencidos */}
        {tryOnVencidos.length > 0 && (
          <div style={{ backgroundColor: "#fff", border: "2px solid rgba(138,26,184,0.3)", borderRadius: "1rem", overflow: "hidden" }}>
            <div style={{ backgroundColor: "#fce8ff", padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1rem" }}>⏰</span>
              <span style={{ fontWeight: 800, color: "#5a0a7a", fontSize: "0.9rem" }}>Home Try-On vencido{tryOnVencidos.length > 1 ? "s" : ""} — aguardando retorno</span>
              <span style={{ marginLeft: "auto", backgroundColor: "#8a1ab8", color: "#fff", fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 999 }}>{tryOnVencidos.length}</span>
            </div>
            <div style={{ padding: "0.5rem 0" }}>
              {tryOnVencidos.map(o => {
                const diasVencido = o.dueDate
                  ? Math.floor((now.getTime() - new Date(o.dueDate).getTime()) / (1000 * 60 * 60 * 24))
                  : Math.floor((now.getTime() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24)) - 2;
                return (
                  <Link key={o.id} href="/admin/pedidos" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.625rem 1.25rem", textDecoration: "none", borderBottom: "1px solid rgba(140,100,20,0.06)" }}>
                    <div>
                      <span style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.875rem" }}>{o.user.name}</span>
                      <span style={{ fontSize: "0.75rem", color: "#9a8060", marginLeft: "0.5rem" }}>
                        {o.items.map(i => i.product.name).join(", ")}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#c04040", whiteSpace: "nowrap" }}>
                      {diasVencido === 0 ? "Vence hoje" : `${diasVencido}d atrasado`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Caderno atrasado */}
        {cadernoAtrasado.length > 0 && (
          <div style={{ backgroundColor: "#fff", border: "2px solid rgba(184,137,26,0.35)", borderRadius: "1rem", overflow: "hidden" }}>
            <div style={{ backgroundColor: "#fff8e1", padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1rem" }}>📒</span>
              <span style={{ fontWeight: 800, color: "#856404", fontSize: "0.9rem" }}>Caderno em atraso</span>
              <span style={{ marginLeft: "auto", backgroundColor: "#b8891a", color: "#fff", fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 999 }}>{cadernoAtrasado.length}</span>
            </div>
            <div style={{ padding: "0.5rem 0" }}>
              {cadernoAtrasado.slice(0, 5).map(o => {
                const saldo = o.total - o.amountPaid;
                const diasAtraso = Math.floor((now.getTime() - new Date(o.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <Link key={o.id} href={`/admin/pedidos?expand=${o.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.625rem 1.25rem", textDecoration: "none", borderBottom: "1px solid rgba(140,100,20,0.06)" }}>
                    <div>
                      <span style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.875rem" }}>{o.user.name}</span>
                      <span style={{ fontSize: "0.72rem", color: "#c04040", marginLeft: "0.5rem" }}>
                        venc. {new Date(o.dueDate!).toLocaleDateString("pt-BR")} · {diasAtraso}d de atraso
                      </span>
                    </div>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#856404" }}>{formatCurrency(saldo)}</span>
                  </Link>
                );
              })}
              {cadernoAtrasado.length > 5 && (
                <Link href="/admin/caderno" style={{ display: "block", textAlign: "center", padding: "0.5rem", fontSize: "0.8rem", color: "#b8891a", fontWeight: 700, textDecoration: "none" }}>
                  Ver todos ({cadernoAtrasado.length}) →
                </Link>
              )}
            </div>
            {cadernoAtrasado.length > 0 && (
              <div style={{ padding: "0.5rem 1.25rem", backgroundColor: "#FAF6EE", display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "#9a8060" }}>Total em atraso</span>
                <span style={{ fontWeight: 900, color: "#856404" }}>{formatCurrency(cadernoSaldo)}</span>
              </div>
            )}
          </div>
        )}

        {/* Estoque zerado */}
        {zeroStock > 0 && (
          <Link href="/admin/produtos" style={{ textDecoration: "none" }}>
            <div style={{ backgroundColor: "#fff", border: "2px solid rgba(192,64,64,0.25)", borderRadius: "1rem", padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.25rem" }}>🚫</span>
              <span style={{ fontWeight: 700, color: "#c04040", fontSize: "0.875rem" }}>{zeroStock} produto{zeroStock > 1 ? "s" : ""} sem estoque</span>
              {lowStock > 0 && <span style={{ fontSize: "0.8rem", color: "#b8891a", marginLeft: "0.25rem" }}>· {lowStock} com estoque baixo</span>}
              <span style={{ marginLeft: "auto", color: "#b8a080", fontSize: "0.8rem" }}>Ver produtos →</span>
            </div>
          </Link>
        )}

        {/* SALE Manager */}
        <Link href="/admin/sale" style={{ textDecoration: "none" }}>
          <div style={{ backgroundColor: "#fff", border: "2px solid rgba(231,76,60,0.25)", borderRadius: "1rem", padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🔥</span>
            <span style={{ fontWeight: 700, color: "#e74c3c", fontSize: "0.875rem" }}>Gerenciar SALE e descontos de peças antigas</span>
            <span style={{ marginLeft: "auto", color: "#b8a080", fontSize: "0.8rem" }}>Ver SALE →</span>
          </div>
        </Link>

        {/* Coleções */}
        <Link href="/admin/colecoes" style={{ textDecoration: "none" }}>
          <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.15)", borderRadius: "1rem", padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.25rem" }}>✨</span>
            <span style={{ fontWeight: 700, color: "#5a4a2a", fontSize: "0.875rem" }}>Coleções e papel das peças</span>
            <span style={{ marginLeft: "auto", color: "#b8a080", fontSize: "0.8rem" }}>Ver coleções →</span>
          </div>
        </Link>

        {/* Categorias */}
        <Link href="/admin/categorias" style={{ textDecoration: "none" }}>
          <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.15)", borderRadius: "1rem", padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.25rem" }}>📂</span>
            <span style={{ fontWeight: 700, color: "#5a4a2a", fontSize: "0.875rem" }}>Gerenciar Categorias</span>
            <span style={{ marginLeft: "auto", color: "#b8a080", fontSize: "0.8rem" }}>Ver categorias →</span>
          </div>
        </Link>

        {/* Home Try-On no prazo */}
        {tryOnNoPrazo.length > 0 && (
          <div style={{ backgroundColor: "#fff", border: "1px solid rgba(138,26,184,0.15)", borderRadius: "1rem", overflow: "hidden" }}>
            <div style={{ backgroundColor: "#faf0ff", padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1rem" }}>👗</span>
              <span style={{ fontWeight: 700, color: "#6a10a0", fontSize: "0.875rem" }}>Home Try-On em andamento</span>
              <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#8a1ab8", fontWeight: 700 }}>{tryOnNoPrazo.length} peça{tryOnNoPrazo.length > 1 ? "s" : ""}</span>
            </div>
            <div style={{ padding: "0.5rem 0" }}>
              {tryOnNoPrazo.map(o => {
                const prazo = o.dueDate ? new Date(o.dueDate) : null;
                const diasRestantes = prazo ? Math.ceil((prazo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                return (
                  <Link key={o.id} href="/admin/pedidos" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.625rem 1.25rem", textDecoration: "none", borderBottom: "1px solid rgba(140,100,20,0.06)" }}>
                    <div>
                      <span style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.875rem" }}>{o.user.name}</span>
                      <span style={{ fontSize: "0.75rem", color: "#9a8060", marginLeft: "0.5rem" }}>
                        {o.items.map(i => i.product.name).join(", ")}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: diasRestantes === 0 ? "#c04040" : "#6a10a0", whiteSpace: "nowrap" }}>
                      {diasRestantes === null ? "—" : diasRestantes === 0 ? "Vence hoje" : `${diasRestantes}d restante${diasRestantes > 1 ? "s" : ""}`}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Tudo certo */}
        {totalAlertas === 0 && tryOnNoPrazo.length === 0 && (
          <div style={{ backgroundColor: "#e8f8e8", border: "1px solid rgba(26,138,42,0.2)", borderRadius: "1rem", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.25rem" }}>✅</span>
            <span style={{ fontWeight: 700, color: "#1a6a2a", fontSize: "0.875rem" }}>Nenhum alerta pendente. Bom dia!</span>
          </div>
        )}
      </div>

      {/* ===== KPIs MENORES ===== */}
      <DashboardKPIs kpis={[
        { emoji: "💰", label: "Receita este mês", value: formatCurrency(receitaMes), sub: `${variacaoReceita >= 0 ? "▲" : "▼"} ${Math.abs(variacaoReceita).toFixed(0)}% vs mês ant.`, subOk: variacaoReceita >= 0 },
        { emoji: "📈", label: "Lucro acumulado", value: formatCurrency(lucroLiquido), sub: `despesas: ${formatCurrency(gastosMes)}`, subOk: lucroLiquido >= 0, hideWhen: "profit" },
        { emoji: "📦", label: "Pedidos este mês", value: String(ordersThisMonth), sub: `${orderCount} total` },
        { emoji: "👗", label: "Em estoque", value: formatCurrency(valorVenda), sub: `${lowStock > 0 ? `${lowStock} com estoque baixo` : "tudo ok"}`, subOk: lowStock === 0 },
      ]} />

      {/* ===== PROJEÇÃO DE CAIXA ===== */}
      <ProjecaoCaixa />

      {/* ===== PEDIDOS RECENTES ===== */}
      <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)", borderRadius: "1rem", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.875rem 1.25rem", borderBottom: "1px solid rgba(140,100,20,0.08)", backgroundColor: "#FAF6EE" }}>
          <h2 style={{ color: "#1a1510", fontWeight: 800, fontSize: "0.9rem" }}>Vendas recentes</h2>
          <Link href="/admin/pedidos" style={{ color: "#b8891a", fontSize: "0.8rem", fontWeight: 700, textDecoration: "none" }}>Ver todos →</Link>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td style={{ textAlign: "center", padding: "2rem", color: "#b8a080" }}>Nenhuma venda ainda.</td></tr>
              ) : recentOrders.map(order => {
                const sc = statusColors[order.status] || { bg: "#f0f0f0", color: "#666" };
                return (
                  <tr key={order.id} style={{ borderBottom: "1px solid rgba(140,100,20,0.05)" }}>
                    <td style={{ padding: "0.75rem 1.25rem", fontWeight: 600, color: "#1a1510" }}>{order.user?.name || "—"}</td>
                    <td style={{ padding: "0.75rem 0.5rem", color: "#5a4a2a", fontSize: "0.8rem" }}>{order.items.reduce((s, i) => s + i.quantity, 0)} item(s)</td>
                    <td style={{ padding: "0.75rem 0.5rem", fontWeight: 700, color: "#1a1510", whiteSpace: "nowrap" }}>{formatCurrency(order.total)}</td>
                    <td style={{ padding: "0.75rem 0.5rem" }}>
                      <span style={{ backgroundColor: sc.bg, color: sc.color, fontSize: "0.68rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: 999 }}>
                        {statusLabel[order.status] || order.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1.25rem", color: "#9a8060", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
