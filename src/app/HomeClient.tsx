"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useMobileView } from "@/hooks/useMediaQuery";
import ProductCard from "@/components/products/ProductCard";
import { CAMPANHA, faseCampanha, mesDaCampanha } from "@/lib/campanha";

interface HomeClientProps {
  newArrivals: any[];
  heroProducts: any[];
  featuredProducts: any[];
  saleProducts: any[];
  categories: any[];
  categoryIcons: Record<string, string>;
}

export default function HomeClient({
  newArrivals,
  heroProducts,
  featuredProducts,
  saleProducts,
  categories,
  categoryIcons,
}: HomeClientProps) {
  const isMobile = useMobileView();
  const fase = faseCampanha();

  return (
    <div style={{ backgroundColor: "#FAF6EE" }}>
      {/* HERO */}
      <section style={{ background: "linear-gradient(160deg, #1a1510 0%, #2d2010 60%, #1a1510 100%)", padding: isMobile ? "1.5rem 1rem" : "4rem 1.5rem 4rem", position: "relative", overflow: "hidden", minHeight: isMobile ? "auto" : "85vh", display: "flex", alignItems: "center" }}>
        {/* Glow */}
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(184,137,26,0.12) 0%, transparent 65%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "2rem" : "3rem", alignItems: "center", position: "relative" }}>
          {/* Texto */}
          <div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", border: "1px solid rgba(184,137,26,0.35)", color: "#b8891a", fontSize: isMobile ? "0.65rem" : "0.68rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", padding: "0.4rem 1rem", borderRadius: "999px", marginBottom: "1.75rem", backgroundColor: "rgba(184,137,26,0.08)" }}>
              ✦ Nova Coleção 2026
            </span>
            <h1 style={{ fontSize: isMobile ? "clamp(1.75rem, 5vw, 2rem)" : "clamp(2.5rem, 5.5vw, 4.5rem)", fontWeight: 900, lineHeight: 1.05, color: "#FAF6EE", marginBottom: "1.5rem" }}>
              Desbloqueie{" "}
              <span className="gold-shimmer">sua energia</span>
              <br />infinita.
            </h1>
            <p style={{ color: "rgba(250,246,238,0.65)", fontSize: isMobile ? "0.9rem" : "clamp(0.9rem, 1.8vw, 1.05rem)", lineHeight: 1.8, marginBottom: "2.5rem", maxWidth: 440 }}>
              Cada peça criada para despertar a força que existe em você. Vista-se com intenção, mova-se com poder.
            </p>
            <div style={{ display: "flex", gap: isMobile ? "0.5rem" : "0.875rem", flexDirection: isMobile ? "column" : "row", flexWrap: "wrap" }}>
              <Link href="/produtos" style={{ backgroundColor: "#b8891a", color: "#fff", fontWeight: 900, padding: isMobile ? "0.75rem 1.5rem" : "0.95rem 2.25rem", borderRadius: "0.875rem", textDecoration: "none", fontSize: isMobile ? "0.85rem" : "0.95rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", boxShadow: "0 4px 20px rgba(184,137,26,0.4)", width: isMobile ? "100%" : "auto" }}>
                Ver Coleção <ArrowRight size={16} />
              </Link>
              <a href="https://wa.me/5551986596705?text=Olá! Quero conhecer os produtos da Access Fit" target="_blank" rel="noopener noreferrer"
                style={{ border: "1.5px solid rgba(255,255,255,0.2)", color: "rgba(250,246,238,0.85)", fontWeight: 700, padding: isMobile ? "0.75rem 1.5rem" : "0.95rem 2rem", borderRadius: "0.875rem", textDecoration: "none", fontSize: isMobile ? "0.85rem" : "0.95rem", backgroundColor: "rgba(255,255,255,0.06)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: isMobile ? "100%" : "auto" }}>
                📲 Falar no WhatsApp
              </a>
            </div>
          </div>

          {/* Grid de preview de produtos - esconde em mobile */}
          {!isMobile && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
              {heroProducts.map((p, i) => {
                const imgs = JSON.parse(p.images || "[]");
                return (
                  <Link key={p.id} href={`/produtos/${p.slug}`} style={{ textDecoration: "none", display: "block", borderRadius: "1rem", overflow: "hidden", aspectRatio: i === 0 ? "1/1.4" : "1/1", backgroundColor: "#2a2010", border: "1px solid rgba(184,137,26,0.15)", position: "relative" }}>
                    {imgs[0] ? (
                      <img src={imgs[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.9 }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(184,137,26,0.3)", fontSize: "0.7rem" }}>Access Fit</div>
                    )}
                    <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, backgroundColor: "rgba(26,21,16,0.85)", borderRadius: "0.5rem", padding: "0.4rem 0.6rem", backdropFilter: "blur(4px)" }}>
                      <p style={{ color: "#FAF6EE", fontSize: "0.65rem", fontWeight: 700, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{p.name}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Campanha — só avisa que vem, a mecânica fica guardada */}
      {fase === "teaser" && (
        <section style={{ background: "linear-gradient(120deg, #1a1510 0%, #3a2410 55%, #1a1510 100%)", padding: isMobile ? "2rem 1rem" : "3.25rem 1.5rem", borderTop: "1px solid rgba(184,137,26,0.25)", borderBottom: "1px solid rgba(184,137,26,0.25)" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
            <span style={{ display: "inline-block", border: "1px solid rgba(184,137,26,0.45)", color: "#e0b64a", fontSize: isMobile ? "0.6rem" : "0.68rem", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", padding: "0.4rem 1.1rem", borderRadius: "999px", marginBottom: "1.1rem", backgroundColor: "rgba(184,137,26,0.1)" }}>
              ✦ Em {mesDaCampanha()}
            </span>
            <h2 style={{ fontSize: isMobile ? "1.6rem" : "2.6rem", fontWeight: 900, color: "#FAF6EE", margin: "0 0 0.875rem", lineHeight: 1.1 }}>
              {CAMPANHA.nome} <span className="gold-shimmer">está chegando</span>
            </h2>
            <p style={{ color: "rgba(250,246,238,0.7)", fontSize: isMobile ? "0.88rem" : "1.05rem", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 1.75rem" }}>
              Estamos preparando uma condição especial para quem veste Access Fit.
              Ainda não vamos contar qual — mas vale esperar.
            </p>
            <a href={`https://wa.me/5551986596705?text=${encodeURIComponent(`Olá! Quero ser avisada sobre o ${CAMPANHA.nome} da Access Fit`)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", backgroundColor: "#b8891a", color: "#fff", fontWeight: 900, padding: isMobile ? "0.8rem 1.75rem" : "0.95rem 2.25rem", borderRadius: "0.875rem", textDecoration: "none", fontSize: isMobile ? "0.85rem" : "0.95rem", boxShadow: "0 4px 20px rgba(184,137,26,0.35)" }}>
              📲 Quero ser avisada
            </a>
          </div>
        </section>
      )}

      {/* SALE */}
      <section style={{ padding: isMobile ? "2rem 1rem" : "4.5rem 1.5rem", background: "linear-gradient(180deg, #fff5f3 0%, #FAF6EE 100%)", borderTop: "3px solid #e74c3c" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
            <span style={{ display: "inline-block", backgroundColor: "#e74c3c", color: "#fff", fontSize: isMobile ? "0.6rem" : "0.7rem", fontWeight: 900, letterSpacing: "0.18em", padding: "0.35rem 1rem", borderRadius: "999px", marginBottom: "0.75rem" }}>
              PREÇOS REDUZIDOS
            </span>
            <h2 style={{ fontSize: isMobile ? "1.75rem" : "3rem", fontWeight: 900, color: "#e74c3c", margin: 0, lineHeight: 1 }}>
              🔥 SALE
            </h2>
          </div>
          <p style={{ textAlign: "center", color: "#9a8060", marginBottom: isMobile ? "1.5rem" : "2.5rem", fontSize: isMobile ? "0.8rem" : "1rem" }}>
            {saleProducts.length > 0
              ? `${saleProducts.length} peça${saleProducts.length === 1 ? "" : "s"} com desconto agora — enquanto durar o estoque`
              : "Fique atento para nossas promoções exclusivas"}
          </p>
          {saleProducts.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? "1rem" : "1.25rem" }}>
              {saleProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : null}
          {saleProducts.length > 0 ? (
            <div style={{ textAlign: "center", marginTop: isMobile ? "1.25rem" : "2rem" }}>
              <Link href="/produtos?sale=1" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", backgroundColor: "#e74c3c", color: "#fff", fontWeight: 900, padding: isMobile ? "0.75rem 1.5rem" : "0.9rem 2rem", borderRadius: "0.875rem", textDecoration: "none", fontSize: isMobile ? "0.85rem" : "0.95rem", boxShadow: "0 4px 18px rgba(231,76,60,0.35)" }}>
                Ver tudo em SALE <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "3rem 1rem", backgroundColor: "#fff", borderRadius: "1rem", border: "1px solid rgba(231,76,60,0.2)" }}>
              <span style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}>🎉</span>
              <p style={{ color: "#9a8060", fontSize: "1rem", fontWeight: 600 }}>Volte em breve para aproveitar ofertas especiais!</p>
            </div>
          )}
        </div>
      </section>

      {/* Home Try-On */}
      <section style={{ padding: isMobile ? "2rem 1rem" : "4.5rem 1.5rem", backgroundColor: "#fff", borderBottom: "1px solid rgba(140,100,20,0.08)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "#b8891a", letterSpacing: "0.15em", marginBottom: "0.75rem" }}>COMO FUNCIONA</p>
          <h2 style={{ fontSize: isMobile ? "1.4rem" : "2rem", fontWeight: 900, color: "#1a1510", marginBottom: "0.75rem" }}>
            Experimente em casa. Compre só se amar.
          </h2>
          <p style={{ color: "#5a4a2a", fontSize: isMobile ? "0.85rem" : "1rem", lineHeight: 1.7, maxWidth: 560, margin: "0 auto 2.5rem" }}>
            Escolha suas peças, receba em casa, experimente com calma — e leve só o que decidir ficar. Sem risco, sem pressa.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: isMobile ? "1rem" : "1.5rem", textAlign: isMobile ? "left" : "center" }}>
            {[
              { icon: "🛍️", title: "Escolha suas peças", desc: "Monte seu pedido com o que combina com você." },
              { icon: "🏠", title: "Experimente em casa", desc: "No seu tempo, sem fila de provador e sem pressa." },
              { icon: "💛", title: "Fique só com o que amar", desc: "Devolva o resto, sem burocracia." },
            ].map(step => (
              <div key={step.title} style={{ padding: isMobile ? "1rem" : "1.5rem", backgroundColor: "#FAF6EE", borderRadius: "1rem", border: "1px solid rgba(140,100,20,0.1)" }}>
                <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>{step.icon}</div>
                <p style={{ fontWeight: 800, color: "#1a1510", fontSize: "0.95rem", marginBottom: "0.25rem" }}>{step.title}</p>
                <p style={{ color: "#9a8060", fontSize: "0.82rem", lineHeight: 1.5 }}>{step.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/sobre" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", marginTop: "2rem", color: "#b8891a", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none" }}>
            Como funciona o Home Try-On <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* Categorias */}
      <section style={{ padding: isMobile ? "1.5rem 1rem" : "5rem 1.5rem", backgroundColor: "#FAF6EE" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{ fontSize: isMobile ? "1.25rem" : "2.2rem", fontWeight: 900, color: "#1a1510", marginBottom: isMobile ? "1.5rem" : "2.5rem", textAlign: "center" }}>
            Explora por Coleção
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(auto-fit, minmax(85px, 1fr))" : "repeat(auto-fill, minmax(140px, 1fr))", gap: isMobile ? "0.5rem" : "0.875rem" }}>
            {categories.map(cat => (
              <Link key={cat.id} href={`/produtos?categoria=${cat.slug}`}
                style={{ padding: isMobile ? "0.5rem" : "1rem", backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)", borderRadius: "0.625rem", textAlign: "center", textDecoration: "none", color: "#1a1510", fontSize: isMobile ? "0.7rem" : "0.85rem", fontWeight: 700, transition: "all 0.2s", cursor: "pointer" }}>
                <span style={{ fontSize: isMobile ? "1.25rem" : "2rem", marginRight: isMobile ? "0.25rem" : "0.5rem", display: "block", marginBottom: "0.25rem" }}>{categoryIcons[cat.name] || "✨"}</span>
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Destaques */}
      <section style={{ padding: isMobile ? "1.5rem 1rem" : "5rem 1.5rem", backgroundColor: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{ fontSize: isMobile ? "1.25rem" : "2.2rem", fontWeight: 900, color: "#1a1510", marginBottom: "0.75rem", textAlign: "center" }}>
            ✨ Destaques
          </h2>
          <p style={{ textAlign: "center", color: "#9a8060", marginBottom: isMobile ? "1.5rem" : "2.5rem", fontSize: isMobile ? "0.8rem" : "1rem" }}>
            As peças mais procuradas da coleção
          </p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? "1rem" : "1.25rem" }}>
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
