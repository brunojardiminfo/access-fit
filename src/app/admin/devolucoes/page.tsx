"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface OrderUser {
  id: string;
  name?: string;
  email: string;
}

interface Product {
  id: string;
  name: string;
  sizes?: string;
  sizeStock?: string;
  stock?: number;
  active?: boolean;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  size?: string;
  product: Product;
}

interface Order {
  id: string;
  total: number;
  createdAt: string;
  user: OrderUser;
  items: OrderItem[];
}

interface Return {
  id: string;
  orderId: string;
  status: string;
  reason?: string;
  amount: number;
  requestedAt: string;
  approvedAt?: string;
  returnedAt?: string;
  reimbursedAt?: string;
  order: Order;
  orderItemIds?: string;
  stockRestored?: boolean;
  replacementProductId?: string | null;
  replacementSize?: string | null;
  replacementSentAt?: string | null;
  replacementProduct?: Product | null;
}

interface Data {
  returns: Return[];
}

const statusConfig: { [key: string]: { label: string; color: string; bg: string } } = {
  solicitado: { label: "Solicitado", color: "#ff9800", bg: "#fff3e0" },
  aprovado: { label: "Aprovado", color: "#2196f3", bg: "#e3f2fd" },
  rejeitado: { label: "Rejeitado", color: "#666", bg: "#f5f5f5" },
  recebido: { label: "Recebido", color: "#4caf50", bg: "#e8f5e9" },
  reembolsado: { label: "Reembolsado", color: "#2e7d32", bg: "#c8e6c9" },
};

export default function DevolucoesPage() {
  const [data, setData] = useState<Data>({ returns: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [novaDevWindow, setNovaDevWindow] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [replacingSaving, setReplacingSaving] = useState(false);

  const loadDevolucoes = async (status?: string) => {
    setLoading(true);
    const url = status ? `/api/admin/devolucoes?status=${status}` : "/api/admin/devolucoes";
    const res = await fetch(url);
    if (res.ok) {
      const d = await res.json();
      setData(d);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDevolucoes(filter || undefined);
  }, [filter]);

  const handleCreateDevolution = async () => {
    if (!orderId || !amount) return;
    setSaving(true);
    const res = await fetch("/api/admin/devolucoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, reason, amount: parseFloat(amount) }),
    });
    if (res.ok) {
      setNovaDevWindow(false);
      setOrderId("");
      setReason("");
      setAmount("");
      loadDevolucoes(filter || undefined);
    }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const res = await fetch("/api/admin/devolucoes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    if (res.ok) {
      loadDevolucoes(filter || undefined);
    }
  };

  const openReplacement = (dev: Return) => {
    setReplacingId(dev.id);
    setProductQuery("");
    setProductResults([]);
    setSelectedProduct(dev.replacementProduct || null);
    setSelectedSize(dev.replacementSize || "");
  };

  useEffect(() => {
    if (!replacingId || !productQuery.trim()) return;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/admin/produtos?q=${encodeURIComponent(productQuery)}`);
      if (res.ok) setProductResults(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [productQuery, replacingId]);

  const productSizes = (p: Product | null): string[] => {
    if (!p?.sizeStock) return [];
    try {
      return Object.keys(JSON.parse(p.sizeStock));
    } catch {
      return [];
    }
  };

  const handleSetReplacement = async () => {
    if (!replacingId || !selectedProduct) return;
    setReplacingSaving(true);
    const res = await fetch("/api/admin/devolucoes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: replacingId, replacementProductId: selectedProduct.id, replacementSize: selectedSize || null }),
    });
    if (res.ok) {
      setReplacingId(null);
      setSelectedProduct(null);
      loadDevolucoes(filter || undefined);
    }
    setReplacingSaving(false);
  };

  if (loading)
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FAF6EE" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(184,137,26,0.2)", borderTopColor: "#b8891a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );

  return (
    <div style={{ backgroundColor: "#FAF6EE", minHeight: "100vh", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Link href="/admin" style={{ color: "#b8891a", fontSize: "0.875rem", textDecoration: "none" }}>
          ← Admin
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", marginBottom: "1.5rem" }}>
          <h1 style={{ color: "#1a1510", fontSize: "2rem", fontWeight: 900, margin: 0 }}>📦 Devoluções</h1>
          <button
            onClick={() => setNovaDevWindow(true)}
            style={{ backgroundColor: "#b8891a", color: "#fff", border: "none", borderRadius: "0.75rem", padding: "0.75rem 1.5rem", fontWeight: 700, cursor: "pointer" }}
          >
            + Nova Devolução
          </button>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {["", "solicitado", "aprovado", "rejeitado", "recebido", "reembolsado"].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                backgroundColor: filter === status ? "#b8891a" : "#EDE4CC",
                color: filter === status ? "#fff" : "#6a4a10",
                border: "none",
                borderRadius: "0.5rem",
                padding: "0.5rem 1rem",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              {status ? statusConfig[status].label : "Todas"}
            </button>
          ))}
        </div>

        {/* Lista de devoluções */}
        <div style={{ backgroundColor: "#fff", borderRadius: "1rem", border: "1px solid rgba(140,100,20,0.1)", overflow: "hidden" }}>
          {data.returns.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9a8060" }}>
              Nenhuma devolução encontrada.
            </div>
          ) : (
            data.returns.map(dev => {
              const config = statusConfig[dev.status];
              return (
                <div key={dev.id} style={{ borderBottom: "1px solid rgba(140,100,20,0.1)", padding: "1.5rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
                    <div>
                      <p style={{ fontSize: "0.75rem", color: "#9a8060", fontWeight: 700 }}>PEDIDO</p>
                      <Link href={`/admin/pedidos?search=${dev.order.id}`} style={{ color: "#b8891a", fontWeight: 700, textDecoration: "none" }}>
                        {dev.order.id.slice(0, 8)}...
                      </Link>
                      <p style={{ fontSize: "0.8rem", color: "#6a4a10", margin: "0.2rem 0 0 0" }}>
                        {dev.order.user.name || dev.order.user.email}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: "0.75rem", color: "#9a8060", fontWeight: 700 }}>VALOR</p>
                      <p style={{ fontSize: "1.1rem", fontWeight: 900, color: "#c04040" }}>
                        R$ {dev.amount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: "0.75rem", color: "#9a8060", fontWeight: 700 }}>DATA</p>
                      <p style={{ fontSize: "0.9rem", color: "#1a1510" }}>
                        {new Date(dev.requestedAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div style={{ backgroundColor: config.bg, borderRadius: "0.5rem", padding: "0.5rem 0.75rem" }}>
                      <p style={{ fontSize: "0.75rem", color: "#9a8060", fontWeight: 700, margin: 0 }}>STATUS</p>
                      <p style={{ fontSize: "0.9rem", fontWeight: 700, color: config.color, margin: "0.3rem 0 0 0" }}>
                        {config.label}
                      </p>
                    </div>
                    <button
                      onClick={() => setNovaDevWindow(true)}
                      style={{ background: "none", border: "none", color: "#b8891a", fontSize: "1.2rem", cursor: "pointer" }}
                    >
                      ⋮
                    </button>
                  </div>

                  {/* Ações de status */}
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {dev.status === "solicitado" && (
                      <>
                        <button
                          onClick={() => handleStatusChange(dev.id, "aprovar")}
                          style={{ backgroundColor: "#e3f2fd", color: "#2196f3", border: "none", borderRadius: "0.4rem", padding: "0.4rem 0.8rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          ✓ Aprovar
                        </button>
                        <button
                          onClick={() => handleStatusChange(dev.id, "rejeitar")}
                          style={{ backgroundColor: "#f5f5f5", color: "#666", border: "none", borderRadius: "0.4rem", padding: "0.4rem 0.8rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          ✗ Rejeitar
                        </button>
                      </>
                    )}
                    {dev.status === "aprovado" && (
                      <button
                        onClick={() => handleStatusChange(dev.id, "receber")}
                        style={{ backgroundColor: "#e8f5e9", color: "#4caf50", border: "none", borderRadius: "0.4rem", padding: "0.4rem 0.8rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                      >
                        Marcar Recebida
                      </button>
                    )}
                    {dev.status === "recebido" && (
                      <button
                        onClick={() => handleStatusChange(dev.id, "reembolsar")}
                        style={{ backgroundColor: "#c8e6c9", color: "#2e7d32", border: "none", borderRadius: "0.4rem", padding: "0.4rem 0.8rem", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                      >
                        Marcar Reembolsado
                      </button>
                    )}
                  </div>

                  {dev.reason && (
                    <p style={{ fontSize: "0.8rem", color: "#6a4a10", marginTop: "0.75rem", fontStyle: "italic", margin: "0.75rem 0 0 0", whiteSpace: "pre-line" }}>
                      💬 {dev.reason}
                    </p>
                  )}

                  {dev.status !== "solicitado" && (
                    <p style={{ fontSize: "0.78rem", marginTop: "0.6rem", color: dev.stockRestored ? "#2e7d32" : "#9a8060" }}>
                      {dev.stockRestored ? "✅ Estoque do item devolvido já restaurado" : "⏳ Estoque será restaurado ao marcar como Recebida"}
                    </p>
                  )}

                  {/* Produto substituto */}
                  <div style={{ marginTop: "0.75rem", padding: "0.75rem", backgroundColor: "#FAF6EE", borderRadius: "0.5rem" }}>
                    {dev.replacementProduct ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                        <p style={{ fontSize: "0.8rem", color: "#1a1510", margin: 0 }}>
                          🔄 Produto de troca: <strong>{dev.replacementProduct.name}</strong>{dev.replacementSize ? ` (${dev.replacementSize})` : ""}
                        </p>
                        <button onClick={() => openReplacement(dev)} style={{ background: "none", border: "none", color: "#b8891a", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                          Trocar produto
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => openReplacement(dev)} style={{ backgroundColor: "#fff3e0", color: "#b8891a", border: "1px solid rgba(184,137,26,0.3)", borderRadius: "0.4rem", padding: "0.4rem 0.8rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
                        + Escolher produto de troca
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal nova devolução */}
      {novaDevWindow && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ backgroundColor: "#FAF6EE", borderRadius: "1.25rem", padding: "2rem", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ color: "#1a1510", fontWeight: 900, fontSize: "1.1rem", margin: 0 }}>Nova Devolução</h2>
              <button onClick={() => setNovaDevWindow(false)} style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#9a8060" }}>
                ✕
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#5a4a2a", display: "block", marginBottom: "0.4rem" }}>
                  ID do Pedido *
                </label>
                <input
                  type="text"
                  value={orderId}
                  onChange={e => setOrderId(e.target.value)}
                  placeholder="Cole o ID do pedido"
                  style={{ width: "100%", padding: "0.6rem", border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.5rem", fontFamily: "inherit" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#5a4a2a", display: "block", marginBottom: "0.4rem" }}>
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0,00"
                  step="0.01"
                  style={{ width: "100%", padding: "0.6rem", border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.5rem", fontFamily: "inherit" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#5a4a2a", display: "block", marginBottom: "0.4rem" }}>
                  Motivo
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ex: Produto com defeito"
                  rows={3}
                  style={{ width: "100%", padding: "0.6rem", border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.5rem", fontFamily: "inherit", resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => setNovaDevWindow(false)}
                  style={{ flex: 1, backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.2)", color: "#5a4a2a", fontWeight: 700, padding: "0.75rem", borderRadius: "0.75rem", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateDevolution}
                  disabled={saving || !orderId || !amount}
                  style={{ flex: 1, backgroundColor: "#b8891a", color: "#fff", fontWeight: 700, padding: "0.75rem", borderRadius: "0.75rem", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? "Salvando..." : "Criar Devolução"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal produto de troca */}
      {replacingId && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ backgroundColor: "#FAF6EE", borderRadius: "1.25rem", padding: "2rem", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ color: "#1a1510", fontWeight: 900, fontSize: "1.1rem", margin: 0 }}>🔄 Produto de troca</h2>
              <button onClick={() => setReplacingId(null)} style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#9a8060" }}>
                ✕
              </button>
            </div>
            <p style={{ color: "#5a4a2a", fontSize: "0.8rem", marginBottom: "1rem" }}>
              O estoque do produto escolhido é descontado automaticamente.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#5a4a2a", display: "block", marginBottom: "0.4rem" }}>
                  Buscar produto
                </label>
                <input
                  type="text"
                  value={selectedProduct ? selectedProduct.name : productQuery}
                  onChange={e => { setSelectedProduct(null); setSelectedSize(""); setProductQuery(e.target.value); }}
                  placeholder="Digite o nome do produto..."
                  autoFocus
                  style={{ width: "100%", padding: "0.6rem", border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.5rem", fontFamily: "inherit" }}
                />
                {!selectedProduct && productQuery.trim() && productResults.length > 0 && (
                  <div style={{ marginTop: "0.4rem", border: "1px solid rgba(140,100,20,0.15)", borderRadius: "0.5rem", overflow: "hidden", maxHeight: 180, overflowY: "auto" }}>
                    {productResults.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedProduct(p); setProductQuery(""); setSelectedSize(""); }}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "0.5rem 0.75rem", border: "none", borderBottom: "1px solid rgba(140,100,20,0.08)", backgroundColor: "#fff", cursor: "pointer", fontSize: "0.85rem" }}
                      >
                        {p.name} <span style={{ color: "#9a8060", fontSize: "0.72rem" }}>({p.stock ?? 0} un.)</span>
                        {p.active === false && (
                          <span style={{ marginLeft: "0.4rem", fontSize: "0.6rem", fontWeight: 800, backgroundColor: "#f0f0f0", color: "#888", padding: "0.1rem 0.4rem", borderRadius: 999 }}>oculto no site</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedProduct && productSizes(selectedProduct).length > 0 && (
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#5a4a2a", display: "block", marginBottom: "0.4rem" }}>
                    Tamanho *
                  </label>
                  <select
                    value={selectedSize}
                    onChange={e => setSelectedSize(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem", border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.5rem", fontFamily: "inherit" }}
                  >
                    <option value="">Selecione...</option>
                    {productSizes(selectedProduct).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => setReplacingId(null)}
                  style={{ flex: 1, backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.2)", color: "#5a4a2a", fontWeight: 700, padding: "0.75rem", borderRadius: "0.75rem", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSetReplacement}
                  disabled={replacingSaving || !selectedProduct || (productSizes(selectedProduct).length > 0 && !selectedSize)}
                  style={{ flex: 1, backgroundColor: "#b8891a", color: "#fff", fontWeight: 700, padding: "0.75rem", borderRadius: "0.75rem", border: "none", cursor: replacingSaving ? "not-allowed" : "pointer", opacity: replacingSaving || !selectedProduct ? 0.7 : 1 }}
                >
                  {replacingSaving ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
