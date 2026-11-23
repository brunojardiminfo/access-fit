import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { montarPauta } from "@/lib/pauta";
import { getSaleInfo } from "@/lib/saleHelper";
import { parseJson } from "@/lib/utils";
import StoriesClient from "./StoriesClient";

export const dynamic = "force-dynamic";

/**
 * A tela do Instagram: o que postar hoje, e o story já montado.
 *
 * Uma consulta só. A pauta e os cartões saem das mesmas peças — pedir duas
 * vezes acordaria o banco duas vezes, e o Neon cobra por tempo ligado.
 */
export default async function StoriesPage() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin") redirect("/");

  const pecas = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 }, NOT: { slug: "venda-manual" } },
    select: {
      id: true, name: true, slug: true, price: true, images: true, stock: true,
      createdAt: true, restockedAt: true, onSale: true, saleDiscount: true, saleBlocked: true,
      category: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const agora = new Date();

  // Peça sem foto não vira story. Aparecer na lista para dar erro no clique é
  // pior que não aparecer.
  const comFoto = pecas.filter(p => parseJson<string[]>(p.images, []).some(u => (u || "").trim()));

  const paraTela = comFoto.map(p => {
    const info = getSaleInfo({
      price: p.price, onSale: p.onSale, saleDiscount: p.saleDiscount,
      saleBlocked: p.saleBlocked, createdAt: p.createdAt, restockedAt: p.restockedAt,
    });
    return {
      id: p.id, nome: p.name.trim(), categoria: p.category?.name ?? null,
      foto: parseJson<string[]>(p.images, []).find(u => (u || "").trim())!,
      preco: info ? info.salePrice : p.price,
      precoCheio: p.price,
      desconto: info ? info.discount : 0,
      estoque: p.stock,
    };
  });

  const pauta = montarPauta(comFoto, agora).slice(0, 10).map(i => ({
    tipo: i.tipo, etiqueta: i.etiqueta, porque: i.porque, texto: i.texto,
    pecaId: i.peca?.id ?? null,
  }));

  return <StoriesClient pecas={paraTela} pauta={pauta} />;
}
