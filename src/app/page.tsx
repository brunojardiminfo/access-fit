import { prisma } from "@/lib/prisma";
import { avisoDoLancamentoAtivo } from "@/lib/lancamento";
import HomeClient from "./HomeClient";
import { saleWhere } from "@/lib/saleHelper";
import { PECA_NA_VITRINE } from "@/lib/vitrine";
import { consultaDaVitrine } from "@/lib/cacheDaVitrine";
import { PECA_PUBLICA } from "@/lib/pecaPublica";
import { blackNovemberAtiva, chamadaDePrazo } from "@/lib/blackNovember";

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
      select: PECA_PUBLICA,
      take: 6,
    }),
    prisma.product.findMany({
      where: { featured: true, ...PECA_NA_VITRINE },
      select: PECA_PUBLICA,
      take: 4,
    }),
    prisma.product.findMany({
      where: PECA_NA_VITRINE,
      select: PECA_PUBLICA,
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.product.findMany({
      where: { ...PECA_NA_VITRINE, ...saleWhere() },
      select: PECA_PUBLICA,
      // Na Black November esta seção é a vitrine da promoção, não uma amostra:
      // 12 peças enchem a grade em qualquer largura e dão o que escolher sem
      // ter que clicar para ver mais.
      orderBy: { createdAt: "asc" },
      take: 12,
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
  const displaySaleProducts = saleProducts.slice(0, 12);

  /**
   * Durante a promoção, a seção do SALE veste a Black November.
   *
   * É a mesma vitrine — as peças em desconto são as mesmas —, então criar uma
   * seção à parte deixaria duas listas iguais na mesma página, uma embaixo da
   * outra. O que muda é o nome e a cara: quem chega pelo anúncio procura
   * "Black November" e precisa achar isso, não "🔥 SALE".
   *
   * A data manda: passado o dia 30, a seção volta a ser o SALE de sempre sem
   * ninguém mexer em nada.
   */
  const naBlack = blackNovemberAtiva();

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
      black={naBlack ? { prazo: chamadaDePrazo() } : null}
      categories={categories}
      categoryIcons={categoryIcons}
    />
  );
}
