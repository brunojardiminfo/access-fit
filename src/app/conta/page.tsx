import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import BirthdayCoupon from "@/app/components/BirthdayCoupon";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando", confirmed: "Confirmado", shipped: "Enviado",
  delivered: "Entregue", cancelled: "Cancelado", "try-on": "Home Try-On",
};
const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "rgba(216,166,44,0.16)",  color: "var(--gold-light)" },
  confirmed: { bg: "rgba(126,196,240,0.16)", color: "#7ec4f0" },
  shipped:   { bg: "rgba(183,140,255,0.16)", color: "#b78cff" },
  delivered: { bg: "rgba(95,211,122,0.16)",  color: "#5fd37a" },
  cancelled: { bg: "rgba(255,138,122,0.16)", color: "#ff8a7a" },
  "try-on":  { bg: "rgba(199,155,255,0.16)", color: "#c79bff" },
};

export default async function ContaPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { name: true, email: true, phone: true, createdAt: true },
  });

  const orders = await prisma.order.findMany({
    where: { userId: (session.user as any).id },
    include: { items: { include: { product: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const totalGasto = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--text-main)" }}>Minha Conta</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.2rem" }}>Olá, {user?.name?.split(" ")[0] || "cliente"}!</p>
        </div>

        {/* Cupom de Aniversário */}
        <BirthdayCoupon />

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {[
            { emoji: "🛍️", label: "Pedidos", value: orders.length },
            { emoji: "💰", label: "Total gasto", value: formatCurrency(totalGasto) },
            { emoji: "✅", label: "Entregues", value: orders.filter(o => o.status === "delivered").length },
          ].map(k => (
            <div key={k.label} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "0.875rem", textAlign: "center" }}>
              <div style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>{k.emoji}</div>
              <div style={{ fontWeight: 900, fontSize: "0.95rem", color: "var(--text-main)" }}>{k.value}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Menu */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem", marginBottom: "1.5rem" }}>
          {[
            { emoji: "📦", label: "Meus Pedidos", desc: "Acompanhe seus pedidos", href: "/conta/pedidos" },
            { emoji: "👤", label: "Dados Pessoais", desc: "Nome, e-mail e telefone", href: "/conta/perfil" },
          ].map(m => (
            <Link key={m.href} href={m.href} style={{ textDecoration: "none", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1.25rem", display: "flex", gap: "0.875rem", alignItems: "center" }}>
              <span style={{ fontSize: "1.75rem" }}>{m.emoji}</span>
              <div>
                <p style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.95rem" }}>{m.label}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Pedidos recentes */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "1rem", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg)" }}>
            <h2 style={{ fontWeight: 800, color: "var(--text-main)", fontSize: "0.95rem" }}>Pedidos Recentes</h2>
            <Link href="/conta/pedidos" style={{ color: "var(--gold)", fontSize: "0.8rem", fontWeight: 700, textDecoration: "none" }}>Ver todos →</Link>
          </div>
          {orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <p style={{ color: "var(--text-muted)", marginBottom: "0.75rem" }}>Você ainda não fez nenhum pedido.</p>
              <Link href="/produtos" style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "none", fontSize: "0.875rem" }}>Ver coleção →</Link>
            </div>
          ) : orders.map(order => {
            const sc = STATUS_COLOR[order.status] || { bg: "rgba(250,246,238,0.08)", color: "var(--text-sub)" };
            return (
              <div key={order.id} style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>#{order.id.slice(-8).toUpperCase()} · {new Date(order.createdAt).toLocaleDateString("pt-BR")}</p>
                  <p style={{ fontWeight: 700, color: "var(--text-main)", marginTop: "0.2rem" }}>{formatCurrency(order.total)}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                    {order.items[0]?.size || order.items[0]?.product.name || "—"}
                    {order.items.length > 1 && ` +${order.items.length - 1}`}
                  </p>
                </div>
                <span style={{ backgroundColor: sc.bg, color: sc.color, fontSize: "0.72rem", fontWeight: 700, padding: "0.25rem 0.625rem", borderRadius: "999px", whiteSpace: "nowrap" }}>
                  {STATUS_LABEL[order.status] || order.status}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <Link href="/api/auth/signout" style={{ color: "var(--text-muted)", fontSize: "0.8rem", textDecoration: "none" }}>Sair da conta</Link>
        </div>
      </div>
    </div>
  );
}
