"use client";

import { useState } from "react";
import { useCart } from "@/store/cart";
import { X, Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { calcularSacola, descontoDoCupom, CAMPANHA } from "@/lib/campanha";

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, total, couponCode, couponDiscount, setCoupon, clearCoupon } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  if (!isOpen) return null;

  const subtotal = total();
  const sacola = calcularSacola(items);
  // Cupom não vale em peça de SALE: incide só sobre o que está a preço cheio
  const descontoCupom = descontoDoCupom(sacola.baseCupom, couponDiscount || 0);
  const cupomSemEfeito = !!couponDiscount && descontoCupom <= 0;
  // Campanha e cupom não somam: fica a melhor condição para a cliente
  const campanhaGanha = sacola.desconto > descontoCupom + 0.001;
  const desconto = Math.max(sacola.desconto, descontoCupom);
  const totalFinal = subtotal - desconto;

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    setCouponError("");
    const res = await fetch(`/api/cupom?code=${encodeURIComponent(couponInput.trim())}`);
    setCheckingCoupon(false);
    if (res.ok) {
      const data = await res.json();
      setCoupon(data.code, data.discount);
    } else {
      const data = await res.json();
      setCouponError(data.error || "Cupom inválido");
    }
  };

  const removeCoupon = () => {
    setCouponInput("");
    clearCoupon();
    setCouponError("");
  };

  return (
    <>
      <div onClick={closeCart} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(3px)", zIndex: 40 }} />
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: "100%", maxWidth: 380, backgroundColor: "#FAF6EE", zIndex: 50, display: "flex", flexDirection: "column", borderLeft: "1px solid rgba(140,100,20,0.15)", boxShadow: "-8px 0 40px rgba(0,0,0,0.1)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid rgba(140,100,20,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <ShoppingBag size={20} color="#b8891a" />
            <span style={{ fontWeight: 900, fontSize: "1.1rem", color: "#1a1510" }}>Meu Carrinho</span>
            {items.length > 0 && (
              <span style={{ backgroundColor: "#b8891a", color: "#fff", fontSize: "0.7rem", fontWeight: 700, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{items.length}</span>
            )}
          </div>
          <button onClick={closeCart} style={{ background: "none", border: "none", cursor: "pointer", color: "#9a8060", padding: "0.25rem" }}>
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem" }}>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <ShoppingBag size={40} color="#d4c090" style={{ margin: "0 auto 1rem" }} />
              <p style={{ color: "#9a8060", fontWeight: 600 }}>Seu carrinho está vazio</p>
            </div>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {items.map(item => (
                <li key={`${item.productId}-${item.size}-${item.color}`} style={{ display: "flex", gap: "0.875rem", backgroundColor: "#fff", borderRadius: "0.875rem", padding: "0.875rem", border: "1px solid rgba(140,100,20,0.08)" }}>
                  <div style={{ width: 60, height: 60, borderRadius: "0.625rem", overflow: "hidden", backgroundColor: "#F0E8D0", flexShrink: 0 }}>
                    {item.image && <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.875rem", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.name}</p>
                    {(item.size !== "Único" || (item.color && item.color !== "Padrão")) && (
                      <p style={{ color: "#9a8060", fontSize: "0.75rem" }}>
                        {[item.color && item.color !== "Padrão" ? item.color : null, item.size !== "Único" ? item.size : null].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid rgba(140,100,20,0.2)", backgroundColor: "#FAF6EE", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Minus size={12} color="#7a6030" />
                        </button>
                        <span style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.875rem", minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid rgba(140,100,20,0.2)", backgroundColor: "#FAF6EE", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Plus size={12} color="#7a6030" />
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 900, color: "#b8891a" }}>{formatCurrency(item.price * item.quantity)}</span>
                        <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c04040", padding: "0.25rem" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(140,100,20,0.12)", padding: "1.25rem", backgroundColor: "#F0E8D0" }}>

            {/* Cupom */}
            {couponDiscount ? (
              <div style={{ backgroundColor: cupomSemEfeito ? "#fff8e1" : "#e8f8e8", border: `1px solid ${cupomSemEfeito ? "rgba(184,137,26,0.3)" : "rgba(26,138,42,0.2)"}`, borderRadius: "0.625rem", padding: "0.5rem 0.75rem", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: cupomSemEfeito ? "#b8891a" : "#1a8a2a" }}>🎟️ {couponCode.toUpperCase()} — -{couponDiscount}%</span>
                  <button onClick={removeCoupon} style={{ background: "none", border: "none", cursor: "pointer", color: "#9a8060", fontSize: "0.8rem" }}>✕</button>
                </div>
                {cupomSemEfeito ? (
                  <p style={{ fontSize: "0.72rem", color: "#7a6030", marginTop: "0.3rem", lineHeight: 1.4 }}>
                    Cupom não vale para peças em SALE — elas já estão com desconto.
                  </p>
                ) : sacola.baseCupom < subtotal - 0.01 && (
                  <p style={{ fontSize: "0.72rem", color: "#7a6030", marginTop: "0.3rem", lineHeight: 1.4 }}>
                    Aplicado só nas peças fora do SALE.
                  </p>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    placeholder="Cupom de desconto"
                    value={couponInput}
                    onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                    onKeyDown={e => e.key === "Enter" && applyCoupon()}
                    style={{ flex: 1, padding: "0.5rem 0.75rem", border: "1px solid rgba(140,100,20,0.25)", borderRadius: "0.5rem", fontSize: "0.8rem", backgroundColor: "#FAF6EE", outline: "none" }}
                  />
                  <button onClick={applyCoupon} disabled={checkingCoupon || !couponInput.trim()}
                    style={{ padding: "0.5rem 0.875rem", backgroundColor: "#1a1510", color: "#FAF6EE", border: "none", borderRadius: "0.5rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                    {checkingCoupon ? "..." : "Aplicar"}
                  </button>
                </div>
                {couponError && <p style={{ color: "#c04040", fontSize: "0.72rem", marginTop: "0.3rem" }}>{couponError}</p>}
              </div>
            )}

            {/* Totais */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
              <span style={{ color: "#7a6030", fontSize: "0.875rem" }}>Subtotal</span>
              <span style={{ color: "#5a4a2a", fontWeight: 700 }}>{formatCurrency(subtotal)}</span>
            </div>
            {desconto > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                <span style={{ color: "#1a8a2a", fontSize: "0.875rem" }}>
                  {campanhaGanha ? `${CAMPANHA.nome} (${sacola.progressivo}%)` : `Desconto (${couponDiscount}%)`}
                </span>
                <span style={{ color: "#1a8a2a", fontWeight: 700 }}>-{formatCurrency(desconto)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <span style={{ color: "#7a6030", fontWeight: 700 }}>Total</span>
              <span style={{ color: "#b8891a", fontWeight: 900, fontSize: "1.15rem" }}>{formatCurrency(totalFinal)}</span>
            </div>
            <p style={{ color: "#9a8060", fontSize: "0.75rem", marginBottom: "1rem" }}>Frete calculado no checkout</p>

            <Link href="/checkout" onClick={closeCart} style={{ display: "block", width: "100%", backgroundColor: "#b8891a", color: "#fff", textAlign: "center", fontWeight: 900, padding: "0.875rem", borderRadius: "0.75rem", textDecoration: "none", fontSize: "0.95rem", boxShadow: "0 4px 14px rgba(140,100,20,0.25)" }}>
              Finalizar Compra
            </Link>
            <button onClick={closeCart} style={{ display: "block", width: "100%", textAlign: "center", color: "#9a8060", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", marginTop: "0.75rem", padding: "0.4rem" }}>
              Continuar comprando
            </button>
          </div>
        )}
      </div>
    </>
  );
}
