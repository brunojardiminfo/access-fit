"use client";

import { useState } from "react";

type SizeStats = {
  size: string;
  count: number;
  percentage: number;
};

type RecommendationResult = {
  recommendedSize: string;
  stats: SizeStats[];
  similarClientsCount: number;
};

type Props = {
  productSizeRange?: string | null;
  productName?: string;
};

export default function SizeGuide({ productSizeRange, productName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bustSize, setBustSize] = useState("");
  const [waistSize, setWaistSize] = useState("");
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkSizeFit = (recommendedSize: string): boolean => {
    if (!productSizeRange) return true; // Se não tem sizeRange definido, assume que serve

    const range = productSizeRange.toUpperCase();

    // PM = P/M (38-42), GGG = G/GG (42-48)
    if (range === "PM") return ["P", "M"].includes(recommendedSize);
    if (range === "GGG") return ["G", "GG"].includes(recommendedSize);

    return true; // Default: assume que serve
  };

  const handleGetRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        height: parseInt(height),
        weight: parseInt(weight),
        bustSize: bustSize ? parseInt(bustSize) : null,
        waistSize: waistSize ? parseInt(waistSize) : null,
      };

      console.log("📤 Enviando requisição:", payload);

      const response = await fetch("/api/tamanho/recomendacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("📥 Status:", response.status);

      const data = await response.json();
      console.log("📄 Response:", data);

      if (!response.ok) {
        const errorMsg = data.error || `Erro ${response.status}`;
        setError(errorMsg);
        console.error("❌ Erro:", errorMsg);
        return;
      }

      setResult(data);
      console.log("✅ Recomendação recebida!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(`Erro na requisição: ${errorMsg}`);
      console.error("❌ Erro de requisição:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: "2rem", padding: "0 1rem" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "1rem",
          backgroundColor: isOpen ? "var(--bg-soft)" : "var(--bg)",
          border: "2px solid var(--gold)",
          color: "var(--text-sub)",
          fontSize: "1rem",
          fontWeight: 700,
          cursor: "pointer",
          borderRadius: "8px",
          textAlign: "left",
        }}
      >
        {isOpen ? "▼ Fechar" : "▶ Guia de Tamanho Inteligente"}
      </button>

      {isOpen && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1.5rem",
            backgroundColor: "var(--bg)",
            borderRadius: "8px",
            border: "1px solid var(--border)",
          }}
        >
          <form onSubmit={handleGetRecommendation}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-sub)" }}>
                  Altura (cm)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Ex: 165"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-sub)" }}>
                  Peso (kg)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Ex: 62"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-sub)" }}>
                  Busto (cm) - Opcional
                </label>
                <input
                  type="number"
                  value={bustSize}
                  onChange={(e) => setBustSize(e.target.value)}
                  placeholder="Ex: 87"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-sub)" }}>
                  Cintura (cm) - Opcional
                </label>
                <input
                  type="number"
                  value={waistSize}
                  onChange={(e) => setWaistSize(e.target.value)}
                  placeholder="Ex: 72"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: loading ? "var(--bg-card)" : "var(--gold)",
                color: loading ? "var(--text-muted)" : "var(--bg)",
                border: "none",
                borderRadius: "4px",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Analisando..." : "Ver Recomendação"}
            </button>

            {error && (
              <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "rgba(255,138,122,0.14)", color: "#ff8a7a", borderRadius: "4px", fontSize: "0.9rem" }}>
                {error}
              </div>
            )}
          </form>

          {result && (
            <div style={{ marginTop: "2rem" }}>
              {!checkSizeFit(result.recommendedSize) && (
                <div style={{ marginBottom: "1rem", padding: "1rem", backgroundColor: "rgba(255,138,122,0.14)", border: "2px solid #ff8a7a", borderRadius: "8px", color: "#ff8a7a" }}>
                  <p style={{ margin: 0, fontWeight: 700, marginBottom: "0.25rem" }}>⚠️ Atenção!</p>
                  <p style={{ margin: 0, fontSize: "0.9rem" }}>
                    {productName} é tamanho único para {productSizeRange === "PM" ? "P/M (38-42)" : "G/GG (42-48)"}.
                    Você recomendado é <strong>{result.recommendedSize}</strong> - pode não servir bem.
                  </p>
                </div>
              )}

              <div style={{ marginBottom: "1.5rem", padding: "1.5rem", backgroundColor: "var(--bg-card)", borderRadius: "8px", border: "2px solid var(--gold)" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-sub)", marginBottom: "0.5rem" }}>Tamanho Recomendado:</p>
                <p style={{ margin: 0, fontSize: "2.5rem", fontWeight: 700, color: "var(--gold)" }}>{result.recommendedSize}</p>
              </div>

              {result.similarClientsCount > 0 && (
                <div>
                  <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-sub)", marginBottom: "1rem" }}>
                    Baseado em {result.similarClientsCount} clientes com medidas similares:
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                    {result.stats.map((stat) => (
                      <div
                        key={stat.size}
                        style={{
                          padding: "1rem",
                          backgroundColor: stat.size === result.recommendedSize ? "var(--bg-soft)" : "var(--bg-card)",
                          border: `2px solid ${stat.size === result.recommendedSize ? "var(--gold)" : "var(--border)"}`,
                          borderRadius: "8px",
                          textAlign: "center",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-sub)", marginBottom: "0.5rem" }}>
                          Tamanho {stat.size}
                        </p>
                        <div style={{ width: "100%", height: "8px", backgroundColor: "var(--bg-soft)", borderRadius: "4px", overflow: "hidden", marginBottom: "0.5rem" }}>
                          <div
                            style={{
                              height: "100%",
                              backgroundColor: "var(--gold)",
                              width: `${stat.percentage}%`,
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                        <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--gold)" }}>{stat.percentage}%</p>
                        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-sub)", marginTop: "0.25rem" }}>({stat.count} clientes)</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
