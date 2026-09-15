"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Parcelas, { type Parcela } from "./Parcelas";

type Item = { id: string; quantity: number; price: number; size: string | null; componentName?: string | null; product?: { name: string } | null };
type Order = {
  id: string; total: number; amountPaid: number; paymentStatus: string;
  paymentMethod: string; dueDate: string | null;
  createdAt: string; notes: string | null; items: Item[]; installments: Parcela[];
};
type User = { id: string; name: string | null; email: string; phone: string | null };

export default function CadernoDetalheClient({ user, orders }: { user: User; orders: Order[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pagamento, setPagamento] = useState("");
  const [saving, setSaving] = useState(false);

  const pendentes = orders.filter(o => o.paymentStatus !== "paid");
  const pagos = orders.filter(o => o.paymentStatus === "paid");
  const totalDevido = pendentes.reduce((s, o) => s + o.total, 0);
  const totalPago = orders.reduce((s, o) => s + o.amountPaid, 0);
  const saldo = totalDevido - pendentes.reduce((s, o) => s + o.amountPaid, 0);

  const enviarResumoWhatsApp = () => {
    if (!user.phone) return alert("Cliente sem telefone cadastrado.");
    const linhas = pendentes.flatMap(o =>
      o.items.map(i => {
        const isVM = i.product?.name === "Venda Manual";
        const nome = isVM
          ? (i.size || "Item")
          : i.product?.name
            ? (i.componentName ? `${i.product.name} - ${i.componentName}` : i.product.name)
            : (i.size || "Item");
        const tamanho = !i.componentName && i.size && i.size !== nome ? ` (${i.size})` : "";
        return `- ${nome}${tamanho} x${i.quantity}  ${formatCurrency(i.price * i.quantity)}`;
      })
    ).join("\n");
    const msg = [
      `Olá ${user.name?.split(" ")[0]}!`,
      ``,
      `Segue o resumo das suas peças na *Access Fit*:`,
      ``,
      linhas,
      ``,
      `*Total: ${formatCurrency(saldo)}*`,
      ``,
      `Qualquer dúvida estamos à disposição!`,
    ].join("\n");
    const phone = user.phone.replace(/\D/g, "");
    const ddi = phone.startsWith("55") ? phone : `55${phone}`;
    window.open(`https://wa.me/${ddi}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  /**
   * Recebe um valor no pedido.
   *
   * Com parcelas, o dinheiro entra PELAS parcelas: quita da mais antiga para a
   * mais nova, e o pedido e recalculado a partir delas. Escrever o amountPaid
   * direto aqui era o que sumia com o pagamento assim que alguem mexesse numa
   * parcela na aba Pedidos.
   */
  const receber = async (order: Order, valor: number) => {
    if (!valor || valor <= 0) return;
    setSaving(true);

    if (order.installments.length > 0) {
      await fetch("/api/admin/parcelas/receber", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, valor, metodo: order.paymentMethod }),
      });
    } else {
      const pago = Math.round((order.amountPaid + valor) * 100) / 100;
      await fetch(`/api/admin/pedidos/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPaid: Math.min(pago, order.total),
          paymentStatus: pago >= order.total - 0.01 ? "paid" : "partial",
        }),
      });
    }

    setSaving(false);
    setEditingId(null);
    setPagamento("");
    router.refresh();
  };

  const handleRegistrarPagamento = (order: Order) => receber(order, parseFloat(pagamento));

  const handleMarcarPago = (order: Order) =>
    receber(order, Math.round((order.total - order.amountPaid) * 100) / 100);

  const inp = { padding: "0.5rem 0.75rem", border: "1px solid rgba(140,100,20,0.3)", borderRadius: "0.5rem", fontSize: "0.875rem", backgroundColor: "#FAF6EE", outline: "none", width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <a href="/admin/caderno" style={{ color: "#b8891a", fontSize: "0.875rem", textDecoration: "none" }}>← Caderno</a>
          <h1 style={{ color: "#1a1510", fontSize: "1.75rem", fontWeight: 900, marginTop: "0.2rem" }}>{user.name || user.email}</h1>
          {user.phone && <p style={{ color: "#9a8060", fontSize: "0.875rem", marginTop: "0.15rem" }}>{user.phone}</p>}
        </div>
        {pendentes.length > 0 && (
          <button onClick={enviarResumoWhatsApp}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", backgroundColor: "#25D366", color: "#fff", border: "none", borderRadius: "0.875rem", padding: "0.7rem 1.25rem", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", boxShadow: "0 2px 8px rgba(37,211,102,0.3)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Enviar resumo completo
          </button>
        )}
      </div>

      {/* KPIs do cliente */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        {[
          { emoji: "🛍️", label: "Compras", value: orders.length },
          { emoji: "💰", label: "Total comprado", value: formatCurrency(orders.reduce((s, o) => s + o.total, 0)) },
          { emoji: "✅", label: "Total pago", value: formatCurrency(totalPago), ok: true },
          { emoji: "📒", label: "Saldo devedor", value: formatCurrency(saldo), warn: saldo > 0 },
        ].map(k => (
          <div key={k.label} style={{ backgroundColor: "#fff", border: `1px solid ${(k as any).warn ? "rgba(184,137,26,0.35)" : "rgba(140,100,20,0.1)"}`, borderRadius: "0.875rem", padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>{k.emoji}</div>
            <div style={{ color: (k as any).warn ? "#856404" : (k as any).ok ? "#1a8a2a" : "#1a1510", fontSize: "1.25rem", fontWeight: 900 }}>{k.value}</div>
            <div style={{ color: "#9a8060", fontSize: "0.72rem", marginTop: "0.15rem" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Compras em aberto */}
      {pendentes.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ color: "#1a1510", fontWeight: 800, fontSize: "1rem", marginBottom: "0.75rem" }}>⏳ Em aberto</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {pendentes.map(order => {
              const saldoOrder = order.total - order.amountPaid;
              const isEditing = editingId === order.id;
              return (
                <div key={order.id} style={{ backgroundColor: "#fff", border: "1px solid rgba(184,137,26,0.25)", borderRadius: "1rem", padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <div>
                      <span style={{ fontSize: "0.72rem", color: "#9a8060", fontFamily: "monospace" }}>#{order.id.slice(-8).toUpperCase()}</span>
                      <div style={{ fontSize: "0.8rem", color: "#7a5a10", marginTop: "0.1rem" }}>
                        {new Date(order.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#856404" }}>{formatCurrency(saldoOrder)}</div>
                      <div style={{ fontSize: "0.72rem", color: "#9a8060" }}>
                        {order.amountPaid > 0 && `pago: ${formatCurrency(order.amountPaid)} · `}total: {formatCurrency(order.total)}
                      </div>
                    </div>
                  </div>

                  {/* Itens */}
                  <div style={{ backgroundColor: "#FAF6EE", borderRadius: "0.5rem", padding: "0.625rem 0.875rem", marginBottom: "0.875rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {order.items.map(item => (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#5a4a2a" }}>
                        <span>{item.size || "Item"} × {item.quantity}</span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <p style={{ fontSize: "0.78rem", color: "#9a8060", marginBottom: "0.75rem", fontStyle: "italic" }}>📝 {order.notes}</p>
                  )}

                  <Parcelas orderId={order.id} total={order.total}
                    amountPaid={order.amountPaid} parcelas={order.installments} />

                  <a href={`/admin/pedidos?expand=${order.id}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", fontWeight: 700, color: "#b8891a", textDecoration: "none", backgroundColor: "#FAF6EE", border: "1px solid rgba(184,137,26,0.3)", borderRadius: "0.5rem", padding: "0.35rem 0.75rem", marginBottom: "0.75rem" }}>
                    ✏️ Editar pedido
                  </a>

                  {/* Ações */}
                  {isEditing ? (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <input style={inp} type="number" min="0.01" step="0.01" placeholder="Valor recebido (R$)"
                          value={pagamento} onChange={e => setPagamento(e.target.value)}
                          autoFocus />
                      </div>
                      <button onClick={() => handleRegistrarPagamento(order)} disabled={saving}
                        style={{ backgroundColor: "#b8891a", color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.5rem 1rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                        {saving ? "Salvando..." : "Confirmar"}
                      </button>
                      <button onClick={() => { setEditingId(null); setPagamento(""); }}
                        style={{ backgroundColor: "#FAF6EE", border: "1px solid rgba(140,100,20,0.2)", color: "#9a8060", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button onClick={() => { setEditingId(order.id); setPagamento(""); }}
                        style={{ backgroundColor: "#fff8e1", border: "1px solid rgba(184,137,26,0.3)", color: "#856404", borderRadius: "0.5rem", padding: "0.4rem 0.875rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                        💵 Registrar pagamento parcial
                      </button>
                      <button onClick={() => handleMarcarPago(order)} disabled={saving}
                        style={{ backgroundColor: "#e8f8e8", border: "1px solid rgba(26,138,42,0.25)", color: "#1a8a2a", borderRadius: "0.5rem", padding: "0.4rem 0.875rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                        ✅ Marcar como pago
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Histórico pago */}
      {pagos.length > 0 && (
        <div>
          <h2 style={{ color: "#9a8060", fontWeight: 800, fontSize: "0.9rem", marginBottom: "0.75rem" }}>✅ Histórico pago</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {pagos.map(order => (
              <div key={order.id} style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.08)", borderRadius: "0.75rem", padding: "0.875rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.72rem", color: "#b8a080", fontFamily: "monospace" }}>#{order.id.slice(-8).toUpperCase()}</span>
                  <div style={{ fontSize: "0.8rem", color: "#9a8060", marginTop: "0.1rem" }}>
                    {new Date(order.createdAt).toLocaleDateString("pt-BR")} · {order.items.length} item(s)
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontWeight: 700, color: "#5a4a2a" }}>{formatCurrency(order.total)}</span>
                  <span style={{ backgroundColor: "#e8f8e8", color: "#1a8a2a", fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: 999 }}>Pago</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div style={{ textAlign: "center", padding: "4rem", color: "#9a8060" }}>
          Nenhum pedido no caderno para este cliente.
        </div>
      )}
    </div>
  );
}
