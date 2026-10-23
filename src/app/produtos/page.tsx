import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/products/ProductCard";
import Link from "next/link";
import { saleWhere } from "@/lib/saleHelper";
import { PECA_NA_VITRINE } from "@/lib/vitrine";

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
      ...PECA_NA_VITRINE,
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
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh", overflowX: "hidden" }}>

      {/* Breadcrumb + Título */}
      <div style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)", padding: "1rem 1.25rem" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
            <Link href="/" style={{ color: "var(--gold)", textDecoration: "none" }}>Início</Link>
            <span style={{ margin: "0 0.4rem" }}>›</span>
            {currentCategory ? (
              <><Link href="/produtos" style={{ color: "var(--gold)", textDecoration: "none" }}>Coleção</Link><span style={{ margin: "0 0.4rem" }}>›</span>{currentCategory.name}</>
            ) : "Coleção"}
          </p>
          <h1 style={{ fontSize: "clamp(1.25rem, 3vw, 2rem)", fontWeight: 900, color: "var(--text-main)", lineHeight: 1.1 }}>
            {currentCategory ? currentCategory.name : busca ? `"${busca}"` : "Nossa Coleção"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.2rem" }}>
            {products.length} peça{products.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Mobile: filtros em scroll horizontal */}
      <div className="hide-desktop" style={{ flexDirection: "column", borderBottom: "1px solid var(--border)" }}>
        {/* Categorias */}
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", padding: "0.75rem 1.25rem 0", WebkitOverflowScrolling: "touch" }}>
          <Link href={buildUrl({ categoria: undefined })}
            style={{ flexShrink: 0, padding: "0.4rem 0.875rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, textDecoration: "none", backgroundColor: !categoria ? "var(--gold)" : "var(--bg-card)", color: !categoria ? "var(--bg)" : "var(--text-sub)", border: !categoria ? "none" : "1px solid var(--border)" }}>
            Todos
          </Link>
          <Link href={buildUrl({ sale: soSale ? undefined : "1" })}
            style={{ flexShrink: 0, padding: "0.4rem 0.875rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap", backgroundColor: soSale ? "var(--sale)" : "var(--sale-veu)", color: soSale ? "var(--bg)" : "var(--sale-text)", border: soSale ? "none" : "1px solid rgba(231,76,60,0.35)" }}>
            🔥 SALE
          </Link>
          {categories.map(cat => (
            <Link key={cat.id} href={buildUrl({ categoria: cat.slug })}
              style={{ flexShrink: 0, padding: "0.4rem 0.875rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 700, textDecoration: "none", backgroundColor: categoria === cat.slug ? "var(--gold)" : "var(--bg-card)", color: categoria === cat.slug ? "var(--bg)" : "var(--text-sub)", border: categoria === cat.slug ? "none" : "1px solid var(--border)" }}>
              {cat.name}
            </Link>
          ))}
        </div>
        {/* Tamanhos mobile */}
        {allSizes.length > 0 && (
          <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", padding: "0.5rem 1.25rem 0.75rem", WebkitOverflowScrolling: "touch" }}>
            {tamanho && (
              <Link href={buildUrl({ tamanho: undefined })}
                style={{ flexShrink: 0, padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", backgroundColor: "rgba(255,138,122,0.14)", color: "#ff8a7a", border: "1px solid rgba(255,138,122,0.28)" }}>
                ✕ {tamanho}
              </Link>
            )}
            {allSizes.map(s => (
              <Link key={s} href={buildUrl({ tamanho: tamanho === s ? undefined : s })}
                style={{ flexShrink: 0, padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", backgroundColor: tamanho === s ? "var(--bg-soft)" : "var(--bg-card)", color: tamanho === s ? "var(--text-main)" : "var(--text-sub)", border: `1px solid ${tamanho === s ? "#1a1510" : "var(--border)"}` }}>
                {s}
              </Link>
            ))}
          </div>
        )}
        {/* Ordenação mobile */}
        <div style={{ display: "flex", gap: "0.4rem", overflowX: "auto", padding: "0 1.25rem 0.75rem", WebkitOverflowScrolling: "touch" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", flexShrink: 0, alignSelf: "center" }}>Ordem:</span>
          {[
            { label: "Recentes", value: "" },
            { label: "↑ Preço", value: "preco_asc" },
            { label: "↓ Preço", value: "preco_desc" },
            { label: "Nome", value: "nome" },
          ].map(o => (
            <Link key={o.value} href={buildUrl({ ordem: o.value || undefined })}
              style={{ flexShrink: 0, fontSize: "0.75rem", padding: "0.3rem 0.75rem", borderRadius: "999px", textDecoration: "none", fontWeight: 600, backgroundColor: (ordem || "") === o.value ? "var(--bg-soft)" : "var(--bg-card)", color: (ordem || "") === o.value ? "var(--text-main)" : "var(--text-muted)", border: "1px solid var(--border)" }}>
              {o.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop: título + ordenação */}
      <div className="hide-mobile" style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)", padding: "0.75rem 2rem" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Ordenar por:</span>
          {[
            { label: "Mais recentes", value: "" },
            { label: "Menor preço", value: "preco_asc" },
            { label: "Maior preço", value: "preco_desc" },
            { label: "Nome", value: "nome" },
          ].map(o => (
            <Link key={o.value} href={buildUrl({ ordem: o.value || undefined })}
              style={{ fontSize: "0.78rem", padding: "0.3rem 0.7rem", borderRadius: "999px", textDecoration: "none", fontWeight: 600, backgroundColor: (ordem || "") === o.value ? "var(--bg-soft)" : "var(--bg)", color: (ordem || "") === o.value ? "var(--text-main)" : "var(--text-muted)", border: "1px solid var(--border)" }}>
              {o.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "1.5rem 1.5rem", display: "flex", gap: "2rem", alignItems: "flex-start" }}>

        {/* Sidebar desktop */}
        <aside style={{ width: 230, flexShrink: 0, position: "sticky", top: 88 }} className="hide-mobile">
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: "1rem", border: "1px solid var(--border)", overflow: "hidden" }}>

            {/* SALE */}
            <Link href={buildUrl({ sale: soSale ? undefined : "1" })}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--border)", textDecoration: "none", backgroundColor: soSale ? "var(--sale)" : "var(--sale-veu)" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 900, color: soSale ? "var(--bg)" : "var(--sale-text)" }}>🔥 SALE</span>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, whiteSpace: "nowrap", color: soSale ? "var(--bg)" : "var(--sale-text)" }}>
                {soSale ? "✕ limpar" : "ver ofertas"}
              </span>
            </Link>

            {/* Categorias */}
            <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                <p style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Coleções</p>
                {categoria && <Link href={buildUrl({ categoria: undefined })} style={{ fontSize: "0.68rem", color: "var(--gold)", textDecoration: "none", fontWeight: 700 }}>Limpar</Link>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <Link href={buildUrl({ categoria: undefined })}
                  style={{ padding: "0.45rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.85rem", fontWeight: !categoria ? 700 : 500, textDecoration: "none", backgroundColor: !categoria ? "rgba(184,137,26,0.08)" : "transparent", color: !categoria ? "var(--gold)" : "var(--text-sub)", borderLeft: !categoria ? "3px solid var(--gold)" : "3px solid transparent" }}>
                  Todos
                </Link>
                {categories.map(cat => (
                  <Link key={cat.id} href={buildUrl({ categoria: cat.slug })}
                    style={{ padding: "0.45rem 0.75rem", borderRadius: "0.5rem", fontSize: "0.85rem", fontWeight: categoria === cat.slug ? 700 : 500, textDecoration: "none", backgroundColor: categoria === cat.slug ? "rgba(184,137,26,0.08)" : "transparent", color: categoria === cat.slug ? "var(--gold)" : "var(--text-sub)", borderLeft: categoria === cat.slug ? "3px solid var(--gold)" : "3px solid transparent" }}>
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Tamanhos */}
            {allSizes.length > 0 && (
              <div style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                  <p style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Tamanho</p>
                  {tamanho && <Link href={buildUrl({ tamanho: undefined })} style={{ fontSize: "0.68rem", color: "var(--gold)", textDecoration: "none", fontWeight: 700 }}>Limpar</Link>}
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {allSizes.map(s => (
                    <Link key={s} href={buildUrl({ tamanho: tamanho === s ? undefined : s })}
                      style={{ padding: "0.35rem 0.7rem", borderRadius: "0.5rem", fontSize: "0.8rem", fontWeight: 700, textDecoration: "none", backgroundColor: tamanho === s ? "var(--bg-soft)" : "var(--bg)", color: tamanho === s ? "var(--text-main)" : "var(--text-sub)", border: `1px solid ${tamanho === s ? "#1a1510" : "var(--border)"}` }}>
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
            <div style={{ textAlign: "center", padding: "5rem 1rem", backgroundColor: "var(--bg-card)", borderRadius: "1rem", border: "1px solid var(--border)" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }}>Nenhum produto encontrado</p>
              <Link href="/produtos" style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "none" }}>Ver toda a coleção →</Link>
            </div>
          ) : (
            <div className="grade-vitrine">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product as any} indice={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
