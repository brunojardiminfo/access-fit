import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/utils";
import ProductPageClient from "./ProductPageClient";
import { consultaDaVitrine } from "@/lib/cacheDaVitrine";

type Props = { params: Promise<{ slug: string }> };

/** Só o que entra no título e no card de compartilhamento. */
const dadosDoCabecalho = (slug: string) => consultaDaVitrine(["peca-meta", slug], () =>
  prisma.product.findUnique({
    where: { slug },
    select: { name: true, description: true, price: true, images: true, category: { select: { name: true } } },
  }),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await dadosDoCabecalho(slug)();

  if (!product) return { title: "Produto não encontrado — Access Fit" };

  const images = parseJson<string[]>(product.images, []);
  const title = `${product.name} — Access Fit`;
  const description = product.description
    ? product.description.slice(0, 155)
    : `${product.name} na categoria ${product.category.name}. Experimente em casa com o Home Try-On da Access Fit e compre só se amar.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: images[0] ? [{ url: images[0] }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images[0] ? [images[0]] : undefined,
    },
  };
}

export default function ProductPage() {
  return <ProductPageClient />;
}
