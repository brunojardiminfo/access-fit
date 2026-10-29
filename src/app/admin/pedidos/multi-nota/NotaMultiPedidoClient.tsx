"use client";
import CondicoesHomeTryOn from "@/components/CondicoesHomeTryOn";
import { ehHomeTryOn } from "@/lib/homeTryOn";
import { useEffect } from "react";

const METHOD_LABEL: Record<string, string> = {
  pix: "Pix", cartao: "Cartão de Crédito", dinheiro: "Dinheiro", caderno: "Caderno / Fiado", link: "Link de Pagamento",
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function itemDisplayName(item: any): string {
  if (item.product?.name === "Venda Manual") return item.size || "Item";
  const parts = [item.product?.name || "Produto"];
  if (item.size && item.product?.name !== "Venda Manual") parts.push(`Tam. ${item.size}`);
  if (item.color) parts.push(item.color);
  if (item.componentName) parts.push(`(${item.componentName})`);
  return parts.join(" — ");
}

export default function NotaMultiPedidoClient({ orders }: { orders: any[] }) {
  const cliente = orders[0].user;
  const grandTotal = orders.reduce((s, o) => s + o.total, 0);
  const totalPago = orders.reduce((s, o) => s + o.amountPaid, 0);
  const metodos = Array.from(new Set(orders.map(o => o.paymentMethod)));
  const totalTaxaOperadora = orders.reduce((s, o) => s + (o.paymentMethod === "link" && o.amountPaid > 0 && o.amountPaid < o.total ? o.total - o.amountPaid : 0), 0);
  // Saldo real devido pela cliente — pedidos já pagos não entram, mesmo com diferença por taxa de operadora
  const saldoTotal = orders.reduce((s, o) => s + (o.paymentStatus === "paid" ? 0 : Math.max(0, o.total - o.amountPaid)), 0);

  useEffect(() => {
    document.title = `Nota Unificada — ${cliente?.name || "Cliente"}`;
  }, [cliente]);

  return (
    <>
      <style>{`
        @media print {
          .no-print, .admin-header, .admin-bottomnav { display: none !important; }
          body { margin: 0; background: white; }
          .nota-container { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; padding: 1.5rem !important; }
        }
        @page { margin: 1.5cm; size: A4; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 2rem 1rem; }
      `}</style>

      {/* Barra de ações */}
      <div className="no-print" style={{ position: "fixed", top: 0, left: 0, right: 0, backgroundColor: "#1a1510", padding: "0.875rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <a href="/admin/pedidos" style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", textDecoration: "none" }}>← Pedidos</a>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
          <span style={{ color: "#b8891a", fontWeight: 700, fontSize: "0.9rem" }}>
            Nota Unificada — {orders.length} pedidos
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => {
              const phone = cliente?.phone?.replace(/\D/g, "");
              if (!phone) return alert("Cliente sem telefone cadastrado.");
              const msg = encodeURIComponent(`Olá ${cliente?.name?.split(" ")[0] || ""}! Segue o resumo dos seus pedidos em aberto:\n\nTotal: ${fmt(grandTotal)}\nJá pago: ${fmt(totalPago)}\nSaldo a pagar: ${fmt(saldoTotal)}`);
              window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
            }}
            style={{ backgroundColor: "#25D366", color: "#fff", border: "none", borderRadius: "0.625rem", padding: "0.5rem 1.25rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
            📱 WhatsApp
          </button>
          <button
            onClick={() => window.print()}
            style={{ backgroundColor: "#b8891a", color: "#fff", border: "none", borderRadius: "0.625rem", padding: "0.5rem 1.25rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Nota */}
      <div className="nota-container" style={{ maxWidth: 680, margin: "5rem auto 2rem", backgroundColor: "#fff", borderRadius: "1rem", boxShadow: "0 4px 24px rgba(0,0,0,0.1)", padding: "2.5rem 3rem", border: "1px solid #e0d8c8" }}>

        {/* Cabeçalho */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "2px solid #f0e8d0" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#b8891a", margin: 0, letterSpacing: "-0.02em" }}>Access Fit</h1>
            <p style={{ color: "#9a8060", fontSize: "0.82rem", marginTop: "0.25rem" }}>Moda fitness com propósito</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9a8060", letterSpacing: "0.08em", marginBottom: "0.3rem" }}>NOTA UNIFICADA</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#1a1510" }}>{orders.length} pedidos</div>
            <div style={{ fontSize: "0.8rem", color: "#9a8060", marginTop: "0.2rem" }}>Gerada em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</div>
          </div>
        </div>

        {/* Dados do cliente */}
        <div style={{ marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9a8060", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>DADOS DA CLIENTE</div>
          <div style={{ backgroundColor: "#faf6ee", borderRadius: "0.75rem", padding: "1rem 1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 2rem" }}>
            <div>
              <span style={{ fontSize: "0.72rem", color: "#9a8060" }}>Nome</span>
              <p style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.9rem", margin: "0.1rem 0 0" }}>{cliente?.name || "—"}</p>
            </div>
            {cliente?.phone && (
              <div>
                <span style={{ fontSize: "0.72rem", color: "#9a8060" }}>Telefone</span>
                <p style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.9rem", margin: "0.1rem 0 0" }}>{cliente.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Um bloco por pedido */}
        {orders.map(order => {
          const saldoPedido = order.total - order.amountPaid;
          return (
            <div key={order.id} style={{ marginBottom: "1.75rem", paddingBottom: "1.75rem", borderBottom: "1px dashed #e0d8c8" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.6rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1a1510" }}>
                  Pedido #{order.id.slice(-6).toUpperCase()}
                </span>
                <span style={{ fontSize: "0.78rem", color: "#9a8060" }}>
                  {new Date(order.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {order.items.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f0e8d0" }}>
                      <td style={{ padding: "0.5rem 0.25rem", fontSize: "0.85rem", color: "#1a1510" }}>{itemDisplayName(item)} <span style={{ color: "#9a8060" }}>x{item.quantity}</span></td>
                      <td style={{ padding: "0.5rem 0.25rem", fontSize: "0.85rem", color: "#1a1510", fontWeight: 700, textAlign: "right" }}>{fmt(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.4rem", fontSize: "0.82rem" }}>
                <span style={{ color: "#9a8060" }}>Subtotal do pedido</span>
                <span style={{ color: "#1a1510", fontWeight: 700 }}>{fmt(order.total)}</span>
              </div>
              {order.amountPaid > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                  <span style={{ color: "#1a8a2a" }}>Já pago</span>
                  <span style={{ color: "#1a8a2a", fontWeight: 700 }}>-{fmt(order.amountPaid)}</span>
                </div>
              )}
              {saldoPedido > 0.01 && order.amountPaid > 0 && order.paymentStatus !== "paid" && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                  <span style={{ color: "#c04040" }}>Saldo do pedido</span>
                  <span style={{ color: "#c04040", fontWeight: 700 }}>{fmt(saldoPedido)}</span>
                </div>
              )}
              {order.paymentMethod === "link" && order.amountPaid > 0 && order.amountPaid < order.total && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginTop: "0.15rem" }}>
                  <span style={{ color: "#9a8060" }}>↳ Taxa da operadora (Link)</span>
                  <span style={{ color: "#9a8060" }}>-{fmt(order.total - order.amountPaid)}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Totais gerais */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.75rem" }}>
          <div style={{ minWidth: 280 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.9rem" }}>
              <span style={{ color: "#9a8060" }}>Total geral ({orders.length} pedidos)</span>
              <span style={{ color: "#1a1510", fontWeight: 700 }}>{fmt(grandTotal)}</span>
            </div>
            {totalTaxaOperadora > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.9rem" }}>
                <span style={{ color: "#c04040" }}>Taxa da operadora (Link)</span>
                <span style={{ color: "#c04040", fontWeight: 700 }}>-{fmt(totalTaxaOperadora)}</span>
              </div>
            )}
            {totalPago > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.9rem" }}>
                <span style={{ color: "#9a8060" }}>Total já pago</span>
                <span style={{ color: "#1a8a2a", fontWeight: 700 }}>-{fmt(totalPago)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.7rem 0.875rem", marginTop: "0.4rem", backgroundColor: saldoTotal > 0.01 ? "#c04040" : "#b8891a", borderRadius: "0.625rem" }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>SALDO A PAGAR</span>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: "1.15rem" }}>{fmt(saldoTotal)}</span>
            </div>
          </div>
        </div>

        {/* Pagamento */}
        <div style={{ marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9a8060", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>FORMA DE PAGAMENTO</div>
          <div style={{ backgroundColor: "#faf6ee", borderRadius: "0.75rem", padding: "1rem 1.25rem" }}>
            <p style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.9rem", margin: 0 }}>
              {metodos.map(m => METHOD_LABEL[m] || m).join(", ")}
            </p>
          </div>
        </div>

        {/* Basta um pedido Home Try-On na leva para as condições valerem:
            as peças saem para casa do mesmo jeito. */}
        {orders.some(o => ehHomeTryOn(o.status)) && <CondicoesHomeTryOn variante="papel" />}

        {/* Rodapé */}
        <div style={{ marginTop: "2.5rem", paddingTop: "1.25rem", borderTop: "2px solid #f0e8d0", textAlign: "center" }}>
          <p style={{ fontSize: "0.78rem", color: "#b8a080" }}>Access Fit — Documento interno de pedido • Gerado em {new Date().toLocaleDateString("pt-BR")}</p>
        </div>
      </div>
    </>
  );
}
