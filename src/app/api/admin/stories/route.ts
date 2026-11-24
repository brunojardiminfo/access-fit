export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Registra que um passo do roteiro foi ao ar.
 *
 * É ISTO QUE FAZ O CATÁLOGO GIRAR. Sem o registro, a agenda ofereceria as
 * mesmas quatro peças todo dia, porque "as que estão há mais tempo fora do ar"
 * nunca mudaria.
 *
 * GRAVA TAMBÉM QUANDO ELE SÓ GERA A IMAGEM. Depender só do botão "postei"
 * seria depender de ele lembrar de um passo a mais — e no dia em que
 * esquecesse, a agenda congelava sem dar sinal. Gerar a imagem já é a decisão
 * de postar; é sinal suficiente.
 *
 * NÃO DUPLICA: a mesma peça registrada duas vezes em doze horas é a mesma
 * postagem contada duas vezes (gerou e depois marcou), e isso só serviria
 * para empurrar a peça para o fim da fila duas vezes.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { productId, slot, kind } = await req.json().catch(() => ({}));
  if (!slot || !kind) return NextResponse.json({ error: "Passo inválido" }, { status: 400 });

  if (productId) {
    const recente = await prisma.storyPost.findFirst({
      where: { productId, postedAt: { gt: new Date(Date.now() - 12 * 3600000) } },
      select: { id: true },
    });
    if (recente) return NextResponse.json({ ok: true, jaRegistrado: true });
  }

  const linha = await prisma.storyPost.create({
    data: { productId: productId || null, slot: Number(slot), kind: String(kind) },
  });
  return NextResponse.json({ ok: true, id: linha.id });
}
