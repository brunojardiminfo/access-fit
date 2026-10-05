export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UNIVERSOS_PADRAO } from "@/lib/colecoes";

/**
 * Cria os cinco universos da proposta de uma vez. Idempotente de propósito:
 * se algum já existe, mantém como está e só cria o que falta — assim clicar
 * duas vezes não duplica nem reescreve texto que já foi ajustado à mão.
 */
export async function POST() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const existentes = await prisma.collection.findMany({ select: { slug: true } });
  const jaTem = new Set(existentes.map(c => c.slug));
  const faltando = UNIVERSOS_PADRAO.filter(u => !jaTem.has(u.slug));

  if (faltando.length) {
    await prisma.collection.createMany({ data: faltando });
  }

  return NextResponse.json({ criadas: faltando.length, jaExistiam: UNIVERSOS_PADRAO.length - faltando.length });
}
