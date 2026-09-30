/**
 * O contorno da página do produto: foto grande à esquerda, dados à direita.
 * Mesma ideia da vitrine — o lugar das coisas já aparece, o conteúdo chega.
 */
export default function CarregandoProduto() {
  return (
    <div style={{ backgroundColor: "#FAF6EE", minHeight: "100vh" }}>
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid rgba(140,100,20,0.1)", padding: "0.875rem 2rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="esqueleto" style={{ width: 210, height: 11 }} />
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.25rem" }}>
        <div className="detalhe-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div className="esqueleto" style={{ aspectRatio: "3/4", borderRadius: "1.25rem" }} />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="esqueleto" style={{ width: 64, height: 80, borderRadius: "0.6rem" }} />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            <div className="esqueleto" style={{ width: "35%", height: 10 }} />
            <div className="esqueleto" style={{ width: "80%", height: 26 }} />
            <div className="esqueleto" style={{ width: "45%", height: 30 }} />
            <div className="esqueleto" style={{ width: "100%", height: 1, marginTop: "0.4rem" }} />
            <div className="esqueleto" style={{ width: "30%", height: 11 }} />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="esqueleto" style={{ width: 52, height: 40, borderRadius: "0.5rem" }} />
              ))}
            </div>
            <div className="esqueleto" style={{ width: "100%", height: 54, borderRadius: "0.875rem", marginTop: "1rem" }} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .detalhe-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
