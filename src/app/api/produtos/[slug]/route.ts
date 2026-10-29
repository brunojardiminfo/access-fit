export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consultaDaVitrine } from "@/lib/cacheDaVitrine";

/**
 * A peça inteira — é esta consulta que monta a página do produto, já que a
 * tela é montada no navegador. Era a consulta mais repetida da loja.
 */
const pecaPeloApelido = (slug: string) => consultaDaVitrine(["peca", slug], () =>
  prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      conjuntoItems: true,
    },
  }),
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const product = await pecaPeloApelido(slug)();
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}
