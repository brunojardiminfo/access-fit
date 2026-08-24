"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type Customer = { id: string; name: string; email: string; phone?: string };
type Product = { id: string; name: string; price: number; stock: number; active?: boolean; sizes: string; sizeStock?: string; colors: string; images: string; isConjunto?: boolean; sellComponentsSeparately?: boolean; conjuntoItems?: Array<{ id: string; name: string; price: number }> };
type Item = { productId?: string; description: string; price: number; quantity: number; size?: string; componentName?: string; product?: Product };

const inp = {
  padding: "0.6rem 0.875rem", border: "1px solid rgba(140,100,20,0.25)",
  borderRadius: "0.625rem", fontSize: "0.875rem", backgroundColor: "#FAF6EE",
  outline: "none", width: "100%", boxSizing: "border-box" as const,
};
const label = { fontSize: "0.75rem", color: "#9a8060", fontWeight: 700, display: "block", marginBottom: "0.3rem" };

export default function NovoPedidoPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  const [items, setItems] = useState<Item[]>([{ description: "", price: 0, quantity: 1 }]);
  const [desconto, setDesconto] = useState("");
  const [descontoTipo, setDescontoTipo] = useState<"reais" | "percent">("reais");
  const [productSearch, setProductSearch] = useState<string[]>([""]);
  const [productResults, setProductResults] = useState<Product[][]>([[]]);
  const [showProductDropdown, setShowProductDropdown] = useState<boolean[]>([false]);
  const [orderStatus, setOrderStatus] = useState("delivered");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [amountPaid, setAmountPaid] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [installments, setInstallments] = useState(1);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [existingCadernoOrder, setExistingCadernoOrder] = useState<any>(null);
  const [dismissedOrderId, setDismissedOrderId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/clientes").then(r => r.json()).then(d => setCustomers(d.customers || d || [])).catch(() => {});
  }, []);

  // Prazo automático de 2 dias para Home Try-On
  useEffect(() => {
    if (orderStatus === "try-on") {
      const d = new Date(date);
      d.setDate(d.getDate() + 2);
      setDueDate(d.toISOString().slice(0, 10));
    } else {
      setDueDate("");
    }
  }, [orderStatus, date]);

  useEffect(() => {
    if (!selectedCustomer || paymentMethod !== "caderno" || isNewCustomer) {
      setExistingCadernoOrder(null);
      return;
    }
    fetch(`/api/admin/pedidos?userId=${selectedCustomer.id}&date=${date}&paymentMethod=caderno`)
      .then(r => r.json())
      .then(orders => {
        const order = orders?.[0] || null;
        if (order && order.id !== dismissedOrderId) setExistingCadernoOrder(order);
        else setExistingCadernoOrder(null);
      })
      .catch(() => {});
  }, [selectedCustomer, paymentMethod, date, isNewCustomer, dismissedOrderId]);

  useEffect(() => {
    if (!search) { setFiltered([]); return; }
    setFiltered(customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8));
  }, [search, customers]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const descontoBruto = parseFloat(desconto.replace(",", ".")) || 0;
  // Percentual vira reais aqui: o pedido sempre guarda o valor do desconto
  const descontoValor = Math.min(
    descontoTipo === "percent" ? (subtotal * descontoBruto) / 100 : descontoBruto,
    subtotal
  );
  const totalFinal = Math.round((subtotal - descontoValor) * 100) / 100;
  const paid = parseFloat(amountPaid) || 0;
  const saldo = paymentStatus !== "paid" ? totalFinal - paid : 0;

  const addItem = () => {
    setItems(p => [...p, { description: "", price: 0, quantity: 1 }]);
    setProductSearch(p => [...p, ""]);
    setProductResults(p => [...p, []]);
    setShowProductDropdown(p => [...p, false]);
  };
  const removeItem = (i: number) => {
    setItems(p => p.filter((_, idx) => idx !== i));
    setProductSearch(p => p.filter((_, idx) => idx !== i));
    setProductResults(p => p.filter((_, idx) => idx !== i));
    setShowProductDropdown(p => p.filter((_, idx) => idx !== i));
  };
  const updateItem = (i: number, field: keyof Item, value: any) =>
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: value } : it));

  const searchProducts = async (i: number, q: string) => {
    setProductSearch(p => p.map((v, idx) => idx === i ? q : v));
    setShowProductDropdown(p => p.map((v, idx) => idx === i ? true : v));
    if (!q.trim()) { setProductResults(p => p.map((v, idx) => idx === i ? [] : v)); return; }
    const res = await fetch(`/api/admin/produtos?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setProductResults(p => p.map((v, idx) => idx === i ? data : v));
  };

  const selectProduct = (i: number, product: Product) => {
    const sizes = JSON.parse(product.sizes || "[]") as string[];
    // Só preenche o tamanho sozinho quando não há escolha real (0 ou 1 opção) —
    // com mais de um tamanho, obriga o admin a escolher pra dar baixa no estoque certo
    setItems(p => p.map((it, idx) => idx === i ? {
      ...it, productId: product.id, description: product.name,
      price: product.price, size: sizes.length === 1 ? sizes[0] : undefined, componentName: undefined, product,
    } : it));
    setProductSearch(p => p.map((v, idx) => idx === i ? product.name : v));
    setShowProductDropdown(p => p.map((v, idx) => idx === i ? false : v));
    setProductResults(p => p.map((v, idx) => idx === i ? [] : v));
  };

  const handleAddToExisting = async () => {
    setError("");
    if (items.some(i => !i.description || i.price <= 0)) { setError("Preencha descrição e valor de todos os itens."); return; }
    if (items.some(i => (JSON.parse(i.product?.sizes || "[]") as string[]).length > 0 && !i.size)) { setError("Selecione o tamanho de todos os itens."); return; }
    setSaving(true);
    const res = await fetch(`/api/admin/pedidos/${existingCadernoOrder.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addItems: items }),
    });
    setSaving(false);
    if (res.ok) router.push("/admin/pedidos");
    else { const d = await res.json(); setError(d.error || "Erro ao adicionar itens."); }
  };

  const handleSave = async () => {
    setError("");
    if (!selectedCustomer && !newCustomer.name) { setError("Selecione ou cadastre um cliente."); return; }
    if (items.some(i => !i.description || i.price <= 0)) { setError("Preencha descrição e valor de todos os itens."); return; }
    if (items.some(i => (JSON.parse(i.product?.sizes || "[]") as string[]).length > 0 && !i.size)) { setError("Selecione o tamanho de todos os itens."); return; }

    setSaving(true);
    const res = await fetch("/api/admin/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedCustomer?.id,
        newCustomer: isNewCustomer ? newCustomer : null,
        items, status: orderStatus,
        paymentMethod: orderStatus === "try-on" ? "pix" : paymentMethod,
        paymentStatus: orderStatus === "try-on" ? "pending" : paymentStatus,
        amountPaid: orderStatus === "try-on" ? 0 : (paymentStatus === "paid" ? totalFinal : paid),
        discount: descontoValor,
        notes, createdAt: date, dueDate: dueDate || null, installments,
      }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/admin/pedidos");
    } else {
      try {
        const d = await res.json();
        setError(d.error || "Erro ao salvar pedido.");
      } catch {
        setError(`Erro ${res.status} ao salvar pedido. Tente novamente.`);
      }
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>
      <a href="/admin/pedidos" style={{ color: "#b8891a", fontSize: "0.875rem", textDecoration: "none" }}>← Pedidos</a>
      <h1 style={{ color: "#1a1510", fontSize: "1.75rem", fontWeight: 900, margin: "0.3rem 0 1.5rem" }}>Novo Pedido</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Cliente */}
        <div style={{ backgroundColor: "#fff", borderRadius: "1rem", padding: "1.25rem", border: "1px solid rgba(140,100,20,0.1)" }}>
          <p style={{ fontWeight: 800, color: "#1a1510", marginBottom: "1rem" }}>👤 Cliente</p>

          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <button onClick={() => { setIsNewCustomer(false); setSelectedCustomer(null); setSearch(""); }}
              style={{ padding: "0.4rem 0.875rem", borderRadius: "999px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", backgroundColor: !isNewCustomer ? "#b8891a" : "#EDE4CC", color: !isNewCustomer ? "#fff" : "#6a4a10" }}>
              Cliente existente
            </button>
            <button onClick={() => { setIsNewCustomer(true); setSelectedCustomer(null); }}
              style={{ padding: "0.4rem 0.875rem", borderRadius: "999px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", backgroundColor: isNewCustomer ? "#b8891a" : "#EDE4CC", color: isNewCustomer ? "#fff" : "#6a4a10" }}>
              + Novo cliente
            </button>
          </div>

          {!isNewCustomer ? (
            <div style={{ position: "relative" }} ref={dropdownRef}>
              {selectedCustomer ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.875rem", backgroundColor: "#e8f8e8", borderRadius: "0.625rem", border: "1px solid rgba(26,138,42,0.2)" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#1a1510" }}>{selectedCustomer.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "#9a8060" }}>{selectedCustomer.email}</div>
                  </div>
                  <button onClick={() => { setSelectedCustomer(null); setSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9a8060", fontSize: "1rem" }}>✕</button>
                </div>
              ) : (
                <>
                  <input style={inp} placeholder="Buscar cliente..." value={search}
                    onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)} />
                  {showDropdown && filtered.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.625rem", zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginTop: 2 }}>
                      {filtered.map(c => (
                        <div key={c.id} onClick={() => { setSelectedCustomer(c); setSearch(c.name); setShowDropdown(false); }}
                          style={{ padding: "0.6rem 0.875rem", cursor: "pointer", borderBottom: "1px solid rgba(140,100,20,0.06)" }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#FAF6EE")}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1a1510" }}>{c.name}</div>
                          <div style={{ fontSize: "0.7rem", color: "#9a8060" }}>{c.email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={label}>Nome *</label>
                <input style={inp} placeholder="Nome completo" value={newCustomer.name} onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={label}>Telefone</label>
                <input style={inp} placeholder="(47) 9..." value={newCustomer.phone} onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
          )}
        </div>

        {/* Aviso caderno */}
        {existingCadernoOrder && (
          <div style={{ backgroundColor: "#fff8e1", border: "1px solid rgba(184,137,26,0.35)", borderRadius: "1rem", padding: "1.25rem" }}>
            <p style={{ fontWeight: 800, color: "#5a4a2a", marginBottom: "0.4rem" }}>📒 Pedido no caderno encontrado</p>
            <p style={{ fontSize: "0.875rem", color: "#7a5a10", marginBottom: "0.875rem" }}>
              <strong>{selectedCustomer?.name}</strong> já tem {existingCadernoOrder.items.length} item(s) no caderno nesta data — total atual:{" "}
              <strong>{existingCadernoOrder.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button onClick={handleAddToExisting} disabled={saving}
                style={{ backgroundColor: "#b8891a", color: "#fff", border: "none", borderRadius: "0.625rem", padding: "0.5rem 1.1rem", fontWeight: 700, fontSize: "0.875rem", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Adicionando..." : "+ Adicionar ao pedido existente"}
              </button>
              <button onClick={() => setDismissedOrderId(existingCadernoOrder.id)}
                style={{ backgroundColor: "#FAF6EE", border: "1px solid rgba(140,100,20,0.2)", color: "#9a8060", borderRadius: "0.625rem", padding: "0.5rem 1.1rem", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}>
                Criar pedido separado
              </button>
            </div>
          </div>
        )}

        {/* Itens */}
        <div style={{ backgroundColor: "#fff", borderRadius: "1rem", padding: "1.25rem", border: "1px solid rgba(140,100,20,0.1)" }}>
          <p style={{ fontWeight: 800, color: "#1a1510", marginBottom: "1rem" }}>🛍️ Itens</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {items.map((item, i) => {
              const sizes = item.productId
                ? JSON.parse(items[i] && productResults[i]?.find(p => p.id === item.productId)?.sizes || "[]") as string[]
                : [];
              return (
                <div key={i} style={{ backgroundColor: "#FAF6EE", borderRadius: "0.625rem", padding: "0.75rem", position: "relative" }}>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "none", border: "none", cursor: "pointer", color: "#c04040", fontSize: "0.875rem", padding: 0 }}>✕</button>
                  )}
                  {/* Busca de produto */}
                  <div style={{ position: "relative", marginBottom: "0.5rem" }}>
                    <input style={inp} placeholder="🔍 Buscar produto..." value={productSearch[i] || ""}
                      onChange={e => searchProducts(i, e.target.value)}
                      onFocus={() => setShowProductDropdown(p => p.map((v, idx) => idx === i ? true : v))} />
                    {showProductDropdown[i] && productResults[i]?.length > 0 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.625rem", zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", marginTop: 2, overflow: "hidden" }}>
                        {productResults[i].map(p => {
                          const imgs = JSON.parse(p.images || "[]") as string[];
                          const szs = JSON.parse(p.sizes || "[]") as string[];
                          return (
                            <div key={p.id} onClick={() => selectProduct(i, p)}
                              style={{ padding: "0.625rem 0.875rem", cursor: "pointer", borderBottom: "1px solid rgba(140,100,20,0.06)", display: "flex", alignItems: "center", gap: "0.75rem" }}
                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#FAF6EE")}
                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}>
                              {/* Foto */}
                              <div style={{ width: 44, height: 44, borderRadius: "0.4rem", backgroundColor: "#f0e8d0", flexShrink: 0, overflow: "hidden" }}>
                                {imgs[0] && <img src={imgs[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                              </div>
                              {/* Info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1a1510" }}>
                                  {p.name}
                                  {p.active === false && (
                                    <span style={{ marginLeft: "0.4rem", fontSize: "0.6rem", fontWeight: 800, backgroundColor: "#f0f0f0", color: "#888", padding: "0.1rem 0.4rem", borderRadius: 999 }}>oculto no site</span>
                                  )}
                                </div>
                                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.2rem" }}>
                                  {szs.length > 0
                                    ? szs.map(s => {
                                        const sst = JSON.parse(p.sizeStock || "{}") as Record<string, number>;
                                        const qty = sst[s];
                                        return (
                                          <span key={s} style={{ fontSize: "0.65rem", backgroundColor: qty === 0 ? "#fee8e8" : "#EDE4CC", color: qty === 0 ? "#c04040" : "#6a4a10", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: 999, textDecoration: qty === 0 ? "line-through" : "none" }}>{s}{qty !== undefined ? ` (${qty})` : ""}</span>
                                        );
                                      })
                                    : <span style={{ fontSize: "0.72rem", color: "#9a8060" }}>Estoque: {p.stock} un</span>
                                  }
                                  {szs.length > 0 && <span style={{ fontSize: "0.72rem", color: "#9a8060" }}>· {p.stock} un</span>}
                                  {(() => { const cls = JSON.parse(p.colors || "[]") as string[]; return cls.length > 0 ? cls.map(c => <span key={c} style={{ fontSize: "0.65rem", backgroundColor: "#e8f0fe", color: "#3a5a9a", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: 999 }}>{c}</span>) : null; })()}
                                </div>
                              </div>
                              {/* Preço */}
                              <div style={{ fontWeight: 700, color: "#b8891a", fontSize: "0.875rem", flexShrink: 0 }}>
                                {p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Seleção de Componente (se for Conjunto) */}
                  {item.product?.isConjunto && item.product?.sellComponentsSeparately && item.product?.conjuntoItems && item.product?.conjuntoItems.length > 0 && (
                    <select style={inp} value={item.componentName || ""}
                      onChange={e => {
                        const componentId = e.target.value;
                        const product = item.product;

                        if (componentId && product) {
                          if (componentId === "completo") {
                            updateItem(i, "price", product.price);
                            updateItem(i, "componentName", undefined);
                            updateItem(i, "description", product.name);
                          } else {
                            const component = product.conjuntoItems?.find(c => c.id === componentId);
                            if (component) {
                              updateItem(i, "price", component.price);
                              updateItem(i, "componentName", component.name);
                              updateItem(i, "description", `${product.name} - ${component.name}`);
                            }
                          }
                        }
                      }}>
                      <option value="">Selecione o componente</option>
                      <option value="completo">Conjunto Completo - R$ {item.product?.price?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</option>
                      {item.product?.conjuntoItems?.map(comp => (
                        <option key={comp.id} value={comp.id}>{comp.name} - R$ {comp.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</option>
                      ))}
                    </select>
                  )}

                  {/* Tamanho, preço e quantidade */}
                  <div style={{ display: "grid", gridTemplateColumns: item.productId && JSON.parse(item.product?.sizes || "[]").length > 0 ? "1fr 110px 70px" : "1fr 70px", gap: "0.5rem" }}>
                    <input style={inp} type="number" placeholder="R$ preço" min="0" step="0.01" value={item.price || ""}
                      onChange={e => updateItem(i, "price", parseFloat(e.target.value) || 0)} />
                    {item.productId && JSON.parse(item.product?.sizes || "[]").length > 0 && (
                      <select style={{ ...inp, ...(item.size ? {} : { borderColor: "#c04040", color: "#c04040" }) }} value={item.size || ""}
                        onChange={e => updateItem(i, "size", e.target.value)}>
                        <option value="" disabled>Selecione o tamanho</option>
                        {(JSON.parse(item.product?.sizes || productResults[i]?.find(p => p.id === item.productId)?.sizes || "[]") as string[]).map(s => {
                          const sst = JSON.parse(item.product?.sizeStock || productResults[i]?.find(p => p.id === item.productId)?.sizeStock || "{}") as Record<string, number>;
                          const qty = sst[s];
                          return <option key={s} value={s}>{s}{qty !== undefined ? ` (${qty} un)` : ""}</option>;
                        })}
                      </select>
                    )}
                    <input style={inp} type="number" placeholder="Qtd" min="1" value={item.quantity}
                      onChange={e => updateItem(i, "quantity", parseInt(e.target.value) || 1)} />
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={addItem} style={{ marginTop: "0.75rem", padding: "0.4rem 0.875rem", backgroundColor: "#EDE4CC", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, color: "#6a4a10" }}>
            + Adicionar item
          </button>
          <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "#9a8060", fontWeight: 700 }}>Desconto</span>
            <input value={desconto} onChange={e => setDesconto(e.target.value)} placeholder="0,00" inputMode="decimal"
              style={{ ...inp, width: 90, padding: "0.35rem 0.6rem", fontSize: "0.85rem" }} />
            <div style={{ display: "flex", gap: "2px" }}>
              {(["reais", "percent"] as const).map(t => (
                <button key={t} type="button" onClick={() => setDescontoTipo(t)}
                  style={{ fontSize: "0.75rem", fontWeight: 800, padding: "0.35rem 0.6rem", border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.4rem", cursor: "pointer", backgroundColor: descontoTipo === t ? "#b8891a" : "#fff", color: descontoTipo === t ? "#fff" : "#9a8060" }}>
                  {t === "reais" ? "R$" : "%"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: "0.5rem", textAlign: "right", fontSize: "0.85rem", color: "#9a8060" }}>
            Subtotal: {subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            {descontoValor > 0 && (
              <span style={{ color: "#1a8a2a", fontWeight: 700 }}>
                {"  −  "}{descontoValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            )}
          </div>
          <div style={{ marginTop: "0.2rem", textAlign: "right", fontWeight: 900, color: "#b8891a", fontSize: "1.1rem" }}>
            Total: {totalFinal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </div>

        {/* Pagamento */}
        <div style={{ backgroundColor: "#fff", borderRadius: "1rem", padding: "1.25rem", border: "1px solid rgba(140,100,20,0.1)" }}>
          <p style={{ fontWeight: 800, color: "#1a1510", marginBottom: "1rem" }}>💳 Pagamento</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>

            {/* Tipo de pedido */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={label}>Tipo de pedido</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {[
                  { value: "try-on", label: "👗 Home Try-On", desc: "Saiu para experimentar" },
                  { value: "delivered", label: "✅ Venda", desc: "Já foi vendido" },
                ].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setOrderStatus(opt.value)}
                    style={{ flex: 1, padding: "0.6rem 0.875rem", borderRadius: "0.625rem", border: `2px solid ${orderStatus === opt.value ? "#b8891a" : "rgba(140,100,20,0.2)"}`, backgroundColor: orderStatus === opt.value ? "#fff8e8" : "#FAF6EE", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.875rem", color: orderStatus === opt.value ? "#b8891a" : "#5a4a2a" }}>{opt.label}</div>
                    <div style={{ fontSize: "0.72rem", color: "#9a8060", marginTop: "0.1rem" }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {orderStatus === "try-on" ? (
              /* Campos Home Try-On */
              <>
                <div>
                  <label style={label}>Data de envio</label>
                  <input style={inp} type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <label style={label}>Prazo de retorno (opcional)</label>
                  <input style={inp} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </>
            ) : (
              /* Campos Venda */
              <>
                <div>
                  <label style={label}>Forma de Pagamento</label>
                  <select style={inp} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="pix">Pix</option>
                    <option value="cartao">Cartão</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="link">Link de Pagamento</option>
                    <option value="caderno">Caderno</option>
                  </select>
                </div>
                <div>
                  <label style={label}>Status</label>
                  <select style={inp} value={paymentStatus} onChange={e => { setPaymentStatus(e.target.value); if (e.target.value === "paid") setAmountPaid(""); }}>
                    <option value="paid">Pago</option>
                    <option value="partial">Parcial</option>
                    <option value="pending">Pendente</option>
                  </select>
                </div>
                {paymentMethod === "link" && paymentStatus !== "paid" && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={label}>💰 Valor Recebido (com desconto da operadora)</label>
                    <input style={inp} type="number" min="0" step="0.01" placeholder={`Ex: ${totalFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} value={amountPaid}
                      onChange={e => setAmountPaid(e.target.value)} />
                  </div>
                )}
                {paymentStatus !== "paid" && paymentMethod !== "link" && (
                  <>
                    <div>
                      <label style={label}>Valor já pago (R$)</label>
                      <input style={inp} type="number" min="0" step="0.01" placeholder="0,00" value={amountPaid}
                        onChange={e => setAmountPaid(e.target.value)} />
                    </div>
                    <div>
                      <label style={label}>Parcelas</label>
                      <select style={inp} value={installments} onChange={e => setInstallments(Number(e.target.value))}>
                        {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}x</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={label}>Vencimento</label>
                      <input style={inp} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                    </div>
                  </>
                )}
                <div>
                  <label style={label}>Data da Venda</label>
                  <input style={inp} type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
              </>
            )}
          </div>
          {orderStatus === "delivered" && paymentStatus !== "paid" && totalFinal > 0 && (
            <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.875rem", backgroundColor: "#fff8e1", borderRadius: "0.625rem", display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
              <span style={{ color: "#5a4a2a" }}>Saldo em aberto:</span>
              <span style={{ fontWeight: 900, color: "#b8891a" }}>{saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
            </div>
          )}
        </div>

        {/* Observações */}
        <div style={{ backgroundColor: "#fff", borderRadius: "1rem", padding: "1.25rem", border: "1px solid rgba(140,100,20,0.1)" }}>
          <label style={{ ...label, marginBottom: "0.5rem" }}>📝 Observações (opcional)</label>
          <textarea style={{ ...inp, resize: "vertical", minHeight: 70 }} placeholder="Ex: vai pagar em 2x, entregue no trabalho..."
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {error && (
          <div style={{ backgroundColor: "#fee8e8", border: "1px solid rgba(192,64,64,0.2)", borderRadius: "0.625rem", padding: "0.75rem 1rem", color: "#c04040", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        <button onClick={handleSave} disabled={saving}
          style={{ backgroundColor: saving ? "#d4b870" : "#b8891a", color: "#fff", border: "none", borderRadius: "0.875rem", padding: "0.875rem", fontSize: "1rem", fontWeight: 900, cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 2px 8px rgba(184,137,26,0.3)" }}>
          {saving ? "Salvando..." : "✓ Registrar Pedido"}
        </button>
      </div>
    </div>
  );
}
