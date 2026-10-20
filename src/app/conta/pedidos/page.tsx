import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import CancelButton from "./CancelButton";
import OrderTimeline from "@/app/components/OrderTimeline";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando confirmação", confirmed: "Confirmado", shipped: "A caminho",
  delivered: "Entregue", cancelled: "Cancelado", "try-on": "Home Try-On",
};
const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "#fff8e1", color: "var(--gold)" },
  confirmed: { bg: "#e8f4fd", color: "#1a6a9a" },
  shipped:   { bg: "#f0e8ff", color: "#b78cff" },
  delivered: { bg: "#e8f8e8", color: "#5fd37a" },
  cancelled: { bg: "#fee8e8", color: "#ff8a7a" },
  "try-on":  { bg: "#fce8ff", color: "#c79bff" },
};

export default async function MeusPedidosPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: (session.user as any).id },
    include: {
      items: { include: { product: { select: { name: true, images: true } } } },
      statusHistory: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <Link href="/conta" style={{ color: "var(--gold)", fontSize: "0.875rem", textDecoration: "none" }}>← Minha Conta</Link>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--text-main)", marginTop: "0.3rem" }}>Meus Pedidos</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.2rem" }}>{orders.length} pedido{orders.length !== 1 ? "s" : ""}</p>
        </div>

        {orders.length === 0 ? (
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "4rem 1rem", textAlign: "center" }}>
            <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🛍️</p>
            <p style={{ color: "var(--text-sub)", fontWeight: 600, marginBottom: "0.5rem" }}>Nenhum pedido ainda</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>Explore nossa coleção e faça seu primeiro pedido!</p>
            <Link href="/produtos" style={{ backgroundColor: "var(--gold)", color: "#16110b", padding: "0.75rem 2rem", borderRadius: "0.75rem", textDecoration: "none", fontWeight: 700, fontSize: "0.875rem" }}>
              Ver Coleção
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {orders.map(order => {
              const sc = STATUS_COLOR[order.status] || { bg: "#f0f0f0", color: "#666" };
              const images = order.items.flatMap(i => { try { return JSON.parse(i.product.images); } catch { return []; } }).filter(Boolean);
              return (
                <div key={order.id} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "1rem", overflow: "hidden" }}>
                  {/* Header do pedido */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", backgroundColor: "var(--bg)", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Pedido #{order.id.slice(-8).toUpperCase()}</p>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>{new Date(order.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                    </div>
                    <span style={{ backgroundColor: sc.bg, color: sc.color, fontSize: "0.75rem", fontWeight: 700, padding: "0.3rem 0.75rem", borderRadius: "999px" }}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>

                  {/* Itens */}
                  <div style={{ padding: "1rem 1.25rem" }}>
                    <div style={{ display: "flex", gap: "0.625rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                      {order.items.map((item, idx) => {
                        const imgs = (() => { try { return JSON.parse(item.product.images); } catch { return []; } })();
                        return (
                          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "0.625rem", flex: 1, minWidth: 200 }}>
                            <div style={{ width: 52, height: 52, backgroundColor: "var(--bg-soft)", borderRadius: "0.5rem", overflow: "hidden", flexShrink: 0 }}>
                              {imgs[0] && <img src={imgs[0]} alt={item.product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.size || item.product.name}
                              </p>
                              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                {item.quantity > 1 ? `${item.quantity}x ` : ""}{formatCurrency(item.price)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {order.paymentStatus === "paid" ? "✅ Pago" : order.paymentStatus === "partial" ? "⚠️ Parcialmente pago" : "⏳ Pagamento pendente"}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <Link href={`/nota/${order.id}`} target="_blank" style={{ fontSize: "0.78rem", color: "var(--gold)", fontWeight: 700, textDecoration: "none", backgroundColor: "#fff8e1", border: "1px solid rgba(184,137,26,0.3)", padding: "0.3rem 0.75rem", borderRadius: "999px" }}>
                          🧾 Ver nota
                        </Link>
                        <span style={{ fontWeight: 900, color: "var(--gold)", fontSize: "1rem" }}>{formatCurrency(order.total)}</span>
                      </div>
                    </div>

                    {order.status === "pending" && (
                      <>
                        <div style={{ marginTop: "0.75rem", padding: "0.625rem 0.875rem", backgroundColor: "#fff8e1", borderRadius: "0.625rem", fontSize: "0.78rem", color: "#856404" }}>
                          Seu pedido foi recebido! Entraremos em contato pelo WhatsApp para confirmar.
                        </div>
                        <CancelButton orderId={order.id} />
                      </>
                    )}
                    {order.status === "shipped" && (
                      <div style={{ marginTop: "0.75rem", padding: "0.625rem 0.875rem", backgroundColor: "#f0e8ff", borderRadius: "0.625rem", fontSize: "0.78rem", color: "#b78cff" }}>
                        Seu pedido está a caminho!
                      </div>
                    )}

                    {order.status !== "cancelled" && (
                      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                        <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>ACOMPANHE SEU PEDIDO</p>
                        <OrderTimeline history={order.statusHistory} fallbackCreatedAt={order.createdAt} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
