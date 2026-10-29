import { prisma } from "@/lib/prisma";
import { avisoDoLancamentoAtivo } from "@/lib/lancamento";
import HomeClient from "./HomeClient";
import { saleWhere } from "@/lib/saleHelper";
import { PECA_NA_VITRINE } from "@/lib/vitrine";
import { consultaDaVitrine } from "@/lib/cacheDaVitrine";

export const dynamic = "force-dynamic";

/**
 * As cinco consultas da home, guardadas juntas: é uma visita só, e separá-las
 * faria o banco acordar cinco vezes em vez de uma.
 *
 * `saleWhere()` é chamado aqui dentro de propósito. Ele usa a data de hoje
 * para saber quem já tem os 90 dias; calculado fora, a data congelaria no
 * fechamento do cache. Dentro, ela é recalculada a cada remontagem — e, numa
 * regra de 90 dias, uma hora de atraso não muda nada.
 */
const vitrineDaHome = consultaDaVitrine(["home"], async () => {
  const [heroProducts, featuredProducts, newArrivals, saleProducts, categories] = await Promise.all([
    prisma.product.findMany({
      where: { featuredHero: true, ...PECA_NA_VITRINE },
      include: { category: true },
      take: 6,
    }),
    prisma.product.findMany({
      where: { featured: true, ...PECA_NA_VITRINE },
      include: { category: true },
      take: 4,
    }),
    prisma.product.findMany({
      where: PECA_NA_VITRINE,
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.product.findMany({
      where: { ...PECA_NA_VITRINE, ...saleWhere() },
      include: { category: true },
      orderBy: { createdAt: "asc" },
      take: 8,
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { heroProducts, featuredProducts, newArrivals, saleProducts, categories };
});

export default async function HomePage() {
  const { heroProducts, featuredProducts, newArrivals, saleProducts, categories } =
    await vitrineDaHome();

  // O carrossel do topo quer ao menos 4 peças: completa com as novidades
  const displayHeroProducts = heroProducts.length >= 4
    ? heroProducts
    : [...heroProducts, ...newArrivals.filter(n => !heroProducts.some(h => h.id === n.id))].slice(0, 6);
  const displayFeaturedProducts = featuredProducts.length >= 4 ? featuredProducts : newArrivals.slice(4, 8);
  const displaySaleProducts = saleProducts.slice(0, 8);

  const categoryIcons: Record<string, string> = {
    "Conjuntos": "👗", "Leggings": "🩱", "Tops": "👙",
    "Macaquinhos": "🤸", "Macacões": "🦋", "Camisetas": "👕",
    "Shorts": "🩳", "Jaquetas": "🧥", "Casacos": "🧣",
  };

  return (
    <HomeClient
      mostrarAviso={avisoDoLancamentoAtivo()}
      newArrivals={newArrivals}
      heroProducts={displayHeroProducts}
      featuredProducts={displayFeaturedProducts}
      saleProducts={displaySaleProducts}
      categories={categories}
      categoryIcons={categoryIcons}
    />
  );
}
