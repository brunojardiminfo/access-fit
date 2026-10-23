"use client";

import { useState } from "react";
import { useCart } from "@/store/cart";
import { X, Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { calcularSacola, descontoDoCupom, CAMPANHA, faseCampanha, tetoDaCampanha } from "@/lib/campanha";

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
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: "100%", maxWidth: 380, backgroundColor: "var(--bg)", zIndex: 50, display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border)", boxShadow: "-8px 0 40px rgba(0,0,0,0.1)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <ShoppingBag size={20} style={{ color: "var(--gold)" }} />
            <span style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--text-main)" }}>Meu Carrinho</span>
            {items.length > 0 && (
              <span style={{ backgroundColor: "var(--gold)", color: "#16110b", fontSize: "0.7rem", fontWeight: 700, width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{items.length}</span>
            )}
          </div>
          <button onClick={closeCart} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0.25rem" }}>
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem" }}>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <ShoppingBag size={40} color="#d4c090" style={{ margin: "0 auto 1rem" }} />
              <p style={{ color: "var(--text-muted)", fontWeight: 600 }}>Seu carrinho está vazio</p>
            </div>
          ) : (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {items.map(item => (
                <li key={`${item.productId}-${item.size}-${item.color}`} style={{ display: "flex", gap: "0.875rem", backgroundColor: "var(--bg-card)", borderRadius: "0.875rem", padding: "0.875rem", border: "1px solid var(--border)" }}>
                  <div style={{ width: 60, height: 60, borderRadius: "0.625rem", overflow: "hidden", backgroundColor: "var(--bg-soft)", flexShrink: 0 }}>
                    {item.image && <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.875rem", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.name}</p>
                    {(item.size !== "Único" || (item.color && item.color !== "Padrão")) && (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        {[item.color && item.color !== "Padrão" ? item.color : null, item.size !== "Único" ? item.size : null].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text-sub)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Minus size={12} />
                        </button>
                        <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.875rem", minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ width: 24, height: 24, borderRadius: "50%", border: "1px solid var(--border)", backgroundColor: "var(--bg)", color: "var(--text-sub)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Plus size={12} />
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 900, color: "var(--gold)" }}>{formatCurrency(item.price * item.quantity)}</span>
                        <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ff8a7a", padding: "0.25rem" }}>
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
          <div style={{ borderTop: "1px solid var(--border)", padding: "1.25rem", backgroundColor: "var(--bg-soft)" }}>

            {/* Cupom */}
            {couponDiscount ? (
              <div style={{ backgroundColor: cupomSemEfeito ? "rgba(216,166,44,0.16)" : "rgba(95,211,122,0.14)", border: `1px solid ${cupomSemEfeito ? "rgba(184,137,26,0.3)" : "rgba(26,138,42,0.2)"}`, borderRadius: "0.625rem", padding: "0.5rem 0.75rem", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: cupomSemEfeito ? "var(--gold)" : "#5fd37a" }}>🎟️ {couponCode.toUpperCase()} — -{couponDiscount}%</span>
                  <button onClick={removeCoupon} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.8rem" }}>✕</button>
                </div>
                {cupomSemEfeito ? (
                  <p style={{ fontSize: "0.72rem", color: "var(--text-sub)", marginTop: "0.3rem", lineHeight: 1.4 }}>
                    Cupom não vale para peças em SALE — elas já estão com desconto.
                  </p>
                ) : sacola.baseCupom < subtotal - 0.01 && (
                  <p style={{ fontSize: "0.72rem", color: "var(--text-sub)", marginTop: "0.3rem", lineHeight: 1.4 }}>
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
                    style={{ flex: 1, padding: "0.5rem 0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: "0.8rem", backgroundColor: "var(--bg)", outline: "none" }}
                  />
                  <button onClick={applyCoupon} disabled={checkingCoupon || !couponInput.trim()}
                    style={{ padding: "0.5rem 0.875rem", backgroundColor: "var(--gold)", color: "#16110b", border: "none", borderRadius: "0.5rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                    {checkingCoupon ? "..." : "Aplicar"}
                  </button>
                </div>
                {couponError && <p style={{ color: "#ff8a7a", fontSize: "0.72rem", marginTop: "0.3rem" }}>{couponError}</p>}
              </div>
            )}

            {/* Um piso em reais só puxa a segunda peça se a cliente souber o
                quanto falta. Sem esta linha ele vira só um desconto que não
                saiu, sem explicação. */}
            {faseCampanha() === "ativa" && sacola.faltaParaOMinimo > 0 && (
              <div style={{ backgroundColor: "rgba(216,166,44,0.12)", border: "1px solid var(--border-gold)", borderRadius: "0.625rem", padding: "0.5rem 0.75rem", marginBottom: "0.75rem" }}>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--gold-light)" }}>
                  Faltam {formatCurrency(sacola.faltaParaOMinimo)} para {tetoDaCampanha()}% de desconto
                </p>
              </div>
            )}

            {/* Totais */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
              <span style={{ color: "var(--text-sub)", fontSize: "0.875rem" }}>Subtotal</span>
              <span style={{ color: "var(--text-sub)", fontWeight: 700 }}>{formatCurrency(subtotal)}</span>
            </div>
            {desconto > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                <span style={{ color: "#5fd37a", fontSize: "0.875rem" }}>
                  {campanhaGanha ? `${CAMPANHA.nome} (${sacola.progressivo}%)` : `Desconto (${couponDiscount}%)`}
                </span>
                <span style={{ color: "#5fd37a", fontWeight: 700 }}>-{formatCurrency(desconto)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <span style={{ color: "var(--text-sub)", fontWeight: 700 }}>Total</span>
              <span style={{ color: "var(--gold)", fontWeight: 900, fontSize: "1.15rem" }}>{formatCurrency(totalFinal)}</span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "1rem" }}>Frete calculado no checkout</p>

            <Link href="/checkout" onClick={closeCart} style={{ display: "block", width: "100%", backgroundColor: "var(--gold)", color: "#16110b", textAlign: "center", fontWeight: 900, padding: "0.875rem", borderRadius: "0.75rem", textDecoration: "none", fontSize: "0.95rem", boxShadow: "0 4px 14px var(--border)" }}>
              Finalizar Compra
            </Link>
            <button onClick={closeCart} style={{ display: "block", width: "100%", textAlign: "center", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", marginTop: "0.75rem", padding: "0.4rem" }}>
              Continuar comprando
            </button>
          </div>
        )}
      </div>
    </>
  );
}
