export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  // Inclui inativos: produto oculto na loja continua vendavel no balcao.
  // Ativos aparecem primeiro na busca.
  const products = await prisma.product.findMany({
    where: {
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    include: { conjuntoItems: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    take: 10,
  });

  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { conjuntoItems, ...data } = await req.json();

    const product = await prisma.product.create({ data });

    if (data.isConjunto && conjuntoItems && conjuntoItems.length > 0) {
      await prisma.conjuntoItem.createMany({
        data: conjuntoItems.map((item: any) => ({
          conjuntoId: product.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          stock: item.stock || 0,
        })),
      });
    }

    // Dispara webhook para N8n gerar post no Instagram
    const webhookUrl = process.env.N8N_PRODUTO_WEBHOOK_URL;
    if (webhookUrl) {
      const imagens: string[] = typeof product.images === "string" ? JSON.parse(product.images) : (product.images as string[]) || [];
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evento: "produto_novo",
          nome: product.name,
          categoria: product.categoryId || "sem-categoria",
          estoque: product.stock,
          preco: product.price,
          imagem_url: imagens[0] || null,
          slug: product.slug,
        }),
      }).catch(() => {});
    }

    return NextResponse.json(product, { status: 201 });
  } catch (err: any) {
    console.error("Erro ao criar produto:", err);
    return NextResponse.json({ error: err.message || "Erro ao criar produto" }, { status: 500 });
  }
}

