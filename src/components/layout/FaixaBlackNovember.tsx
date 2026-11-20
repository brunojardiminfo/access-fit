"use client";

import Link from "next/link";
import { useMobileView } from "@/hooks/useMediaQuery";

/**
 * A faixa da Black November, no topo de todas as páginas da loja.
 *
 * Preta, e não dourada como a CampanhaBar, de propósito: são dois avisos
 * diferentes e podem coexistir. Duas faixas douradas empilhadas viram uma
 * mancha só — esta tem que se ler como outra coisa.
 *
 * Quem decide se ela aparece, e com qual desconto, é o servidor (layout.tsx).
 * Aqui dentro não há relógio nem consulta: ler a hora no cliente faria a faixa
 * piscar na hidratação, e o servidor e o navegador discordariam na virada do
 * dia.
 */
export default function FaixaBlackNovember({
  desconto,
  prazo,
}: {
  /** O maior desconto que existe de verdade no SALE agora, em %. */
  desconto: number;
  /** "20 a 30 de novembro", "últimos 3 dias", "último dia". */
  prazo: string;
}) {
  const isMobile = useMobileView();

  return (
    <Link
      href="/produtos?sale=1"
      aria-label={`Black November: até ${desconto}% de desconto, ${prazo}`}
      style={{
        display: "block",
        textDecoration: "none",
        background: "linear-gradient(90deg, #07060a 0%, #1c1206 42%, #2a1a07 50%, #1c1206 58%, #07060a 100%)",
        borderBottom: "1px solid rgba(232,199,102,0.30)",
        padding: isMobile ? "0.6rem 0.85rem" : "0.72rem 1.5rem",
      }}
    >
      <div style={{
        maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center",
        justifyContent: "center", gap: isMobile ? "0.45rem" : "0.9rem",
        flexWrap: "wrap", textAlign: "center",
      }}>
        <span style={{
          fontSize: isMobile ? "0.72rem" : "0.9rem", fontWeight: 900,
          letterSpacing: "0.04em", whiteSpace: "nowrap",
          background: "linear-gradient(100deg,#8d6f14,#e8c766 38%,#fff6d8 50%,#e8c766 62%,#8d6f14)",
          WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
        }}>
          BLACK NOVEMBER
        </span>

        <span style={{
          color: "#07060a", backgroundColor: "#e8c766",
          fontSize: isMobile ? "0.68rem" : "0.78rem", fontWeight: 900,
          padding: "0.2rem 0.65rem", borderRadius: "999px", whiteSpace: "nowrap",
        }}>
          até {desconto}% OFF
        </span>

        <span style={{
          color: "rgba(246,241,230,0.72)",
          fontSize: isMobile ? "0.7rem" : "0.85rem", fontWeight: 600, whiteSpace: "nowrap",
        }}>
          {prazo}
        </span>

        {/* No celular o "ver peças" sai: com ele, a faixa quebra em duas linhas
            e empurra a vitrine para baixo da dobra. A faixa inteira já é o link. */}
        {!isMobile && (
          <span style={{
            color: "#e8c766", fontSize: "0.85rem", fontWeight: 700,
            textDecoration: "underline", textUnderlineOffset: "3px", whiteSpace: "nowrap",
          }}>
            ver peças →
          </span>
        )}
      </div>
    </Link>
  );
}
