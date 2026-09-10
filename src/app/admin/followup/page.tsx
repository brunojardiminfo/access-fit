"use client";
import { useEffect, useState } from "react";
import CarrinhoAbandonado from "./CarrinhoAbandonado";

type Item = { quantity: number; size: string | null; componentName?: string | null; product?: { name: string } | null };
type Order = {
  id: string; total: number; createdAt: string; deliveredAt?: string | null;
  user: { id: string; name: string | null; phone: string | null };
  items: Item[];
};

type Fila = "24h" | "7d" | "30d" | "carrinho";

function itemName(i: Item): string {
  const isVM = i.product?.name === "Venda Manual";
  if (isVM) return i.size || "Item";
  if (i.product?.name) return i.componentName ? `${i.product.name} - ${i.componentName}` : i.product.name;
  return i.size || "Item";
}

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const FILAS: { id: Fila; label: string; emoji: string; desc: string }[] = [
  { id: "24h", label: "24h — Agradecimento", emoji: "🤍", desc: "Pagamento confirmado há 24h+" },
  { id: "7d",  label: "7 dias — Feedback",   emoji: "✨", desc: "Entregue há 7 dias+" },
  { id: "30d", label: "30 dias — Novidades",  emoji: "🎁", desc: "Entregue há 30 dias+" },
  { id: "carrinho", label: "Carrinho abandonado", emoji: "🛒", desc: "Separou peças e não finalizou" },
];

function buildMsg(fila: Fila, nome: string, itens: string): string {
  const primeiroNome = nome?.split(" ")[0] || "";
  if (fila === "24h") return [
    `Oii ${primeiroNome}! ✨`,
    ``,
    `Queremos agradecer pela sua compra! ✨`,
    ``,
    `É muito especial ter você com a gente, que essa peça te acompanhe em muitos treinos e momentos incríveis e que a sua energia seja infinita, leve e poderosa 🤍`,
    ``,
    `E quando usar, não esquece de postar e marcar a loja, vou amar te ver em movimento! ✨`,
    ``,
    `Com carinho,`,
    `Brus ❤️‍🔥`,
  ].join("\n");

  if (fila === "7d") return [
    `Oii ${primeiroNome}! 🤍`,
    ``,
    `Suas peças chegaram faz alguns dias e a gente quer saber — ficou tudo certinho? Serviu bem?`,
    ``,
    `Aqui na Access Fit cada peça é escolhida com muito cuidado, e o que mais importa pra gente é que você se sinta incrível nelas! ✨`,
    ``,
    `Se precisar de qualquer coisa — troca, dúvida, o que for — é só chamar, tô aqui!`,
    ``,
    `Com carinho, Brus ❤️‍🔥`,
  ].join("\n");

  return [
    `Oii ${primeiroNome}! 🤍`,
    ``,
    `Já faz um mês desde que a gente se falou, e a saudade bateu! Como você está?`,
    ``,
    `Temos novidades chegando e algumas peças me lembraram muito de você — acho que você vai amar! ✨`,
    ``,
    `E pra te receber de volta com carinho, preparamos um cupom exclusivo:`,
    ``,
    `🎁 *ENERGIA10* — 10% off na sua próxima compra`,
    ``,
    `É só usar no fechamento do pedido. Te espero por aqui!`,
    ``,
    `Com carinho, Brus ❤️‍🔥`,
  ].join("\n");
}

export default function FollowUpPage() {
  const [fila, setFila] = useState<Fila>("24h");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = (f: Fila) => {
    setLoading(true);
    fetch(`/api/admin/followup?fila=${f}`)
      .then(r => r.json())
      .then(d => { setOrders(d.orders || []); setLoading(false); });
  };

  useEffect(() => { if (fila !== "carrinho") load(fila); }, [fila]);

  const enviar = (order: Order) => {
    if (!order.user.phone) return alert("Cliente sem telefone cadastrado.");
    const itens = order.items.map(i => `- ${itemName(i)} x${i.quantity}`).join("\n");
    const msg = buildMsg(fila, order.user.name || "", itens);
    const phone = order.user.phone.replace(/\D/g, "");
    const ddi = phone.startsWith("55") ? phone : `55${phone}`;
    window.open(`https://wa.me/${ddi}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const marcar = async (id: string) => {
    setMarkingId(id);
    await fetch("/api/admin/followup", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fila }),
    });
    setOrders(prev => prev.filter(o => o.id !== id));
    setMarkingId(null);
  };

  const filaAtual = FILAS.find(f => f.id === fila)!;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>
      <a href="/admin" style={{ color: "#b8891a", fontSize: "0.875rem", textDecoration: "none" }}>← Admin</a>
      <h1 style={{ color: "#1a1510", fontSize: "1.75rem", fontWeight: 900, marginTop: "0.2rem" }}>💬 Follow-up de Clientes</h1>
      <p style={{ color: "#9a8060", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        Mensagens automáticas pós-compra em 3 etapas
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {FILAS.map(f => (
          <button key={f.id} onClick={() => setFila(f.id)}
            style={{ padding: "0.6rem 1.1rem", borderRadius: "0.625rem", border: "none", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", backgroundColor: fila === f.id ? "#b8891a" : "#fff", color: fila === f.id ? "#fff" : "#5a4a2a", boxShadow: fila === f.id ? "none" : "0 1px 4px rgba(0,0,0,0.06)" }}>
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      <p style={{ fontSize: "0.8rem", color: "#9a8060", marginBottom: "1rem" }}>{filaAtual.desc} — aguardando envio</p>

      {fila === "carrinho" ? (
        <CarrinhoAbandonado />
      ) : loading ? (
        <p style={{ color: "#9a8060" }}>Carregando...</p>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#9a8060", backgroundColor: "#fff", borderRadius: "1rem", border: "1px solid rgba(140,100,20,0.1)" }}>
          Nenhuma mensagem pendente nessa fila. 🎉
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {orders.map(order => (
            <div key={order.id} style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.12)", borderRadius: "1rem", padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <p style={{ fontWeight: 800, color: "#1a1510", fontSize: "1rem" }}>{order.user.name || "—"}</p>
                  <p style={{ fontSize: "0.78rem", color: "#9a8060" }}>
                    {fila === "24h"
                      ? `Comprou em ${new Date(order.createdAt).toLocaleDateString("pt-BR")}`
                      : `Entregue em ${order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString("pt-BR") : "—"}`
                    }
                  </p>
                </div>
                <span style={{ fontWeight: 700, color: "#b8891a" }}>{fmt(order.total)}</span>
              </div>

              <div style={{ backgroundColor: "#FAF6EE", borderRadius: "0.5rem", padding: "0.625rem 0.875rem", marginBottom: "0.875rem", fontSize: "0.8rem", color: "#5a4a2a" }}>
                {order.items.map((i, idx) => <div key={idx}>{itemName(i)} x{i.quantity}</div>)}
              </div>

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button onClick={() => enviar(order)}
                  style={{ backgroundColor: "#25D366", color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.5rem 1rem", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                  📲 Enviar mensagem
                </button>
                <button onClick={() => marcar(order.id)} disabled={markingId === order.id}
                  style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.25)", color: "#7a5a20", borderRadius: "0.5rem", padding: "0.5rem 1rem", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                  {markingId === order.id ? "..." : "✓ Marcar como enviado"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
