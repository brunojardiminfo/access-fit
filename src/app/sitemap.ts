import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { consultaDaVitrine } from "@/lib/cacheDaVitrine";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.accessfit.com.br";

/**
 * O sitemap é buscado por robô de buscador, de madrugada, quando não há
 * ninguém na loja. Sem cache, era ele quem acordava o banco na hora em que
 * ele mais tinha chance de dormir.
 */
const rotasDoSitemap = consultaDaVitrine(["sitemap"], async () => {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);
  return { products, categories };
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories } = await rotasDoSitemap();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/produtos`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/sobre`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map(c => ({
    url: `${SITE_URL}/produtos?categoria=${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map(p => ({
    url: `${SITE_URL}/produtos/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
