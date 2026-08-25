"use client";

import { useMobileView } from "@/hooks/useMediaQuery";
import { CAMPANHA, faseCampanha, mesDaCampanha } from "@/lib/campanha";

/**
 * Aviso da campanha, logo abaixo do menu. Fica fora do admin e do checkout:
 * no meio da finalização, um link para o WhatsApp tiraria a cliente da compra.
 */
export default function CampanhaBar() {
  const isMobile = useMobileView();
  if (faseCampanha() !== "teaser") return null;

  const zap = `https://wa.me/5551986596705?text=${encodeURIComponent(
    `Olá! Quero ser avisada sobre o ${CAMPANHA.nome} da Access Fit`
  )}`;

  return (
    <a href={zap} target="_blank" rel="noopener noreferrer"
      style={{ display: "block", textDecoration: "none", background: "linear-gradient(90deg, #b8891a 0%, #e0b64a 50%, #b8891a 100%)", padding: isMobile ? "0.7rem 1rem" : "0.8rem 1.5rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? "0.5rem" : "0.875rem", flexWrap: "wrap", textAlign: "center" }}>
        <span style={{ color: "#1a1510", fontSize: isMobile ? "0.62rem" : "0.68rem", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", backgroundColor: "rgba(26,21,16,0.12)", padding: "0.22rem 0.7rem", borderRadius: "999px", whiteSpace: "nowrap" }}>
          ✦ Em {mesDaCampanha()}
        </span>
        <span style={{ color: "#1a1510", fontSize: isMobile ? "0.8rem" : "0.95rem", fontWeight: 800 }}>
          {CAMPANHA.nome} está chegando
        </span>
        <span style={{ color: "rgba(26,21,16,0.75)", fontSize: isMobile ? "0.75rem" : "0.88rem", fontWeight: 700, textDecoration: "underline", whiteSpace: "nowrap" }}>
          quero ser avisada →
        </span>
      </div>
    </a>
  );
}
