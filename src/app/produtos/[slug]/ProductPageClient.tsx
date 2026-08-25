"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useCart } from "@/store/cart";
import { formatCurrency, parseJson } from "@/lib/utils";
import { getSaleInfo, calculateSalePrice } from "@/lib/saleHelper";
import Link from "next/link";
import SizeGuide from "@/app/components/SizeGuide";
import RecommendedProducts from "@/app/components/RecommendedProducts";

type ConjuntoItem = { id: string; name: string; price: number; quantity: number; stock?: number | null };

type Product = {
  id: string; name: string; slug: string; description: string | null;
  price: number; compareAt: number | null; images: string;
  sizes: string; sizeRange: string | null; colors: string; stock: number; sku: string | null; sizeStock: string;
  isConjunto: boolean; sellComponentsSeparately: boolean; conjuntoItems: ConjuntoItem[];
  createdAt: string | Date; onSale?: boolean; saleDiscount?: number | null;
  category: { name: string; slug: string };
};

export default function ProductPageClient() {
  const params = useParams();
  const { addItem, openCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitName, setWaitName] = useState("");
  const [waitPhone, setWaitPhone] = useState("");
  const [waitSaved, setWaitSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/produtos/${params.slug}`)
      .then(r => { if (!r.ok) { setNotFoundState(true); setLoading(false); return null; } return r.json(); })
      .then(data => {
        if (!data) return;
        setProduct(data);
        const sizes = parseJson<string[]>(data.sizes, []);
        const sizeStock = parseJson<Record<string, number>>(data.sizeStock, {});
        const hasSizeStock = Object.keys(sizeStock).length > 0;
        const firstAvailable = hasSizeStock ? sizes.find(s => (sizeStock[s] ?? 0) > 0) : sizes[0];
        setSelectedSize(firstAvailable || sizes[0] || "");
        setLoading(false);
      });
  }, [params.slug]);

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FAF6EE" }}>
      <div style={{ width: 36, height: 36, border: "3px solid rgba(184,137,26,0.2)", borderTopColor: "#b8891a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (notFoundState || !product) return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", backgroundColor: "#FAF6EE" }}>
      <p style={{ color: "#5a4a2a" }}>Produto não encontrado.</p>
      <Link href="/produtos" style={{ color: "#b8891a", textDecoration: "none", fontWeight: 700 }}>← Ver todos os produtos</Link>
    </div>
  );

  const images = parseJson<string[]>(product.images, []);
  const sizes = parseJson<string[]>(product.sizes, []);
  const sizeStock = parseJson<Record<string, number>>(product.sizeStock, {});
  const hasSizeStock = Object.keys(sizeStock).length > 0;
  const isSizeAvailable = (size: string) => !hasSizeStock || (sizeStock[size] ?? 0) > 0;
  const selectedSizeAvailable = !selectedSize || isSizeAvailable(selectedSize);
  const discount = product.compareAt ? Math.round((1 - product.price / product.compareAt) * 100) : null;
  const createdDate = typeof product.createdAt === "string" ? new Date(product.createdAt) : product.createdAt;
  const saleInfo = getSaleInfo({
    price: product.price,
    createdAt: createdDate,
    onSale: product.onSale,
    saleDiscount: product.saleDiscount,
  });
  const finalPrice = saleInfo ? saleInfo.salePrice : product.price;
  // Componentes do conjunto seguem o mesmo percentual de desconto da peca
  const componentPrice = (value: number) => saleInfo ? calculateSalePrice(value, saleInfo.discount) : value;
  // Para conjuntos com componentes separados: esgotado só se o conjunto E todos os componentes estiverem sem estoque
  // stock >= 0 = disponível (0 = padrão/nunca vendido), stock < 0 = esgotado (foi vendido)
  const hasAvailableComponents = product.isConjunto && product.sellComponentsSeparately
    ? product.conjuntoItems.some(c => (c.stock ?? 0) >= 0)
    : false;
  const outOfStock = product.stock === 0 && !hasAvailableComponents;

  // Calcular economia do conjunto
  const calculateComponentsTotal = () => {
    if (!product.isConjunto || product.conjuntoItems.length === 0) return 0;
    return product.conjuntoItems.reduce((sum, c) => sum + c.price, 0);
  };
  const componentsTotalPrice = calculateComponentsTotal();
  const bundleSavings = product.isConjunto && componentsTotalPrice > 0 ? componentsTotalPrice - product.price : 0;
  const bundleSavingsPercent = bundleSavings > 0 ? Math.round((bundleSavings / componentsTotalPrice) * 100) : 0;

  const handleAddToCart = () => {
    if (product.isConjunto && product.sellComponentsSeparately && !selectedComponent) {
      alert("Selecione qual opção deseja comprar");
      return;
    }
    // Bloqueia se selecionou conjunto completo sem estoque
    if (selectedComponent === "completo" && product.stock === 0) return;
    // Bloqueia se selecionou componente sem estoque
    if (selectedComponent && selectedComponent !== "completo") {
      const comp = product.conjuntoItems.find(c => c.id === selectedComponent);
      if (comp && (comp.stock ?? 0) < 0) return;
    }
    if (outOfStock) return;
    if (!selectedSizeAvailable) return;

    let itemName = product.name;
    let itemPrice = finalPrice;
    let itemCheio = product.price;

    if (selectedComponent && selectedComponent !== "completo") {
      const component = product.conjuntoItems.find(c => c.id === selectedComponent);
      if (component) {
        itemName = `${product.name} - ${component.name}`;
        itemPrice = componentPrice(component.price);
        itemCheio = component.price;
      }
    }

    addItem({
      productId: product.id, name: itemName, price: itemPrice,
      precoCheio: itemCheio, descontoSale: saleInfo?.discount ?? 0,
      image: images[0] || "", size: selectedSize || "Único", color: "Padrão", quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
    openCart();
  };

  return (
    <div style={{ backgroundColor: "#FAF6EE", minHeight: "100vh" }}>
      {/* Breadcrumb */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid rgba(140,100,20,0.1)", padding: "0.875rem 2rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", fontSize: "0.78rem", color: "#9a8060" }}>
          <Link href="/" style={{ color: "#b8891a", textDecoration: "none" }}>Início</Link>
          <span style={{ margin: "0 0.4rem" }}>›</span>
          <Link href="/produtos" style={{ color: "#b8891a", textDecoration: "none" }}>Coleção</Link>
          <span style={{ margin: "0 0.4rem" }}>›</span>
          <Link href={`/produtos?categoria=${product.category.slug}`} style={{ color: "#b8891a", textDecoration: "none" }}>{product.category.name}</Link>
          <span style={{ margin: "0 0.4rem" }}>›</span>
          <span style={{ color: "#5a4a2a" }}>{product.name}</span>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "3rem", alignItems: "flex-start" }}>

          {/* Galeria */}
          <div>
            <div onClick={() => images[selectedImage] && setLightbox(true)}
              style={{ borderRadius: "1.25rem", overflow: "hidden", backgroundColor: "#F0E8D0", aspectRatio: "3/4", border: "1px solid rgba(140,100,20,0.1)", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", cursor: images[selectedImage] ? "zoom-in" : "default", position: "relative" }}>
              {images[selectedImage] ? (
                <img src={images[selectedImage]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#b8891a", fontSize: "0.875rem", opacity: 0.5 }}>
                  Foto em breve
                </div>
              )}
              {images[selectedImage] && (
                <div style={{ position: "absolute", bottom: 10, right: 10, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: "0.5rem", padding: "4px 8px", fontSize: "0.65rem", color: "#fff", fontWeight: 700 }}>
                  🔍 Ampliar
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.875rem", flexWrap: "wrap" }}>
                {images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    style={{ width: 68, height: 68, borderRadius: "0.625rem", overflow: "hidden", border: `2px solid ${selectedImage === i ? "#b8891a" : "rgba(140,100,20,0.15)"}`, cursor: "pointer", padding: 0, backgroundColor: "#F0E8D0", flexShrink: 0 }}>
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lightbox */}
          {lightbox && (
            <div onClick={() => setLightbox(false)}
              style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.92)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* Fechar */}
              <button onClick={() => setLightbox(false)}
                style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 44, height: 44, borderRadius: "50%", fontSize: "1.25rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✕
              </button>
              {/* Seta esquerda */}
              {images.length > 1 && (
                <button onClick={e => { e.stopPropagation(); setSelectedImage(i => (i - 1 + images.length) % images.length); }}
                  style={{ position: "absolute", left: 16, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 48, height: 48, borderRadius: "50%", fontSize: "1.5rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ‹
                </button>
              )}
              {/* Imagem */}
              <img src={images[selectedImage]} alt={product.name} onClick={e => e.stopPropagation()}
                style={{ maxHeight: "90vh", maxWidth: "90vw", objectFit: "contain", borderRadius: "0.75rem", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }} />
              {/* Seta direita */}
              {images.length > 1 && (
                <button onClick={e => { e.stopPropagation(); setSelectedImage(i => (i + 1) % images.length); }}
                  style={{ position: "absolute", right: 16, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: 48, height: 48, borderRadius: "50%", fontSize: "1.5rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ›
                </button>
              )}
              {/* Contador */}
              {images.length > 1 && (
                <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px" }}>
                  {images.map((_, i) => (
                    <div key={i} onClick={e => { e.stopPropagation(); setSelectedImage(i); }}
                      style={{ width: i === selectedImage ? 20 : 8, height: 8, borderRadius: "999px", backgroundColor: i === selectedImage ? "#b8891a" : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "width 0.2s" }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Detalhes */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
              <p style={{ fontSize: "0.75rem", color: "#b8891a", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {product.category.name}
              </p>
              {product.sku && (
                <span style={{ fontSize: "0.68rem", color: "#9a8060", fontFamily: "monospace", backgroundColor: "#F0E8D0", padding: "0.2rem 0.6rem", borderRadius: "999px", fontWeight: 700 }}>
                  {product.sku}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 900, color: "#1a1510", marginTop: "0.4rem", lineHeight: 1.2 }}>
              {product.name}
            </h1>

            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "2rem", fontWeight: 900, color: saleInfo ? "#e74c3c" : "#b8891a" }}>{formatCurrency(finalPrice)}</span>
              {saleInfo ? (
                <>
                  <span style={{ fontSize: "1.1rem", color: "#b8a080", textDecoration: "line-through" }}>{formatCurrency(product.compareAt || product.price)}</span>
                  <span style={{ backgroundColor: "#e74c3c", color: "#fff", fontSize: "0.8rem", fontWeight: 900, padding: "0.2rem 0.7rem", borderRadius: "999px" }}>SALE -{saleInfo.discount}%</span>
                </>
              ) : product.compareAt ? (
                <>
                  <span style={{ fontSize: "1.1rem", color: "#b8a080", textDecoration: "line-through" }}>{formatCurrency(product.compareAt)}</span>
                  <span style={{ backgroundColor: "rgba(184,137,26,0.12)", color: "#b8891a", fontSize: "0.8rem", fontWeight: 900, padding: "0.2rem 0.7rem", borderRadius: "999px" }}>-{discount}%</span>
                </>
              ) : null}
            </div>

            {outOfStock && (
              <div style={{ marginTop: "0.75rem", padding: "0.6rem 1rem", backgroundColor: "#fee8e8", borderRadius: "0.625rem", fontSize: "0.8rem", color: "#c04040", fontWeight: 700 }}>
                Produto esgotado no momento
              </div>
            )}

            {/* Tamanhos */}
            {sizes.length > 0 && (
              <div style={{ marginTop: "1.75rem" }}>
                <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#5a4a2a", marginBottom: "0.625rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Tamanho: <span style={{ color: "#b8891a" }}>{selectedSize}</span>
                </p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {sizes.map(size => {
                    const available = isSizeAvailable(size);
                    return (
                      <button key={size} onClick={() => available && setSelectedSize(size)} disabled={!available}
                        style={{ position: "relative", padding: "0.55rem 1.1rem", borderRadius: "0.625rem", border: `2px solid ${!available ? "rgba(140,100,20,0.1)" : selectedSize === size ? "#b8891a" : "rgba(140,100,20,0.2)"}`, backgroundColor: !available ? "#f5f5f5" : selectedSize === size ? "#b8891a" : "#fff", color: !available ? "#b8a080" : selectedSize === size ? "#fff" : "#5a4a2a", fontWeight: 700, fontSize: "0.9rem", cursor: available ? "pointer" : "not-allowed", transition: "all 0.15s", textDecoration: !available ? "line-through" : "none" }}>
                        {size}
                      </button>
                    );
                  })}
                </div>
                {selectedSize && !selectedSizeAvailable && (
                  <p style={{ fontSize: "0.78rem", color: "#c04040", marginTop: "0.5rem" }}>Esgotado nesse tamanho.</p>
                )}
              </div>
            )}

            {/* Guia de Tamanho Inteligente */}
            <SizeGuide productSizeRange={product.sizeRange} productName={product.name} />

            {/* Seleção de Componentes */}
            {product.isConjunto && product.sellComponentsSeparately && (
              <div style={{ marginTop: "1.75rem", padding: "1.25rem", backgroundColor: "#fff", borderRadius: "0.875rem", border: "1px solid rgba(184,137,26,0.2)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "0.72rem", fontWeight: 800, color: "#b8891a", letterSpacing: "0.1em", textTransform: "uppercase" }}>💰 Escolha o que comprar</h3>
                  {bundleSavings > 0 && (
                    <div style={{ backgroundColor: "rgba(46,125,50,0.12)", color: "#2e7d32", padding: "0.4rem 0.8rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700 }}>
                      💚 Economize {formatCurrency(bundleSavings)} ({bundleSavingsPercent}%)
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* Conjunto Completo */}
                  {(() => {
                    const compSoldOut = product.stock === 0;
                    return (
                      <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", backgroundColor: compSoldOut ? "#f5f5f5" : selectedComponent === "completo" ? "rgba(184,137,26,0.08)" : "#FAF6EE", borderRadius: "0.625rem", border: `2px solid ${compSoldOut ? "rgba(140,100,20,0.08)" : selectedComponent === "completo" ? "#b8891a" : "rgba(140,100,20,0.1)"}`, cursor: compSoldOut ? "not-allowed" : "pointer", opacity: compSoldOut ? 0.55 : 1 }}>
                        <input type="radio" name="component" value="completo" checked={selectedComponent === "completo"} onChange={() => !compSoldOut && setSelectedComponent("completo")} disabled={compSoldOut} style={{ width: "1.1rem", height: "1.1rem", accentColor: "#b8891a", cursor: compSoldOut ? "not-allowed" : "pointer" }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, color: compSoldOut ? "#9a8060" : "#1a1510", fontSize: "0.9rem", textDecoration: compSoldOut ? "line-through" : "none" }}>Conjunto Completo</p>
                          <p style={{ fontSize: "0.8rem", color: "#9a8060" }}>{compSoldOut ? "Esgotado" : "Todas as peças juntas"}</p>
                        </div>
                        <span style={{ fontSize: "1rem", fontWeight: 900, color: compSoldOut ? "#9a8060" : saleInfo ? "#e74c3c" : "#b8891a" }}>{formatCurrency(finalPrice)}</span>
                      </label>
                    );
                  })()}
                  {/* Componentes individuais */}
                  {product.conjuntoItems.map(comp => {
                    const compStock = comp.stock ?? 0;
                    const compSoldOut = compStock < 0; // < 0 = foi vendido e esgotou
                    return (
                      <label key={comp.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", backgroundColor: compSoldOut ? "#f5f5f5" : selectedComponent === comp.id ? "rgba(184,137,26,0.08)" : "#FAF6EE", borderRadius: "0.625rem", border: `2px solid ${compSoldOut ? "rgba(140,100,20,0.08)" : selectedComponent === comp.id ? "#b8891a" : "rgba(140,100,20,0.1)"}`, cursor: compSoldOut ? "not-allowed" : "pointer", opacity: compSoldOut ? 0.55 : 1 }}>
                        <input type="radio" name="component" value={comp.id} checked={selectedComponent === comp.id} onChange={() => !compSoldOut && setSelectedComponent(comp.id)} disabled={compSoldOut} style={{ width: "1.1rem", height: "1.1rem", accentColor: "#b8891a", cursor: compSoldOut ? "not-allowed" : "pointer" }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, color: compSoldOut ? "#9a8060" : "#1a1510", fontSize: "0.9rem", textDecoration: compSoldOut ? "line-through" : "none" }}>{comp.name}</p>
                          {compSoldOut && <p style={{ fontSize: "0.75rem", color: "#c04040" }}>Esgotado</p>}
                        </div>
                        <span style={{ fontSize: "1rem", fontWeight: 900, color: compSoldOut ? "#9a8060" : saleInfo ? "#e74c3c" : "#b8891a" }}>{formatCurrency(componentPrice(comp.price))}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botão */}
            {(() => {
              const selectedComp = selectedComponent && selectedComponent !== "completo"
                ? product.conjuntoItems.find(c => c.id === selectedComponent) : null;
              const selectedCompSoldOut = selectedComponent === "completo" ? product.stock === 0
                : selectedComp ? (selectedComp.stock ?? 0) < 0 : false;
              const btnDisabled = outOfStock || selectedCompSoldOut || !selectedSizeAvailable;
              return (
                <button onClick={handleAddToCart} disabled={btnDisabled}
                  style={{ width: "100%", marginTop: "2rem", padding: "1rem 1.5rem", backgroundColor: added ? "#2a6a2a" : btnDisabled ? "#e8e0d0" : "#1a1510", color: added ? "#fff" : btnDisabled ? "#9a8060" : "#FAF6EE", fontWeight: 900, fontSize: "1rem", border: "none", borderRadius: "0.875rem", cursor: btnDisabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "background-color 0.3s", letterSpacing: "0.03em", boxShadow: btnDisabled ? "none" : "0 4px 14px rgba(26,21,16,0.25)" }}>
                  {added ? "✓ Adicionado ao carrinho!" : btnDisabled ? "Esgotado" : "🛍️ Adicionar ao Carrinho"}
                </button>
              );
            })()}

            {/* Me avise quando voltar */}
            {outOfStock && (
              <div style={{ marginTop: "0.75rem" }}>
                {!waitSaved ? (!showWaitlist ? (
                  <button onClick={() => setShowWaitlist(true)} style={{ width: "100%", padding: "0.875rem", backgroundColor: "#FAF6EE", border: "2px solid #b8891a", borderRadius: "0.875rem", color: "#b8891a", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}>
                    🔔 Me avise quando voltar ao estoque
                  </button>
                ) : (
                  <div style={{ backgroundColor: "#FAF6EE", border: "1px solid rgba(184,137,26,0.3)", borderRadius: "0.875rem", padding: "1.25rem" }}>
                    <p style={{ fontWeight: 700, color: "#1a1510", marginBottom: "0.875rem" }}>🔔 Lista de espera</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "0.875rem" }}>
                      <input placeholder="Seu nome" value={waitName} onChange={e => setWaitName(e.target.value)} style={{ padding: "0.625rem 0.875rem", border: "1px solid rgba(140,100,20,0.25)", borderRadius: "0.5rem", fontSize: "0.875rem", backgroundColor: "#fff", outline: "none" }} />
                      <input placeholder="WhatsApp (51) 9..." value={waitPhone} onChange={e => setWaitPhone(e.target.value)} style={{ padding: "0.625rem 0.875rem", border: "1px solid rgba(140,100,20,0.25)", borderRadius: "0.5rem", fontSize: "0.875rem", backgroundColor: "#fff", outline: "none" }} />
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button onClick={async () => { if (!waitName || !waitPhone) return; await fetch("/api/lista-espera", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id, name: waitName, phone: waitPhone }) }); setWaitSaved(true); }}
                        style={{ flex: 1, backgroundColor: "#b8891a", color: "#fff", border: "none", borderRadius: "0.625rem", padding: "0.625rem", fontWeight: 700, cursor: "pointer" }}>
                        Entrar na lista
                      </button>
                      <button onClick={() => setShowWaitlist(false)} style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.2)", color: "#9a8060", borderRadius: "0.625rem", padding: "0.625rem 0.875rem", fontWeight: 700, cursor: "pointer" }}>✕</button>
                    </div>
                  </div>
                )) : (
                  <div style={{ backgroundColor: "#e8f8e8", border: "1px solid rgba(26,138,42,0.2)", borderRadius: "0.875rem", padding: "1rem", textAlign: "center" }}>
                    <p style={{ fontWeight: 700, color: "#1a8a2a" }}>✅ Você está na lista!</p>
                    <p style={{ fontSize: "0.8rem", color: "#5a8a5a", marginTop: "0.25rem" }}>Avisaremos quando chegar.</p>
                  </div>
                )}
              </div>
            )}

            {/* Descrição */}
            {product.description && (
              <div style={{ marginTop: "1.75rem", padding: "1.25rem", backgroundColor: "#fff", borderRadius: "0.875rem", border: "1px solid rgba(140,100,20,0.1)" }}>
                <h3 style={{ fontSize: "0.72rem", fontWeight: 800, color: "#b8891a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.625rem" }}>Descrição</h3>
                <p style={{ color: "#5a4a2a", fontSize: "0.875rem", lineHeight: 1.75 }}>{product.description}</p>
              </div>
            )}

            {/* Info */}
            <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {[
                { icon: "🚚", title: "Entrega", desc: "Enviamos para todo o Brasil" },
                { icon: "🔄", title: "Troca", desc: "Troca em até 7 dias" },
              ].map(item => (
                <div key={item.title} style={{ padding: "0.875rem", backgroundColor: "#fff", borderRadius: "0.75rem", border: "1px solid rgba(140,100,20,0.1)" }}>
                  <div style={{ fontSize: "1.25rem", marginBottom: "0.3rem" }}>{item.icon}</div>
                  <p style={{ fontSize: "0.75rem", fontWeight: 800, color: "#1a1510" }}>{item.title}</p>
                  <p style={{ fontSize: "0.72rem", color: "#9a8060", marginTop: "0.1rem" }}>{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Produtos Recomendados */}
            <RecommendedProducts productSlug={product.slug} />
          </div>
        </div>
      </div>
    </div>
  );
}
