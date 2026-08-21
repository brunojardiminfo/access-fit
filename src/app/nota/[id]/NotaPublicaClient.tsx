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

export default function NotaPublicaClient({ order }: { order: any }) {
  const createdAt = new Date(order.createdAt);
  const quitado = order.paymentStatus === "paid";
  // Pedido quitado nao tem saldo. Quando a diferenca e taxa da operadora, ela e
  // custo nosso: para a cliente o pedido foi pago integralmente
  const saldoPendente = quitado ? 0 : order.total - order.amountPaid;
  const valorPago = quitado ? order.total : order.amountPaid;

  useEffect(() => {
    document.title = `Nota do Pedido #${order.id.slice(-6).toUpperCase()} — Access Fit`;
  }, [order]);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          .nota-container { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; padding: 1.5rem !important; border-radius: 0 !important; }
        }
        @page { margin: 1.5cm; size: A4; }
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f0e8; margin: 0; padding: 1rem; }
      `}</style>

      {/* Botão imprimir flutuante */}
      <div className="no-print" style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 100 }}>
        <button onClick={() => window.print()}
          style={{ backgroundColor: "#b8891a", color: "#fff", border: "none", borderRadius: "999px", padding: "0.75rem 1.5rem", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", boxShadow: "0 4px 16px rgba(184,137,26,0.4)" }}>
          🖨️ Salvar PDF
        </button>
      </div>

      <div className="nota-container" style={{ maxWidth: 640, margin: "1rem auto 5rem", backgroundColor: "#fff", borderRadius: "1.25rem", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", padding: "2rem 2.5rem", border: "1px solid #e8dfc8" }}>

        {/* Cabeçalho */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", paddingBottom: "1.25rem", borderBottom: "2px solid #f0e8d0" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: "#b8891a", margin: 0 }}>Access Fit</h1>
            <p style={{ color: "#9a8060", fontSize: "0.78rem", marginTop: "0.2rem" }}>Moda fitness com propósito</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#9a8060", letterSpacing: "0.08em" }}>NOTA DE PEDIDO</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#1a1510", marginTop: "0.2rem" }}>#{order.id.slice(-6).toUpperCase()}</div>
            <div style={{ fontSize: "0.75rem", color: "#9a8060" }}>{createdAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</div>
          </div>
        </div>

        {/* Cliente */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#9a8060", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>CLIENTE</p>
          <p style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.95rem", margin: 0 }}>{order.user?.name || "—"}</p>
          {order.address && (
            <p style={{ fontSize: "0.8rem", color: "#7a6030", marginTop: "0.25rem" }}>
              {order.address.street}, {order.address.number}{order.address.complement ? `, ${order.address.complement}` : ""} — {order.address.city}/{order.address.state}
            </p>
          )}
        </div>

        {/* Itens */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#9a8060", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>ITENS</p>
          <div style={{ border: "1px solid #f0e8d0", borderRadius: "0.75rem", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#faf6ee" }}>
                  {["Produto", "Qtd", "Valor"].map(h => (
                    <th key={h} style={{ padding: "0.6rem 0.875rem", textAlign: h === "Produto" ? "left" : "right", fontSize: "0.68rem", fontWeight: 700, color: "#9a8060", borderBottom: "1px solid #f0e8d0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.items.map((item: any, i: number) => (
                  <tr key={item.id} style={{ borderBottom: i < order.items.length - 1 ? "1px solid #f8f2e8" : "none", backgroundColor: i % 2 === 0 ? "#fff" : "#fdfaf5" }}>
                    <td style={{ padding: "0.7rem 0.875rem", fontSize: "0.85rem", color: "#1a1510", fontWeight: 500 }}>{itemDisplayName(item)}</td>
                    <td style={{ padding: "0.7rem 0.875rem", fontSize: "0.85rem", color: "#5a4a2a", textAlign: "right" }}>{item.quantity}</td>
                    <td style={{ padding: "0.7rem 0.875rem", fontSize: "0.85rem", color: "#1a1510", fontWeight: 700, textAlign: "right" }}>{fmt(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totais */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.5rem" }}>
          <div style={{ minWidth: 220 }}>
            {order.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", fontSize: "0.82rem" }}>
                <span style={{ color: "#9a8060" }}>Desconto</span>
                <span style={{ color: "#1a8a2a", fontWeight: 600 }}>-{fmt(order.discount)}</span>
              </div>
            )}
            {order.shipping > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", fontSize: "0.82rem" }}>
                <span style={{ color: "#9a8060" }}>Frete</span>
                <span style={{ color: "#1a1510" }}>{fmt(order.shipping)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0.875rem", marginTop: "0.4rem", backgroundColor: "#b8891a", borderRadius: "0.625rem" }}>
              <span style={{ color: "#fff", fontWeight: 700 }}>TOTAL</span>
              <span style={{ color: "#fff", fontWeight: 900, fontSize: "1.05rem" }}>{fmt(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Pagamento */}
        <div style={{ marginBottom: order.notes ? "1.5rem" : 0 }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#9a8060", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>PAGAMENTO</p>
          <div style={{ backgroundColor: "#faf6ee", borderRadius: "0.75rem", padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              <div>
                <span style={{ fontSize: "0.68rem", color: "#9a8060" }}>Forma</span>
                <p style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.875rem", margin: "0.1rem 0 0" }}>{METHOD_LABEL[order.paymentMethod] || order.paymentMethod}</p>
              </div>
              <div>
                <span style={{ fontSize: "0.68rem", color: "#9a8060" }}>Status</span>
                <p style={{ fontWeight: 700, fontSize: "0.875rem", margin: "0.1rem 0 0", color: order.paymentStatus === "paid" ? "#1a8a2a" : order.paymentStatus === "partial" ? "#b8891a" : "#c04040" }}>
                  {PAY_LABEL[order.paymentStatus]}
                </p>
              </div>
              {valorPago > 0 && (
                <div>
                  <span style={{ fontSize: "0.68rem", color: "#9a8060" }}>Pago</span>
                  <p style={{ fontWeight: 700, color: "#1a8a2a", fontSize: "0.875rem", margin: "0.1rem 0 0" }}>{fmt(valorPago)}</p>
                </div>
              )}
            </div>

            {saldoPendente > 0.01 && (
              <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.875rem", backgroundColor: "#fee8e8", borderRadius: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "#c04040", fontWeight: 700 }}>Saldo a pagar</span>
                <span style={{ fontSize: "1rem", fontWeight: 900, color: "#c04040" }}>{fmt(saldoPendente)}</span>
              </div>
            )}

            {order.installments.length > 0 && (
              <div style={{ marginTop: "0.75rem" }}>
                <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#9a8060", marginBottom: "0.4rem" }}>PARCELAS</p>
                {order.installments.map((inst: any) => {
                  const isPaid = inst.status === "paid";
                  const isOverdue = !isPaid && new Date(inst.dueDate) < new Date();
                  return (
                    <div key={inst.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0.625rem", marginBottom: "0.2rem", borderRadius: "0.4rem", backgroundColor: isPaid ? "#e8f8e8" : isOverdue ? "#fee8e8" : "#fff8e1" }}>
                      <span style={{ fontSize: "0.78rem", color: "#5a4a2a" }}>{inst.number}ª parcela — {new Date(inst.dueDate).toLocaleDateString("pt-BR")}</span>
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1a1510" }}>{fmt(inst.amount)}</span>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: isPaid ? "#1a8a2a" : isOverdue ? "#c04040" : "#b8891a" }}>
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

        {/* Observações */}
        {order.notes && (
          <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid #f0e8d0" }}>
            <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#9a8060", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>OBSERVAÇÕES</p>
            <p style={{ fontSize: "0.85rem", color: "#5a4a2a", fontStyle: "italic", margin: 0 }}>{order.notes}</p>
          </div>
        )}

        {/* Rodapé */}
        <div style={{ marginTop: "2rem", paddingTop: "1.25rem", borderTop: "2px solid #f0e8d0", textAlign: "center" }}>
          <p style={{ fontSize: "0.72rem", color: "#b8a080", margin: 0 }}>
            Access Fit • Pedido #{order.id.slice(-6).toUpperCase()} • {createdAt.toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>
    </>
  );
}
