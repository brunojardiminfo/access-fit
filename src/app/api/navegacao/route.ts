export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * O que entra no menu e no rodapé da loja.
 *
 * Existe porque o menu tinha as categorias escritas à mão (leggings, tops,
 * conjuntos, shorts): criar uma categoria nova no admin não a fazia aparecer
 * em lugar nenhum da loja, e ninguém descobria isso até sentir falta dela.
 *
 * Coleção vazia não entra. Durante a curadoria das peças uma coleção fica
 * criada mas sem nada dentro, e um link de menu que leva a uma página vazia é
 * pior do que não ter o link — a cliente clica, não vê nada, e conclui que a
 * loja está quebrada.
 */
export async function GET() {
  const [categorias, colecoes] = await Promise.all([
    prisma.category.findMany({
      where: { products: { some: { active: true } } },
      select: { name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    prisma.collection.findMany({
      where: { active: true, products: { some: { product: { active: true } } } },
      select: { name: true, slug: true, tagline: true, sazonal: true },
      orderBy: [{ sazonal: "asc" }, { ordem: "asc" }, { name: "asc" }],
    }),
  ]);

  return NextResponse.json({ categorias, colecoes });
}
