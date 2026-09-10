export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lerLook } from "@/lib/look";
import { parseEstoque, quantidadeDe, totalDaCor, temCorNoEstoque, SEM_COR } from "@/lib/variacoes";

/**
 * Resolve as peças de um link de look. Público: o link é feito para circular.
 *
 * Peça apagada ou fora do ar some da lista em vez de derrubar a página — o
 * link vive num story e não dá para consertar depois de publicado.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pedidos = lerLook(searchParams.get("p"));
  if (pedidos.length === 0) return NextResponse.json({ pecas: [] });

  const produtos = await prisma.product.findMany({
    where: { slug: { in: pedidos.map(i => i.slug) }, active: true },
    include: { category: { select: { name: true } } },
  });
  const porSlug = new Map(produtos.map(p => [p.slug, p]));

  const pecas = pedidos.map(pedido => {
    const p = porSlug.get(pedido.slug);
    if (!p) return null;

    const estoque = parseEstoque(p.sizeStock);
    const porCor = temCorNoEstoque(estoque);

    // Disponibilidade do que foi pedido: da variação exata quando cor e
    // tamanho vieram no link, senão do que existir da peça
    let disponivel = p.stock > 0;
    if (disponivel && pedido.cor && porCor) {
      disponivel = pedido.tamanho
        ? quantidadeDe(estoque, pedido.cor, pedido.tamanho) > 0
        : totalDaCor(estoque, pedido.cor) > 0;
    } else if (disponivel && pedido.tamanho && !porCor) {
      disponivel = quantidadeDe(estoque, SEM_COR, pedido.tamanho) > 0;
    }

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      images: p.images,
      createdAt: p.createdAt,
      onSale: p.onSale,
      saleDiscount: p.saleDiscount,
      category: p.category,
      cor: pedido.cor || null,
      tamanho: pedido.tamanho || null,
      quantidade: pedido.quantidade,
      disponivel,
    };
  }).filter(Boolean);

  return NextResponse.json({ pecas });
}
