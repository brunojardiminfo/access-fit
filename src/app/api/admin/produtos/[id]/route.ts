import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { conjuntoItems, ...data } = await req.json();

    const produtoAntes = await prisma.product.findUnique({ where: { id }, select: { stock: true } });
    // Estoque que sobe e reposicao: carimba a data para a vitrine mostrar
    // "Novidade". Nao ha historico de movimentacao no banco, entao este e o
    // unico momento em que da para saber que entraram unidades.
    const houveReposicao =
      data.stock !== undefined && produtoAntes !== null && data.stock > produtoAntes.stock;

    const product = await prisma.product.update({
      where: { id },
      data: houveReposicao ? { ...data, restockedAt: new Date() } : data,
    });

    // Dispara webhook se houve reposição de estoque
    const webhookUrl = process.env.N8N_PRODUTO_WEBHOOK_URL;
    if (webhookUrl && houveReposicao) {
      const imagens: string[] = typeof product.images === "string" ? JSON.parse(product.images) : (product.images as string[]) || [];
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evento: "reposicao_estoque",
          nome: product.name,
          categoria: product.categoryId || "sem-categoria",
          estoque: product.stock,
          preco: product.price,
          imagem_url: imagens[0] || null,
          slug: product.slug,
        }),
      }).catch(() => {});
    }

    if (data.isConjunto) {
      await prisma.conjuntoItem.deleteMany({ where: { conjuntoId: id } });
      if (conjuntoItems && conjuntoItems.length > 0) {
        await prisma.conjuntoItem.createMany({
          data: conjuntoItems.map((item: any) => ({
            conjuntoId: id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            stock: item.stock || 0,
          })),
        });
      }
    } else {
      await prisma.conjuntoItem.deleteMany({ where: { conjuntoId: id } });
    }

    return NextResponse.json(product);
  } catch (err: any) {
    console.error("Erro ao atualizar produto:", err);
    return NextResponse.json({ error: err.message || "Erro ao atualizar produto" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.product.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
