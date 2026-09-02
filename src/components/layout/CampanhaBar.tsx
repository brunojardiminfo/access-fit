"use client";

import { useMobileView } from "@/hooks/useMediaQuery";
import { CAMPANHA, faseCampanha, mesDaCampanha, diaDeInicio, TETO_PROGRESSIVO } from "@/lib/campanha";

const OURO = "linear-gradient(90deg, #b8891a 0%, #e0b64a 50%, #b8891a 100%)";
const TINTA = "#1a1510";

/**
 * Aviso da campanha, logo abaixo do menu. Tem dois estados:
 *
 *  - teaser → antes de comecar. Com revelarRegras ligado ja publica a escada
 *             e a data de estreia, para a cliente ir se planejando; sem ele,
 *             so avisa que vem ai. Leva para o WhatsApp, para captar o aviso.
 *  - ativa  → com a campanha no ar E revelarRegras ligado: mostra a escada e
 *             leva para a vitrine, que e onde a cliente converte
 *
 * A barra nunca decide desconto, so anuncia. No teaser a escada aparece na
 * tela mas nao vale na sacola: quem aplica e a fase, em campanha.ts.
 *
 * Fica fora do admin e do checkout: no meio da finalizacao, sair da pagina
 * derruba a compra.
 */
export default function CampanhaBar() {
  const isMobile = useMobileView();
  const fase = faseCampanha();

  if (fase === "teaser") return <Teaser isMobile={isMobile} />;
  if (fase === "ativa" && CAMPANHA.revelarRegras) return <Ativa isMobile={isMobile} />;
  return null;
}

function Moldura({ href, externo, children, isMobile }: { href: string; externo?: boolean; children: React.ReactNode; isMobile: boolean }) {
  return (
    <a href={href} {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      style={{ display: "block", textDecoration: "none", background: OURO, padding: isMobile ? "0.7rem 1rem" : "0.8rem 1.5rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? "0.5rem" : "0.875rem", flexWrap: "wrap", textAlign: "center" }}>
        {children}
      </div>
    </a>
  );
}

function Selo({ children, isMobile }: { children: React.ReactNode; isMobile: boolean }) {
  return (
    <span style={{ color: TINTA, fontSize: isMobile ? "0.62rem" : "0.68rem", fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", backgroundColor: "rgba(26,21,16,0.12)", padding: "0.22rem 0.7rem", borderRadius: "999px", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Teaser({ isMobile }: { isMobile: boolean }) {
  const zap = `https://wa.me/5551986596705?text=${encodeURIComponent(
    `Olá! Quero ser avisada sobre o ${CAMPANHA.nome} da Access Fit`
  )}`;

  return (
    <Moldura href={zap} externo isMobile={isMobile}>
      <Selo isMobile={isMobile}>
        {CAMPANHA.revelarRegras ? `✦ A partir de ${diaDeInicio()}` : `✦ Em ${mesDaCampanha()}`}
      </Selo>
      <span style={{ color: TINTA, fontSize: isMobile ? "0.8rem" : "0.95rem", fontWeight: 800 }}>
        {CAMPANHA.nome}
        {!CAMPANHA.revelarRegras && " está chegando"}
      </span>
      {CAMPANHA.revelarRegras && (
        <span style={{ color: "rgba(26,21,16,0.82)", fontSize: isMobile ? "0.72rem" : "0.85rem", fontWeight: 700 }}>
          {textoDaEscada()}
        </span>
      )}
      <span style={{ color: "rgba(26,21,16,0.75)", fontSize: isMobile ? "0.75rem" : "0.88rem", fontWeight: 700, textDecoration: "underline", whiteSpace: "nowrap" }}>
        quero ser avisada →
      </span>
    </Moldura>
  );
}

/** "1 peça 10% · 2 peças 20% · 3+ peças 30%", lido das regras da campanha. */
function textoDaEscada(): string {
  const escada = [...CAMPANHA.regras].sort((a, b) => a.pecas - b.pecas);
  return escada.map((r, i) => {
    const ultima = i === escada.length - 1;
    const pecas = ultima ? `${r.pecas}+ peças` : r.pecas === 1 ? "1 peça" : `${r.pecas} peças`;
    return `${pecas} ${r.desconto}%`;
  }).join(" · ");
}

function Ativa({ isMobile }: { isMobile: boolean }) {
  return (
    <Moldura href="/produtos" isMobile={isMobile}>
      <Selo isMobile={isMobile}>✦ Até {TETO_PROGRESSIVO}% OFF</Selo>
      <span style={{ color: TINTA, fontSize: isMobile ? "0.8rem" : "0.95rem", fontWeight: 800 }}>
        {CAMPANHA.nome}
      </span>
      <span style={{ color: "rgba(26,21,16,0.82)", fontSize: isMobile ? "0.72rem" : "0.85rem", fontWeight: 700 }}>
        {textoDaEscada()}
      </span>
      <span style={{ color: "rgba(26,21,16,0.75)", fontSize: isMobile ? "0.75rem" : "0.88rem", fontWeight: 700, textDecoration: "underline", whiteSpace: "nowrap" }}>
        aproveitar →
      </span>
    </Moldura>
  );
}
