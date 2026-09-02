"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product: { name: string; images: string };
};

type Order = {
  id: string;
  total: number;
  subtotal: number;
  discount: number;
  couponCode?: string;
  items: OrderItem[];
  createdAt: string;
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseJson<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export default function PedidoPreviewPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/pedido-preview?id=${params.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setOrder(data);
        setLoading(false);
      })
      .catch(e => { setError("Erro ao carregar"); setLoading(false); });
  }, [params.id]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmOrder = () => {
    window.location.href = `/checkout?previewId=${params.id}`;
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FAF6EE" }}>
      <div style={{ width: 36, height: 36, border: "3px solid rgba(184,137,26,0.2)", borderTopColor: "#b8891a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (error || !order) return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAF6EE", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#c04040", fontWeight: 700, marginBottom: "1rem" }}>❌ {error || "Pedido não encontrado"}</p>
        <Link href="/" style={{ color: "#b8891a", textDecoration: "none", fontWeight: 700 }}>← Voltar</Link>
      </div>
    </div>
  );

  const subtotal = order.subtotal || order.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAF6EE", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#1a1510", margin: "0 0 0.5rem" }}>Confira seu Pedido</h1>
          <p style={{ color: "#9a8060", fontSize: "0.875rem" }}>Esta sacola ainda não é um pedido. Finalize para falar com a gente no WhatsApp.</p>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: "#fff", borderRadius: "1.25rem", overflow: "hidden", border: "1px solid rgba(140,100,20,0.1)", marginBottom: "1.5rem", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>

          {/* Itens */}
          <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(140,100,20,0.1)" }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#5a4a2a", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>Itens do Pedido</h3>
            {order.items.map((item, i) => {
              const images = parseJson<string[]>(item.product.images, []);
              const imgSrc = images[0] || "https://via.placeholder.com/80";
              return (
              <div key={item.id} style={{ display: "flex", gap: "1rem", paddingBottom: "1rem", ...(i < order.items.length - 1 ? { borderBottom: "1px solid rgba(140,100,20,0.05)" } : {}) }}>
                {/* Foto */}
                <img src={imgSrc} alt={item.product.name}
                  style={{ width: 80, height: 80, borderRadius: "0.625rem", objectFit: "cover", flexShrink: 0 }} />

                {/* Info */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.9rem", margin: "0 0 0.25rem" }}>{item.product.name}</p>
                    <p style={{ color: "#9a8060", fontSize: "0.8rem", margin: 0 }}>Qtd: {item.quantity}</p>
                  </div>
                  <p style={{ fontWeight: 700, color: "#b8891a", fontSize: "0.9rem", margin: 0 }}>{fmt(item.price * item.quantity)}</p>
                </div>
              </div>
            );
            })}
          </div>

          {/* Total */}
          <div style={{ padding: "1.5rem", backgroundColor: "#FAF6EE" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "#5a4a2a", marginBottom: "0.75rem" }}>
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "#2a6a2a", marginBottom: "0.75rem" }}>
                <span>Desconto {order.couponCode ? `(${order.couponCode})` : ""}</span>
                <span>-{fmt(order.discount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: 900, color: "#1a1510", paddingTop: "0.75rem", borderTop: "1px solid rgba(140,100,20,0.15)" }}>
              <span>Total</span>
              <span style={{ color: "#b8891a" }}>{fmt(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div style={{ display: "flex", gap: "0.875rem", flexDirection: "column" }}>
          <button onClick={confirmOrder}
            style={{ width: "100%", padding: "1rem", backgroundColor: "#b8891a", color: "#fff", fontWeight: 900, fontSize: "1rem", border: "none", borderRadius: "0.875rem", cursor: "pointer", transition: "background-color 0.2s" }}
            onMouseOver={e => (e.currentTarget.style.backgroundColor = "#d4a028")}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = "#b8891a")}>
            ✓ Finalizar este pedido
          </button>

          <button onClick={copyLink}
            style={{ width: "100%", padding: "1rem", backgroundColor: "#fff", color: "#b8891a", fontWeight: 900, fontSize: "1rem", border: "2px solid #b8891a", borderRadius: "0.875rem", cursor: "pointer" }}>
            {copied ? "✓ Link copiado!" : "📋 Copiar link para enviar a alguém"}
          </button>

          <Link href="/" style={{ textAlign: "center", padding: "1rem", color: "#b8891a", textDecoration: "none", fontWeight: 700 }}>
            ← Continuar Comprando
          </Link>
        </div>

        {/* Info */}
        <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "rgba(184,137,26,0.08)", borderRadius: "0.875rem", fontSize: "0.78rem", color: "#5a4a2a", lineHeight: 1.6 }}>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 700 }}>💡 Dicas:</p>
          <p style={{ margin: 0 }}>• Você pode compartilhar esse link com outras pessoas para revisarem seu pedido</p>
          <p style={{ margin: "0.5rem 0 0" }}>• Clique em "Confirmar e Pagar" para ir para o checkout e finalizar a compra</p>
        </div>
      </div>
    </div>
  );
}
