import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/products/ProductCard";
import Link from "next/link";
import { saleWhere } from "@/lib/saleHelper";

export const dynamic = "force-dynamic";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; busca?: string; tamanho?: string; ordem?: string; sale?: string }>;
}) {
  const params = await searchParams;
  const { categoria, busca, tamanho, ordem, sale } = params;
  const soSale = sale === "1";

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(categoria ? { category: { slug: categoria } } : {}),
      ...(busca ? { name: { contains: busca, mode: "insensitive" } } : {}),
      ...(tamanho ? { sizes: { contains: tamanho } } : {}),
      ...(soSale ? saleWhere() : {}),
    },
    include: { category: true },
    orderBy: ordem === "preco_asc" ? { price: "asc" }
      : ordem === "preco_desc" ? { price: "desc" }
      : ordem === "nome" ? { name: "asc" }
      : { createdAt: "desc" },
  });

  const currentCategory = categories.find((c) => c.slug === categoria);

  // Collect all unique sizes across products
  const allSizes = Array.from(new Set(
    products.flatMap(p => {
      try { return JSON.parse(p.sizes) as string[]; } catch { return []; }
    })
  )).sort();

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { categoria, busca, tamanho, ordem, sale, ...overrides };
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
    const s = p.toString();
    return `/produtos${s ? `?${s}` : ""}`;
  };

  return (
    <div style={{ backgroundColor: "#FAF6EE", minHeight: "100vh", overflowX: "hidden" }}>

      {/* Breadcrumb + Título */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid rgba(140,100,20,0.1)", padding: "1rem 1.25rem" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <p style={{ fontSize: "0.72rem", color: "#9a8060", marginBottom: "0.4rem" }}>
            <Link href="/" style={{ color: "#b8891a", textDecoration: "none" }}>Início</Link>
            <span style={{ margin: "0 0.4rem" }}>›</span>
            {currentCategory ? (
              <><Link href="/produtos" style={{ color: "#b8891a", textDecoration: "none" }}>Coleção</Link><span style={{ margin: "0 0.4rem" }}>›</span>{currentCategory.name}</>
            ) : "Coleção"}
          </p>
          <h1 style={{ fontSize: "clamp(1.25rem, 3vw, 2rem)", fontWeight: 900, color: "#1a1510", lineHeight: 1.1 }}>
            {currentCategory ? currentCategory.name : busca ? `"${busca}"` : "Nossa Coleção"}
          </h1>
          <p style={{ color: "#9a8060", fontSize: "0.78rem", marginTop: "0.2rem" }}>
            {products.length} peça{products.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Mobile: filtros em scroll horizontal */}
      <div className="hide-desktop" style={{ flexDirection: "column", borderBottom: "1px solid rgba(140,100,20,0.08)" }}>
        {/* Categorias */}
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", padding: "0.75rem 1.25rem 0", WebkitOverflowScrolling: "touch" }}>
          <Link href={buildUrl({ categoria: undefined })}
            style={{ flexShrink: 0, padding: "0.4rem 0.875rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, textDecoration: "none", backgroundColor: !categoria ? "#b8891a" : "#fff", color: !categoria ? "#fff" : "#7a6030", border: !categoria ? "none" : "1px solid rgba(140,100,20,0.2)" }}>
            Todos
          </Link>
          <Link href={buildUrl({ sale: soSale ? undefined : "1" })}
            style={{ flexShrink: 0, padding: "0.4rem 0.875rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap", backgroundColor: soSale ? "#e74c3c" : "#fff", color: soSale ? "#fff" : "#e74c3c", border: soSale ? "none" : "1px solid rgba(231,76,60,0.35)" }}>
            🔥 SALE
          </Link>
          {categories.map(cat => (
            <Link key={cat.id} href={buildUrl({ categoria: cat.slug })}
              style={{ flexShrink: 0, padding: "0.4rem 0.875rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, textDecoration: "none", backgroundColor: categoria === cat.slug ? "#b8891a" : "#fff", color: categoria === cat.slug ? "#fff" : "#7a6030", border: categoria === cat.slug ? "none" : "1px solid rgba(140,100,20,0.2)" }}>
              {cat.name}
            </Link>
          ))}
        </div>
        {/* Tamanhos mobile */}
        {allSizes.length > 0 && (
          <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", padding: "0.5rem 1.25rem 0.75rem", WebkitOverflowScrolling: "touch" }}>
            {tamanho && (
              <Link href={buildUrl({ tamanho: undefined })}
                style={{ flexShrink: 0, padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", backgroundColor: "#fee8e8", color: "#c04040", border: "1px solid rgba(192,64,64,0.2)" }}>
                ✕ {tamanho}
              </Link>
            )}
            {allSizes.map(s => (
              <Link key={s} href={buildUrl({ tamanho: tamanho === s ? undefined : s })}
                style={{ flexShrink: 0, padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", backgroundColor: tamanho === s ? "#1a1510" : "#fff", color: tamanho === s ? "#fff" : "#5a4a2a", border: `1px solid ${tamanho === s ? "#1a1510" : "rgba(140,100,20,0.2)"}` }}>
                {s}
              </Link>
            ))}
          </div>
        )}
        {/* Ordenação mobile */}
        <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", padding: "0 1.25rem 0.75rem", WebkitOverflowScrolling: "touch" }}>
          <span style={{ fontSize: "0.72rem", color: "#9a8060", flexShrink: 0, alignSelf: "center" }}>Ordem:</span>
          {[
            { label: "Recentes", value: "" },
            { label: "↑ Preço", value: "preco_asc" },
            { label: "↓ Preço", value: "preco_desc" },
            { label: "Nome", value: "nome" },
          ].map(o => (
            <Link key={o.value} href={buildUrl({ ordem: o.value || undefined })}
              style={{ flexShrink: 0, fontSize: "0.75rem", padding: "0.3rem 0.75rem", borderRadius: "999px", textDecoration: "none", fontWeight: 600, backgroundColor: (ordem || "") === o.value ? "#1a1510" : "#fff", color: (ordem || "") === o.value ? "#fff" : "#9a8060", border: "1px solid rgba(140,100,20,0.15)" }}>
              {o.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop: título + ordenação */}
      <div className="hide-mobile" style={{ backgroundColor: "#fff", borderBottom: "1px solid rgba(140,100,20,0.08)", padding: "0.75rem 2rem" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.78rem", color: "#9a8060", whiteSpace: "nowrap" }}>Ordenar por:</span>
          {[
            { label: "Mais recentes", value: "" },
            { label: "Menor preço", value: "preco_asc" },
            { label: "Maior preço", value: "preco_desc" },
            { label: "Nome", value: "nome" },
          ].map(o => (
            <Link key={o.value} href={buildUrl({ ordem: o.value || undefined })}
              style={{ fontSize: "0.78rem", padding: "0.3rem 0.7rem", borderRadius: "999px", textDecoration: "none", fontWeight: 600, backgroundColor: (ordem || "") === o.value ? "#1a1510" : "#FAF6EE", color: (ordem || "") === o.value ? "#FAF6EE" : "#9a8060", border: "1px solid rgba(140,100,20,0.15)" }}>
              {o.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "1.5rem 1.5rem", display: "flex", gap: "2rem", alignItems: "flex-start" }}>

        {/* Sidebar desktop */}
        <aside style={{ width: 230, flexShrink: 0, position: "sticky", top: 88 }} className="hide-mobile">
          <div style={{ backgroundColor: "#fff", borderRadius: "1rem", border: "1px solid rgba(140,100,20,0.1)", overflow: "hidden" }}>

            {/* SALE */}
            <Link href={buildUrl({ sale: soSale ? undefined : "1" })}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", padding: "0.875rem 1.25rem", borderBottom: "1px solid rgba(140,100,20,0.08)", textDecoration: "none", backgroundColor: soSale ? "#e74c3c" : "#fff5f3" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 900, color: soSale ? "#fff" : "#e74c3c" }}>🔥 SALE</span>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap", color: soSale ? "rgba(255,255,255,0.8)" : "#c0705a" }}>
                {soSale ? "✕ limpar" : "ver ofertas"}
              </span>
            </Link>

            {/* Categorias */}
            <div style={{ padding: "1.25rem", borderBottom: "1px solid rgba(140,100,20,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 800, color: "#1a1510", letterSpacing: "0.08em", textTransform: "uppercase" }}>Coleções</p>
                {categoria && <Link href={buildUrl({ categoria: undefined })} style={{ fontSize: "0.68rem", color: "#b8891a", textDecoration: "none", fontWeight: 700 }}>Limpar</Link>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <Link href={buildUrl({ categoria: undefined })}
                  style={{ padding: "0.45rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.85rem", fontWeight: !categoria ? 700 : 500, textDecoration: "none", backgroundColor: !categoria ? "rgba(184,137,26,0.08)" : "transparent", color: !categoria ? "#b8891a" : "#5a4a2a", borderLeft: !categoria ? "3px solid #b8891a" : "3px solid transparent" }}>
                  Todos
                </Link>
                {categories.map(cat => (
                  <Link key={cat.id} href={buildUrl({ categoria: cat.slug })}
                    style={{ padding: "0.45rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.85rem", fontWeight: categoria === cat.slug ? 700 : 500, textDecoration: "none", backgroundColor: categoria === cat.slug ? "rgba(184,137,26,0.08)" : "transparent", color: categoria === cat.slug ? "#b8891a" : "#5a4a2a", borderLeft: categoria === cat.slug ? "3px solid #b8891a" : "3px solid transparent" }}>
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Tamanhos */}
            {allSizes.length > 0 && (
              <div style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                  <p style={{ fontSize: "0.72rem", fontWeight: 800, color: "#1a1510", letterSpacing: "0.08em", textTransform: "uppercase" }}>Tamanho</p>
                  {tamanho && <Link href={buildUrl({ tamanho: undefined })} style={{ fontSize: "0.68rem", color: "#b8891a", textDecoration: "none", fontWeight: 700 }}>Limpar</Link>}
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {allSizes.map(s => (
                    <Link key={s} href={buildUrl({ tamanho: tamanho === s ? undefined : s })}
                      style={{ padding: "0.35rem 0.7rem", borderRadius: "0.5rem", fontSize: "0.8rem", fontWeight: 700, textDecoration: "none", backgroundColor: tamanho === s ? "#1a1510" : "#FAF6EE", color: tamanho === s ? "#FAF6EE" : "#5a4a2a", border: `1px solid ${tamanho === s ? "#1a1510" : "rgba(140,100,20,0.2)"}` }}>
                      {s}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Grid */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {products.length === 0 ? (
            <div style={{ textAlign: "center", padding: "5rem 1rem", backgroundColor: "#fff", borderRadius: "1rem", border: "1px solid rgba(140,100,20,0.1)" }}>
              <p style={{ color: "#9a8060", fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Nenhum produto encontrado</p>
              <Link href="/produtos" style={{ color: "#b8891a", fontWeight: 700, textDecoration: "none" }}>Ver toda a coleção →</Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem" }} className="products-grid">
              {products.map(product => (
                <ProductCard key={product.id} product={product as any} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
