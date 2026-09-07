"use client";

import Link from "next/link";
import { formatCurrency, parseJson } from "@/lib/utils";
import { getSaleInfo } from "@/lib/saleHelper";
import { seloDeFrescor, TEXTO_SELO } from "@/lib/selos";
import { bolinhasDeCor } from "@/lib/cores";
import { useCart } from "@/store/cart";

type Product = {
  id: string; name: string; slug: string; price: number;
  compareAt: number | null; images: string; sizes: string;
  colors: string; stock: number; createdAt: string | Date;
  restockedAt?: string | Date | null;
  onSale?: boolean; saleDiscount?: number | null;
  category: { name: string };
};

export default function ProductCard({ product }: { product: Product }) {
  const { addItem, openCart } = useCart();
  const images = parseJson<string[]>(product.images, []);
  const sizes  = parseJson<string[]>(product.sizes, []);
  const discount = product.compareAt ? Math.round((1 - product.price / product.compareAt) * 100) : null;
  const createdDate = typeof product.createdAt === "string" ? new Date(product.createdAt) : product.createdAt;
  const selo = seloDeFrescor(product);
  const cores = bolinhasDeCor(parseJson<string[]>(product.colors, []));
  const saleInfo = getSaleInfo({
    price: product.price,
    createdAt: createdDate,
    onSale: product.onSale,
    saleDiscount: product.saleDiscount,
  });
  const finalPrice = saleInfo ? saleInfo.salePrice : product.price;
  const outOfStock = product.stock === 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (outOfStock) return;
    window.location.href = `/produtos/${product.slug}`;
  };

  return (
    <Link href={`/produtos/${product.slug}`} style={{ textDecoration: "none", display: "block" }}>
      <div style={{ borderRadius: "1rem", overflow: "hidden", backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "transform 0.2s, box-shadow 0.2s" }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"; }}>

        {/* Foto */}
        <div style={{ position: "relative", aspectRatio: "3/4", backgroundColor: "#F0E8D0", overflow: "hidden" }}>
          {images[0] ? (
            <img src={images[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="20" fill="rgba(184,137,26,0.08)"/><path d="M14 28C14 21 17 15 20 15C23 15 26 21 26 28" stroke="#b8891a" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/><circle cx="20" cy="11" r="3" stroke="#b8891a" strokeWidth="1.5" opacity="0.5"/></svg>
              <span style={{ color: "#b8891a", fontSize: "0.7rem", fontWeight: 600, opacity: 0.6, textAlign: "center", padding: "0 0.5rem" }}>Foto em breve</span>
            </div>
          )}

          <div style={{ position: "absolute", top: 6, left: 6, display: "flex", flexDirection: "column", gap: "3px" }}>
            {selo && !outOfStock && (
              <span style={{ backgroundColor: selo === "novidade" ? "#2f8f52" : "#b8891a", color: "#fff", fontSize: "0.6rem", fontWeight: 900, padding: "2px 8px", borderRadius: "999px", whiteSpace: "nowrap" }}>
                {TEXTO_SELO[selo]}
              </span>
            )}
            {saleInfo && !outOfStock && (
              <span style={{ backgroundColor: "#e74c3c", color: "#fff", fontSize: "0.6rem", fontWeight: 900, padding: "2px 8px", borderRadius: "999px", whiteSpace: "nowrap" }}>SALE</span>
            )}
            {discount && !saleInfo && !outOfStock && (
              <span style={{ backgroundColor: "#1a1510", color: "#b8891a", fontSize: "0.6rem", fontWeight: 900, padding: "2px 8px", borderRadius: "999px", whiteSpace: "nowrap" }}>-{discount}%</span>
            )}
            {outOfStock && (
              <span style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#fff", fontSize: "0.6rem", fontWeight: 900, padding: "2px 8px", borderRadius: "999px", whiteSpace: "nowrap" }}>Esgotado</span>
            )}
          </div>

          {cores.length > 0 && !outOfStock && (
            <div style={{ position: "absolute", bottom: 6, left: 6, display: "flex", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.88)", padding: "3px 6px", borderRadius: "999px", backdropFilter: "blur(3px)" }}>
              {cores.slice(0, 4).map(c => (
                <span key={c.nome} title={c.nome} aria-label={c.nome}
                  style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: c.fundo, border: `1px solid ${c.borda}`, display: "block", flexShrink: 0 }} />
              ))}
              {cores.length > 4 && (
                <span style={{ fontSize: "0.55rem", fontWeight: 800, color: "#5a4a30", lineHeight: 1 }}>+{cores.length - 4}</span>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: "0.75rem" }}>
          <p style={{ fontSize: "0.65rem", color: "#b8891a", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
            {product.category.name}
          </p>
          <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1a1510", lineHeight: 1.3, marginBottom: "0.4rem", overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical" as const, WebkitLineClamp: 2, minHeight: "2.2em" }}>
            {product.name}
          </p>

          {sizes.length > 0 && (
            <div style={{ display: "flex", gap: "2px", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              {sizes.slice(0, 4).map(s => (
                <span key={s} style={{ fontSize: "0.55rem", fontWeight: 700, padding: "1px 4px", borderRadius: "3px", backgroundColor: "#FAF6EE", color: "#9a8060", border: "1px solid rgba(140,100,20,0.15)" }}>{s}</span>
              ))}
              {sizes.length > 4 && <span style={{ fontSize: "0.55rem", color: "#b8891a", fontWeight: 700 }}>+{sizes.length - 4}</span>}
            </div>
          )}

          {cores.length > 0 && (
            <p style={{ fontSize: "0.58rem", color: "#9a8060", fontWeight: 600, marginBottom: "0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {cores.length === 1 ? cores[0].nome : `${cores.length} cores: ${cores.map(c => c.nome).join(", ")}`}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.6rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "1rem", fontWeight: 900, color: saleInfo ? "#e74c3c" : "#b8891a" }}>{formatCurrency(finalPrice)}</span>
            {(product.compareAt || saleInfo) && (
              <span style={{ fontSize: "0.7rem", color: "#b8a080", textDecoration: "line-through" }}>
                {formatCurrency(product.compareAt || product.price)}
              </span>
            )}
          </div>

          <button onClick={handleAddToCart} disabled={outOfStock}
            style={{ width: "100%", padding: "0.5rem", backgroundColor: outOfStock ? "#e8e0d0" : "#1a1510", color: outOfStock ? "#9a8060" : "#FAF6EE", fontWeight: 800, fontSize: "0.75rem", border: "none", borderRadius: "0.5rem", cursor: outOfStock ? "not-allowed" : "pointer", letterSpacing: "0.03em" }}>
            {outOfStock ? "Esgotado" : "Ver produto"}
          </button>
        </div>
      </div>
    </Link>
  );
}
