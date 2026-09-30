/**
 * O contorno da vitrine enquanto ela monta no servidor.
 *
 * O Next mostra isto sozinho durante o carregamento da página. Não deixa mais
 * rápido; deixa parecer — e no 4G, vindo do Instagram, parecer é o que segura
 * a cliente em vez de ela voltar.
 *
 * Copia a mesma grade da vitrine (.products-grid) para as peças nascerem no
 * lugar onde o contorno já estava, sem a página pular.
 */
export default function CarregandoVitrine() {
  return (
    <div style={{ backgroundColor: "#FAF6EE", minHeight: "100vh", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div className="esqueleto" style={{ width: 180, height: 28, marginBottom: "0.6rem" }} />
        <div className="esqueleto" style={{ width: 120, height: 14, marginBottom: "1.75rem" }} />

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.75rem", flexWrap: "wrap" }}>
          {[92, 74, 110, 68].map((w, i) => (
            <div key={i} className="esqueleto" style={{ width: w, height: 32, borderRadius: "999px" }} />
          ))}
        </div>

        <div className="products-grid" style={{ display: "grid", gap: "1rem" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ borderRadius: "1rem", overflow: "hidden", backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)" }}>
              <div className="esqueleto" style={{ aspectRatio: "3/4", borderRadius: 0 }} />
              <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                <div className="esqueleto" style={{ width: "40%", height: 9 }} />
                <div className="esqueleto" style={{ width: "85%", height: 12 }} />
                <div className="esqueleto" style={{ width: "55%", height: 16 }} />
                <div className="esqueleto" style={{ width: "100%", height: 32, borderRadius: "0.5rem" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
