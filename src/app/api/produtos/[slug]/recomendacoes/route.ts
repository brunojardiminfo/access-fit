import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    // Buscar o produto atual
    const produto = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, categoryId: true, category: { select: { slug: true } } },
    });

    if (!produto) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    // 1. Buscar produtos mais vendidos juntos (mesmos pedidos)
    const pedidosComEsteItem = await prisma.orderItem.findMany({
      where: { productId: produto.id },
      select: { orderId: true },
      take: 50,
    });

    const pedidoIds = pedidosComEsteItem.map(p => p.orderId);

    let produtosJuntos: any[] = [];
    if (pedidoIds.length > 0) {
      produtosJuntos = await prisma.orderItem.findMany({
        where: {
          orderId: { in: pedidoIds },
          productId: { not: produto.id },
        },
        select: { productId: true },
        distinct: ["productId"],
        take: 10,
      });
    }

    const produtosJuntosIds = produtosJuntos.map(p => p.productId);

    // 2. Se não tiver produtos vendidos juntos, buscar da mesma categoria
    let produtosRecomendadosIds = produtosJuntosIds;
    if (produtosRecomendadosIds.length < 3) {
      const daCategoria = await prisma.product.findMany({
        where: {
          categoryId: produto.categoryId,
          id: { not: produto.id },
          active: true,
        },
        select: { id: true },
        take: 10 - produtosRecomendadosIds.length,
      });
      produtosRecomendadosIds = [...produtosRecomendadosIds, ...daCategoria.map(p => p.id)];
    }

    // 3. Buscar dados dos produtos recomendados
    const produtosDetalhes = await prisma.product.findMany({
      where: { id: { in: produtosRecomendadosIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        images: true,
        createdAt: true,
        onSale: true,
        saleDiscount: true,
        category: { select: { name: true } },
      },
      take: 3,
    });

    return NextResponse.json({
      recomendacoes: produtosDetalhes,
      tipo: produtosJuntosIds.length > 0 ? "vendidos_juntos" : "mesma_categoria",
      categorySlug: produto.category?.slug,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Erro ao buscar recomendações" },
      { status: 500 }
    );
  }
}
