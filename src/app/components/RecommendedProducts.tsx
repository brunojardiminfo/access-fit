"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, parseJson } from "@/lib/utils";
import { getSaleInfo } from "@/lib/saleHelper";

type Recomendacao = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string;
  createdAt: string | Date;
  onSale?: boolean;
  saleDiscount?: number | null;
  category: { name: string };
};

type Props = {
  productSlug: string;
};

export default function RecommendedProducts({ productSlug }: Props) {
  const [recomendacoes, setRecomendacoes] = useState<Recomendacao[]>([]);
  const [tipo, setTipo] = useState<string>("");
  const [categorySlug, setCategorySlug] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function buscarRecomendacoes() {
      try {
        const response = await fetch(`/api/produtos/${productSlug}/recomendacoes`);
        const data = await response.json();

        if (response.ok && data.recomendacoes.length > 0) {
          setRecomendacoes(data.recomendacoes);
          setTipo(data.tipo);
          setCategorySlug(data.categorySlug || "");
        }
      } catch (error) {
        console.error("Erro ao buscar recomendações:", error);
      } finally {
        setLoading(false);
      }
    }

    buscarRecomendacoes();
  }, [productSlug]);

  if (loading || recomendacoes.length === 0) return null;

  const titulo =
    tipo === "vendidos_juntos"
      ? "👥 Clientes também compraram"
      : "🎯 Você pode gostar";

  return (
    <div style={{ marginTop: "2rem", padding: "0 1rem" }}>
      <h3 style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--gold)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
        {titulo}
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {recomendacoes.map((produto) => {
          const images = parseJson<string[]>(produto.images, []);
          const createdDate = typeof produto.createdAt === "string" ? new Date(produto.createdAt) : produto.createdAt;
          const saleInfo = getSaleInfo({
            price: produto.price,
            createdAt: createdDate,
            onSale: produto.onSale,
            saleDiscount: produto.saleDiscount,
          });
          const finalPrice = saleInfo ? saleInfo.salePrice : produto.price;
          return (
            <Link
              key={produto.id}
              href={`/produtos/${produto.slug}`}
              style={{
                textDecoration: "none",
                borderRadius: "0.75rem",
                overflow: "hidden",
                border: "1px solid var(--border)",
                transition: "all 0.2s",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 4px 12px rgba(184,137,26,0.2)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              {/* Imagem */}
              <div
                style={{
                  backgroundColor: "var(--bg-soft)",
                  aspectRatio: "3/4",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {images[0] ? (
                  <img
                    src={images[0]}
                    alt={produto.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div style={{ color: "var(--gold)", fontSize: "0.7rem", opacity: 0.5 }}>
                    Foto em breve
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: "0.75rem", flex: 1, display: "flex", flexDirection: "column" }}>
                <p
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    margin: "0 0 0.25rem 0",
                  }}
                >
                  {produto.category.name}
                </p>
                <p
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                    margin: 0,
                    lineHeight: 1.2,
                    flex: 1,
                  }}
                >
                  {produto.name}
                </p>
                <p
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 900,
                    color: saleInfo ? "#e74c3c" : "var(--gold)",
                    margin: "0.5rem 0 0 0",
                  }}
                >
                  {formatCurrency(finalPrice)}
                  {saleInfo && (
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textDecoration: "line-through", marginLeft: "0.35rem", fontWeight: 700 }}>
                      {formatCurrency(produto.price)}
                    </span>
                  )}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {categorySlug && (
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <Link
            href={`/produtos?categoria=${categorySlug}`}
            style={{
              display: "inline-block",
              padding: "0.75rem 1.5rem",
              backgroundColor: "var(--gold)",
              color: "#16110b",
              borderRadius: "0.625rem",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "0.9rem",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "#a07010";
              (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "var(--gold)";
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
            }}
          >
            Ver mais →
          </Link>
        </div>
      )}
    </div>
  );
}
