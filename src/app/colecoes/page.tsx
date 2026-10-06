import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coleções | Access Fit",
  description: "Cada coleção da Access Fit tem um propósito. Escolha pelo que você quer sentir, não só pela peça.",
};

export const dynamic = "force-dynamic";

export default async function ColecoesPage() {
  // Coleção vazia não aparece: durante a curadoria elas existem sem peça
  // dentro, e mandar a cliente para uma página vazia é pior que não ter link.
  const colecoes = await prisma.collection.findMany({
    where: { active: true, products: { some: { product: { active: true } } } },
    select: {
      name: true, slug: true, tagline: true, description: true, sazonal: true,
      _count: { select: { products: true } },
    },
    orderBy: [{ sazonal: "asc" }, { ordem: "asc" }, { name: "asc" }],
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "3rem 1.5rem 4rem" }}>
      <header style={{ textAlign: "center", marginBottom: "3rem" }}>
        <p style={{ color: "#b8891a", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Access Fit
        </p>
        <h1 style={{ color: "#1a1510", fontSize: "clamp(1.8rem, 5vw, 2.6rem)", fontWeight: 900, letterSpacing: "-0.03em", marginTop: "0.5rem" }}>
          Coleções
        </h1>
        <p style={{ color: "#7a6a4a", fontSize: "0.95rem", marginTop: "0.75rem", maxWidth: "46ch", marginInline: "auto", lineHeight: 1.6 }}>
          Cada uma tem um propósito. Escolha pelo que você quer sentir no treino,
          não só pelo tipo da peça.
        </p>
      </header>

      {colecoes.length === 0 ? (
        <p style={{ textAlign: "center", color: "#9a8060", padding: "3rem 0" }}>
          Em breve.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
          {colecoes.map((c, i) => (
            <Link key={c.slug} href={`/colecoes/${c.slug}`} className="surgir cartao-peca"
              style={{ textDecoration: "none", ["--atraso" as string]: Math.min(i, 8) }}>
              <article style={{
                backgroundColor: "#fff",
                border: "1px solid rgba(140,100,20,0.16)",
                borderTop: `3px solid ${c.sazonal ? "#8a4a6a" : "#b8891a"}`,
                borderRadius: "0.75rem",
                padding: "1.75rem 1.5rem",
                height: "100%",
                display: "flex", flexDirection: "column", gap: "0.5rem",
              }}>
                {c.sazonal && (
                  <span style={{ color: "#8a4a6a", fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    Cápsula de temporada
                  </span>
                )}
                <h2 style={{ color: "#1a1510", fontSize: "1.3rem", fontWeight: 900, letterSpacing: "0.02em" }}>
                  {c.name}
                </h2>
                {c.tagline && (
                  <p style={{ color: "#b8891a", fontSize: "0.9rem", fontStyle: "italic" }}>{c.tagline}</p>
                )}
                {c.description && (
                  <p style={{ color: "#7a6a4a", fontSize: "0.85rem", lineHeight: 1.6 }}>{c.description}</p>
                )}
                <span style={{ color: "#9a8060", fontSize: "0.75rem", marginTop: "auto", paddingTop: "0.75rem" }}>
                  {c._count.products} peça{c._count.products !== 1 ? "s" : ""} →
                </span>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
