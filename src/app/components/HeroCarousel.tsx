"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { formatCurrency, parseJson } from "@/lib/utils";
import { getSaleInfo } from "@/lib/saleHelper";

type Produto = {
  id: string; name: string; slug: string; price: number; images: string;
  createdAt: string | Date; onSale?: boolean; saleDiscount?: number | null;
};

const INTERVALO = 4500;

/**
 * Quantos vizinhos ficam visíveis atrás da peça da frente. Mais que dois não
 * aparece e ainda custa desfoque — e desfoque em imagem grande é o que pesa
 * numa vitrine como esta.
 */
const VIZINHOS = 2;

/**
 * Distância da peça i até a peça da frente, pelo caminho mais curto do laço.
 * Sem isto, ao virar do último para o primeiro a pilha inteira atravessaria a
 * tela de volta em vez de continuar girando para o mesmo lado.
 */
function distancia(i: number, atual: number, total: number) {
  let d = i - atual;
  if (d > total / 2) d -= total;
  if (d < -total / 2) d += total;
  return d;
}

export default function HeroCarousel({ produtos, isMobile }: { produtos: Produto[]; isMobile: boolean }) {
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const toqueX = useRef<number | null>(null);

  const total = produtos.length;
  const vai = useCallback((i: number) => setAtual((i + total) % total), [total]);

  useEffect(() => {
    if (pausado || total < 2) return;
    // Quem prefere menos animação não recebe a troca automática
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setAtual(i => (i + 1) % total), INTERVALO);
    return () => clearInterval(t);
  }, [pausado, total]);

  if (total === 0) return null;

  return (
    <div
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onTouchStart={e => { toqueX.current = e.touches[0].clientX; setPausado(true); }}
      onTouchEnd={e => {
        const inicio = toqueX.current;
        if (inicio !== null) {
          const delta = e.changedTouches[0].clientX - inicio;
          if (Math.abs(delta) > 40) vai(atual + (delta < 0 ? 1 : -1));
        }
        toqueX.current = null;
        setPausado(false);
      }}
      style={{ position: "relative", width: "100%" }}
    >
      {/* Brilho atrás da pilha, para a vitrine não flutuar sobre o nada */}
      <div aria-hidden style={{ position: "absolute", left: "50%", top: "48%", transform: "translate(-50%,-50%)", width: "86%", aspectRatio: "1/1", borderRadius: "50%", background: "radial-gradient(circle, rgba(184,137,26,0.22) 0%, transparent 68%)", pointerEvents: "none", filter: "blur(30px)" }} />

      {/* Palco: as peças ficam empilhadas, não enfileiradas. A da frente é a
          que vende; as de trás dão profundidade de vitrine. */}
      <div style={{ position: "relative", aspectRatio: isMobile ? "1/1.05" : "1/1.15", perspective: 1200 }}>
          {produtos.map((p, i) => {
            const d = distancia(i, atual, total);
            const longe = Math.abs(d) > VIZINHOS;
            const frente = d === 0;
            const imgs = parseJson<string[]>(p.images, []);
            const criado = typeof p.createdAt === "string" ? new Date(p.createdAt) : p.createdAt;
            const sale = getSaleInfo({ price: p.price, createdAt: criado, onSale: p.onSale, saleDiscount: p.saleDiscount });
            const preco = sale ? sale.salePrice : p.price;
            return (
              <Link
                key={p.id}
                href={`/produtos/${p.slug}`}
                // Só a peça da frente recebe clique e foco: as de trás estão
                // sobrepostas e roubariam o toque de quem mira na da frente.
                aria-hidden={!frente}
                tabIndex={frente ? 0 : -1}
                className={frente ? "heroFrente" : undefined}
                style={{
                  position: "absolute", inset: 0, textDecoration: "none", display: "block",
                  borderRadius: "1.25rem", overflow: "hidden", backgroundColor: "#2a2010",
                  border: "1px solid rgba(184,137,26,0.2)",
                  boxShadow: frente ? "0 24px 60px rgba(0,0,0,0.45)" : "0 14px 36px rgba(0,0,0,0.35)",
                  // Deslocamento pequeno de propósito: as vizinhas espiam por
                  // trás da peça da frente, não deslizam para o lado. Com um
                  // deslocamento grande elas saíam da coluna da vitrine e
                  // apareciam como fantasmas por cima do texto do hero.
                  transform: `translateX(${d * (isMobile ? 6 : 8)}%) scale(${1 - Math.abs(d) * 0.1}) rotate(${d * 2.4}deg)`,
                  opacity: longe ? 0 : (frente ? 1 : 0.3),
                  filter: frente ? "blur(0px)" : "blur(4px)",
                  zIndex: 10 - Math.abs(d),
                  pointerEvents: frente ? "auto" : "none",
                  visibility: longe ? "hidden" : "visible",
                  transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1), opacity 0.6s, filter 0.6s, box-shadow 0.6s",
                }}
              >
                {imgs[0] ? (
                  <img src={imgs[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(184,137,26,0.35)", fontSize: "0.8rem", fontWeight: 700 }}>Access Fit</div>
                )}

                {sale && (
                  <span style={{ position: "absolute", top: 14, left: 14, backgroundColor: "#e74c3c", color: "var(--text-main)", fontSize: "0.62rem", fontWeight: 900, letterSpacing: "0.08em", padding: "0.28rem 0.7rem", borderRadius: "999px" }}>
                    SALE −{sale.discount}%
                  </span>
                )}

                {/* Nome e preço, sobre um véu para não brigar com a foto */}
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: isMobile ? "2.5rem 1rem 1rem" : "3.5rem 1.25rem 1.25rem", background: "linear-gradient(to top, rgba(20,15,10,0.92) 0%, rgba(20,15,10,0.55) 55%, transparent 100%)" }}>
                  <p style={{ color: "var(--text-main)", fontSize: isMobile ? "0.95rem" : "1.05rem", fontWeight: 800, margin: 0, lineHeight: 1.25 }}>{p.name}</p>
                  <p style={{ margin: "0.2rem 0 0", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <span style={{ color: sale ? "#ff8b7a" : "#e0b64a", fontSize: isMobile ? "1rem" : "1.15rem", fontWeight: 900 }}>{formatCurrency(preco)}</span>
                    {sale && <span style={{ color: "rgba(250,246,238,0.5)", fontSize: "0.8rem", textDecoration: "line-through" }}>{formatCurrency(p.price)}</span>}
                  </p>
                </div>
              </Link>
            );
          })}

        {/* Setas, só onde há mouse */}
        {!isMobile && total > 1 && ([-1, 1] as const).map(dir => (
          <button key={dir} onClick={() => vai(atual + dir)}
            aria-label={dir === -1 ? "Peça anterior" : "Próxima peça"}
            style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", [dir === -1 ? "left" : "right"]: 12, width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer", backgroundColor: "rgba(26,21,16,0.55)", color: "var(--text-main)", fontSize: "1.1rem", fontWeight: 700, backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties}>
            {dir === -1 ? "‹" : "›"}
          </button>
        ))}
      </div>

      {/* Bolinhas */}
      {total > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginTop: "0.875rem" }}>
          {produtos.map((p, i) => (
            <button key={p.id} onClick={() => vai(i)} aria-label={`Ver ${p.name}`}
              style={{ width: i === atual ? 22 : 7, height: 7, borderRadius: "999px", border: "none", padding: 0, cursor: "pointer", backgroundColor: i === atual ? "var(--gold)" : "rgba(250,246,238,0.28)", transition: "width 0.3s, background-color 0.3s" }} />
          ))}
        </div>
      )}
    </div>
  );
}
