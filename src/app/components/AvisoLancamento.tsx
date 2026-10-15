/**
 * Faixa de aviso do lançamento da Alma de Floripa.
 *
 * A data e a regra de "até quando aparece" moram em src/lib/lancamento.ts;
 * aqui é só o desenho.
 */

/**
 * Quem decide se a faixa aparece é o servidor, em page.tsx, que compara a hora
 * com FIM_DO_AVISO e passa a resposta pronta. Ler o relógio aqui dentro seria
 * ler estado de fora durante o render — e, numa primeira versão, me levou a
 * guardar isso em useState dentro de um useEffect, que só fazia a faixa piscar.
 */
export default function AvisoLancamento() {

  return (
    <aside
      aria-label="Aviso de lançamento"
      style={{
        background: "linear-gradient(90deg, #14100a 0%, #3a2410 38%, #7a4a1c 62%, #3a2410 85%, #14100a 100%)",
        borderBottom: "1px solid rgba(242,181,68,0.28)",
        padding: "0.7rem 1rem",
      }}
    >
      <div style={{
        maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap",
        alignItems: "center", justifyContent: "center", gap: "0.45rem 0.9rem", textAlign: "center",
      }}>
        {/* "Lançamento" e não "Nova coleção": o selo do hero, logo abaixo, já
            diz "Nova Coleção 2026" — duas vezes a mesma palavra em dois dedos
            de distância faz a página parecer descuidada. */}
        <span style={{ color: "#ffd87a", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          ✦ Lançamento
        </span>
        <strong style={{ color: "#FAF6EE", fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.01em" }}>
          Alma de Floripa
        </strong>
        <span style={{ color: "rgba(250,246,238,0.72)", fontSize: "0.85rem" }}>
          a primeira linha de biquínis da Access Fit
        </span>
        <span style={{
          color: "#14100a", backgroundColor: "#f2b544", fontSize: "0.8rem", fontWeight: 900,
          padding: "0.2rem 0.65rem", borderRadius: "999px", letterSpacing: "0.02em", whiteSpace: "nowrap",
        }}>
          20.10
        </span>
        <a
          href="https://wa.me/5551986596705?text=Oi!%20Quero%20ser%20avisada%20quando%20a%20cole%C3%A7%C3%A3o%20Alma%20de%20Floripa%20chegar."
          target="_blank" rel="noopener noreferrer"
          style={{
            color: "#ffd87a", fontSize: "0.82rem", fontWeight: 700, textDecoration: "underline",
            textUnderlineOffset: "3px", whiteSpace: "nowrap",
          }}
        >
          quero ser avisada
        </a>
      </div>
    </aside>
  );
}
