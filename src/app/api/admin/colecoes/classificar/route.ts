export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { papelValido } from "@/lib/colecoes";

type Mudanca = {
  productId: string;
  collectionIds: string[];
  papel: string | null;
};

/**
 * Salva a curadoria de muitas peças de uma vez.
 *
 * Por que em lote e não peça por peça: são 84 peças para classificar. Abrir a
 * tela de cada produto é trabalho que não termina — e trabalho que não termina
 * é trabalho que não acontece. Aqui a pessoa marca tudo numa sessão e salva.
 *
 * Só mexe nas peças que vieram no corpo da requisição. Peça que não veio fica
 * exatamente como estava, para que a curadoria possa ser feita aos poucos sem
 * risco de um salvamento apagar o que foi marcado antes.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const mudancas: Mudanca[] = Array.isArray(body?.mudancas) ? body.mudancas : [];
  if (!mudancas.length)
    return NextResponse.json({ error: "Nada para salvar." }, { status: 400 });

  // Valida antes de escrever qualquer coisa: salvamento parcial em cima de
  // curadoria manual é pior que erro na cara, porque passa despercebido.
  for (const m of mudancas) {
    if (!m?.productId || typeof m.productId !== "string")
      return NextResponse.json({ error: "Peça inválida no envio." }, { status: 400 });
    if (m.papel !== null && !papelValido(m.papel))
      return NextResponse.json({ error: `Papel desconhecido: ${m.papel}` }, { status: 400 });
    if (!Array.isArray(m.collectionIds))
      return NextResponse.json({ error: "Lista de coleções inválida." }, { status: 400 });
  }

  const productIds = [...new Set(mudancas.map(m => m.productId))];
  const collectionIds = [...new Set(mudancas.flatMap(m => m.collectionIds))];

  const [produtosOk, colecoesOk] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true } }),
    collectionIds.length
      ? prisma.collection.findMany({ where: { id: { in: collectionIds } }, select: { id: true } })
      : Promise.resolve([]),
  ]);

  if (produtosOk.length !== productIds.length)
    return NextResponse.json({ error: "Alguma peça do envio não existe mais." }, { status: 409 });
  if (colecoesOk.length !== collectionIds.length)
    return NextResponse.json({ error: "Alguma coleção do envio não existe mais." }, { status: 409 });

  const vinculos = mudancas.flatMap(m =>
    [...new Set(m.collectionIds)].map(collectionId => ({ productId: m.productId, collectionId })),
  );

  await prisma.$transaction([
    // Troca os vínculos das peças enviadas: apaga os antigos e grava os novos.
    prisma.productCollection.deleteMany({ where: { productId: { in: productIds } } }),
    ...(vinculos.length ? [prisma.productCollection.createMany({ data: vinculos })] : []),
    // O papel é por peça, então vai um update por peça mesmo.
    ...mudancas.map(m =>
      prisma.product.update({ where: { id: m.productId }, data: { papel: m.papel } }),
    ),
  ]);

  return NextResponse.json({
    pecas: productIds.length,
    vinculos: vinculos.length,
  });
}
