"use client";
import { useEffect } from "react";

const METHOD_LABEL: Record<string, string> = {
  pix: "Pix", cartao: "Cartão de Crédito", dinheiro: "Dinheiro", caderno: "Caderno / Fiado", link: "Link de Pagamento",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando", confirmed: "Confirmado", shipped: "Enviado",
  delivered: "Entregue", cancelled: "Cancelado", "try-on": "Home Try-On",
};
const PAY_LABEL: Record<string, string> = {
  paid: "Pago", partial: "Pagamento Parcial", pending: "Pendente",
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

export default function NotaPedidoClient({ order }: { order: any }) {
  const createdAt = new Date(order.createdAt);
  const saldoPendente = order.total - order.amountPaid;

  useEffect(() => {
    document.title = `Nota Pedido #${order.id.slice(-6).toUpperCase()} — ${order.user?.name || "Cliente"}`;
  }, [order]);

  return (
    <>
      {/* Estilos de impressão */}
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
            Nota do Pedido #{order.id.slice(-6).toUpperCase()}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => {
              const phone = order.user?.phone?.replace(/\D/g, "");
              if (!phone) return alert("Cliente sem telefone cadastrado.");
              const url = `https://www.accessfit.com.br/nota/${order.id}`;
              const msg = encodeURIComponent(`Olá ${order.user?.name?.split(" ")[0] || ""}! Segue a nota do seu pedido:\n${url}`);
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
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9a8060", letterSpacing: "0.08em", marginBottom: "0.3rem" }}>NOTA DE PEDIDO</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#1a1510" }}>#{order.id.slice(-6).toUpperCase()}</div>
            <div style={{ fontSize: "0.8rem", color: "#9a8060", marginTop: "0.2rem" }}>{createdAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</div>
          </div>
        </div>

        {/* Dados do cliente */}
        <div style={{ marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9a8060", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>DADOS DA CLIENTE</div>
          <div style={{ backgroundColor: "#faf6ee", borderRadius: "0.75rem", padding: "1rem 1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 2rem" }}>
            <div>
              <span style={{ fontSize: "0.72rem", color: "#9a8060" }}>Nome</span>
              <p style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.9rem", margin: "0.1rem 0 0" }}>{order.user?.name || "—"}</p>
            </div>
            {order.user?.phone && (
              <div>
                <span style={{ fontSize: "0.72rem", color: "#9a8060" }}>Telefone</span>
                <p style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.9rem", margin: "0.1rem 0 0" }}>{order.user.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Itens */}
        <div style={{ marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9a8060", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>ITENS DO PEDIDO</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#faf6ee" }}>
                {["Produto", "Qtd", "Valor Unit.", "Total"].map(h => (
                  <th key={h} style={{ padding: "0.6rem 0.75rem", textAlign: h === "Produto" ? "left" : "right", fontSize: "0.72rem", fontWeight: 700, color: "#9a8060", borderBottom: "1px solid #e8dfc8" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f0e8d0" }}>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#1a1510", fontWeight: 500 }}>{itemDisplayName(item)}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#5a4a2a", textAlign: "right" }}>{item.quantity}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#5a4a2a", textAlign: "right" }}>{fmt(item.price)}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#1a1510", fontWeight: 700, textAlign: "right" }}>{fmt(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totais */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.75rem" }}>
          <div style={{ minWidth: 260 }}>
            {order.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.85rem" }}>
                <span style={{ color: "#9a8060" }}>Desconto</span>
                <span style={{ color: "#1a8a2a", fontWeight: 600 }}>-{fmt(order.discount)}</span>
              </div>
            )}
            {order.shipping > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.85rem" }}>
                <span style={{ color: "#9a8060" }}>Frete</span>
                <span style={{ color: "#1a1510" }}>{fmt(order.shipping)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.85rem" }}>
                  <span style={{ color: "#9a8060" }}>Subtotal</span>
                  <span style={{ color: "#1a1510" }}>{fmt(order.subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", fontSize: "0.85rem" }}>
                  <span style={{ color: "#1a8a2a", fontWeight: 700 }}>Desconto</span>
                  <span style={{ color: "#1a8a2a", fontWeight: 700 }}>− {fmt(order.discount)}</span>
                </div>
              </>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0.75rem", marginTop: "0.3rem", backgroundColor: "#b8891a", borderRadius: "0.625rem" }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.95rem" }}>TOTAL</span>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: "1.1rem" }}>{fmt(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Pagamento */}
        <div style={{ marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9a8060", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>PAGAMENTO</div>
          <div style={{ backgroundColor: "#faf6ee", borderRadius: "0.75rem", padding: "1rem 1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.72rem", color: "#9a8060" }}>Forma</span>
                <p style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.875rem", margin: "0.1rem 0 0" }}>{METHOD_LABEL[order.paymentMethod] || order.paymentMethod}</p>
              </div>
              <div>
                <span style={{ fontSize: "0.72rem", color: "#9a8060" }}>Status</span>
                <p style={{ fontWeight: 700, fontSize: "0.875rem", margin: "0.1rem 0 0", color: order.paymentStatus === "paid" ? "#1a8a2a" : order.paymentStatus === "partial" ? "#b8891a" : "#c04040" }}>
                  {PAY_LABEL[order.paymentStatus] || order.paymentStatus}
                </p>
              </div>
              <div>
                <span style={{ fontSize: "0.72rem", color: "#9a8060" }}>Valor pago</span>
                <p style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.875rem", margin: "0.1rem 0 0" }}>{fmt(order.amountPaid)}</p>
              </div>
            </div>

            {/* Taxa da operadora (Link de Pagamento) */}
            {order.paymentMethod === "link" && order.amountPaid > 0 && order.amountPaid < order.total && (
              <div style={{ marginTop: "0.875rem", padding: "0.625rem 0.875rem", backgroundColor: "#fff8e1", borderRadius: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                  <span style={{ color: "#9a8060" }}>Total do link</span>
                  <span style={{ color: "#1a1510", fontWeight: 700 }}>{fmt(order.total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                  <span style={{ color: "#c04040" }}>Taxa da operadora</span>
                  <span style={{ color: "#c04040", fontWeight: 700 }}>-{fmt(order.total - order.amountPaid)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "#1a8a2a", fontWeight: 700 }}>Valor recebido (líquido)</span>
                  <span style={{ color: "#1a8a2a", fontWeight: 900 }}>{fmt(order.amountPaid)}</span>
                </div>
              </div>
            )}

            {/* Saldo pendente (não mostra se já está pago — a diferença é só a taxa da operadora, não uma dívida do cliente) */}
            {saldoPendente > 0.01 && order.paymentStatus !== "paid" && (
              <div style={{ marginTop: "0.875rem", padding: "0.625rem 0.875rem", backgroundColor: "#fee8e8", borderRadius: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.82rem", color: "#c04040", fontWeight: 700 }}>Saldo a pagar</span>
                <span style={{ fontSize: "1rem", fontWeight: 900, color: "#c04040" }}>{fmt(saldoPendente)}</span>
              </div>
            )}

            {/* Parcelas */}
            {order.installments.length > 0 && (
              <div style={{ marginTop: "0.875rem" }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9a8060", marginBottom: "0.4rem" }}>PARCELAS</p>
                {order.installments.map((inst: any) => {
                  const isPaid = inst.status === "paid";
                  const isOverdue = !isPaid && new Date(inst.dueDate) < new Date();
                  return (
                    <div key={inst.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0.625rem", marginBottom: "0.25rem", borderRadius: "0.4rem", backgroundColor: isPaid ? "#e8f8e8" : isOverdue ? "#fee8e8" : "#fff8e1" }}>
                      <span style={{ fontSize: "0.8rem", color: "#5a4a2a" }}>{inst.number}ª parcela — {new Date(inst.dueDate).toLocaleDateString("pt-BR")}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1a1510" }}>{fmt(inst.amount)}</span>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: isPaid ? "#1a8a2a" : isOverdue ? "#c04040" : "#b8891a" }}>
                          {isPaid ? "✓ Pago" : isOverdue ? "⚠️ Vencido" : "Pendente"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Status do pedido */}
        <div style={{ marginBottom: order.notes ? "1.75rem" : 0 }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9a8060", letterSpacing: "0.08em", marginBottom: "0.6rem" }}>STATUS DO PEDIDO</div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <span style={{ backgroundColor: "#f0e8d0", color: "#7a5a10", fontWeight: 700, fontSize: "0.82rem", padding: "0.3rem 0.875rem", borderRadius: "999px" }}>
              {STATUS_LABEL[order.status] || order.status}
            </span>
            {order.deliveredAt && (
              <span style={{ fontSize: "0.8rem", color: "#9a8060" }}>
                Entregue em {new Date(order.deliveredAt).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>

        {/* Observações */}
        {order.notes && (
          <div style={{ marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid #f0e8d0" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9a8060", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>OBSERVAÇÕES</div>
            <p style={{ fontSize: "0.875rem", color: "#5a4a2a", fontStyle: "italic" }}>{order.notes}</p>
          </div>
        )}

        {/* Rodapé */}
        <div style={{ marginTop: "2.5rem", paddingTop: "1.25rem", borderTop: "2px solid #f0e8d0", textAlign: "center" }}>
          <p style={{ fontSize: "0.78rem", color: "#b8a080" }}>Access Fit — Documento interno de pedido • Gerado em {new Date().toLocaleDateString("pt-BR")}</p>
        </div>
      </div>
    </>
  );
}
