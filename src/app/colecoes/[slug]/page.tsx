import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/products/ProductCard";
import { compararPorPapel } from "@/lib/colecoes";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await prisma.collection.findUnique({
    where: { slug },
    select: { name: true, tagline: true, description: true },
  });
  if (!c) return { title: "Coleção | Access Fit" };
  return {
    title: `${c.name} | Access Fit`,
    description: c.tagline || c.description || undefined,
  };
}

export default async function ColecaoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const colecao = await prisma.collection.findUnique({
    where: { slug },
    select: {
      name: true, tagline: true, description: true, sazonal: true, active: true,
      products: {
        where: { product: { active: true } },
        select: { product: { include: { category: true } } },
      },
    },
  });

  if (!colecao || !colecao.active) notFound();

  // Hero primeiro: é para isso que o papel existe. Sem ele a vitrine sairia
  // por nome ou por data, que não diz nada à cliente sobre o que ver antes.
  const pecas = colecao.products
    .map(p => p.product)
    .sort((a, b) => compararPorPapel(a, b) || a.name.localeCompare(b.name));

  return (
    <div style={{ backgroundColor: "#FAF6EE", minHeight: "100vh", overflowX: "hidden" }}>
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid rgba(140,100,20,0.1)", padding: "1rem 1.25rem" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <p style={{ fontSize: "0.72rem", color: "#9a8060" }}>
            <Link href="/" style={{ color: "#b8891a", textDecoration: "none" }}>Início</Link>
            <span style={{ margin: "0 0.4rem" }}>›</span>
            <Link href="/colecoes" style={{ color: "#b8891a", textDecoration: "none" }}>Coleções</Link>
            <span style={{ margin: "0 0.4rem" }}>›</span>
            {colecao.name}
          </p>
        </div>
      </div>

      <header style={{ maxWidth: 1400, margin: "0 auto", padding: "2.5rem 1.5rem 1.5rem", textAlign: "center" }}>
        {colecao.sazonal && (
          <p style={{ color: "#8a4a6a", fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Cápsula de temporada
          </p>
        )}
        <h1 style={{ color: "#1a1510", fontSize: "clamp(1.9rem, 6vw, 3rem)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
          {colecao.name}
        </h1>
        {colecao.tagline && (
          <p style={{ color: "#b8891a", fontSize: "clamp(1rem, 2.6vw, 1.25rem)", fontStyle: "italic", marginTop: "0.6rem" }}>
            {colecao.tagline}
          </p>
        )}
        {colecao.description && (
          <p style={{ color: "#7a6a4a", fontSize: "0.95rem", lineHeight: 1.65, marginTop: "0.9rem", maxWidth: "52ch", marginInline: "auto" }}>
            {colecao.description}
          </p>
        )}
      </header>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 1.5rem 4rem" }}>
        {pecas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem", backgroundColor: "#fff", borderRadius: "1rem", border: "1px solid rgba(140,100,20,0.1)" }}>
            <p style={{ color: "#9a8060", fontWeight: 600, marginBottom: "1rem" }}>Ainda não tem peça nesta coleção.</p>
            <Link href="/produtos" style={{ color: "#b8891a", fontWeight: 700, textDecoration: "none" }}>Ver todas as peças →</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem" }} className="products-grid">
            {pecas.map((p, i) => (
              <ProductCard key={p.id} product={p as any} indice={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
