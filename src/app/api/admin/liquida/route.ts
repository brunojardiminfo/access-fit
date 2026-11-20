export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planejarLote } from "@/lib/encalhe";

/**
 * Aplica um desconto a várias peças de uma vez, sem deixar nenhuma ficar
 * abaixo do custo.
 *
 * POR QUE NÃO USEI O bulk-edit QUE JÁ EXISTE. Aquele grava `data` direto
 * para todos os ids com um `updateMany`. Aqui cada peça pode receber um
 * desconto diferente — a que não aguenta os 50% vai com o máximo dela —,
 * então é uma escrita por peça, e precisa ser.
 *
 * O TETO É CONFERIDO AQUI, de novo, com os dados do banco. A tela já mostra
 * o máximo de cada peça, mas tela é sugestão: quem chamar esta rota direto
 * não passa pela tela. Teto conferido só no navegador não é teto.
 */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { ids, desconto, aparar } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ error: "Nenhuma peça selecionada" }, { status: 400 });

  const pedido = Math.round(Number(desconto));
  if (!Number.isFinite(pedido) || pedido < 1 || pedido > 90)
    return NextResponse.json({ error: "Desconto precisa estar entre 1% e 90%" }, { status: 400 });

  const pecas = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true, name: true, price: true, costPrice: true,
      stock: true, createdAt: true, restockedAt: true,
    },
  });

  const { aplicadas, aparadas, recusadas } = planejarLote(pecas, pedido, aparar !== false);

  // Uma escrita por peça: o desconto varia entre elas.
  for (const { peca, desconto: d } of [...aplicadas, ...aparadas]) {
    await prisma.product.update({
      where: { id: peca.id },
      // `saleBlocked: false` porque mandar uma peça para a liquidação e
      // deixá-la bloqueada seria gravar uma contradição: ela sairia da
      // vitrine do SALE logo depois de entrar.
      data: { onSale: true, saleDiscount: d, saleBlocked: false },
    });
  }

  return NextResponse.json({
    aplicadas: aplicadas.length,
    aparadas: aparadas.map(a => ({ nome: a.peca.name, desconto: a.desconto })),
    recusadas: recusadas.map(p => p.name),
  });
}

/** Tira as peças da liquidação, devolvendo-as ao preço cheio. */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ error: "Nenhuma peça selecionada" }, { status: 400 });

  await prisma.product.updateMany({
    where: { id: { in: ids } },
    data: { onSale: false, saleDiscount: null },
  });

  return NextResponse.json({ removidas: ids.length });
}
