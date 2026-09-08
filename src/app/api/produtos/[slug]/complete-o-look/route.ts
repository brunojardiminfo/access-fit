import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/utils";
import { parseEstoque, coresDisponiveis, SEM_COR } from "@/lib/variacoes";

const QUANTAS = 3;

/** "Verde Militar" e "verde militar" são a mesma cor. */
function normaliza(cor: string): string {
  return cor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * Peças que combinam com esta, para o bloco "Complete o look".
 *
 * A regra é a cor: a legging preta aparece no top preto. Só entram peças de
 * outra categoria — sugerir outro top para quem está vendo um top não completa
 * look nenhum — e só as que têm a cor de fato disponível, para a cliente não
 * clicar e encontrar esgotado.
 *
 * Sem peça da mesma cor, o bloco não aparece. Preferimos não mostrar nada a
 * mostrar uma combinação que não combina.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const atual = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, categoryId: true, colors: true, sizeStock: true },
    });
    if (!atual) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });

    // As cores desta peça: as que têm estoque, ou as cadastradas quando ela
    // ainda não tem controle por cor
    const estoqueAtual = parseEstoque(atual.sizeStock);
    const cadastradas = parseJson<string[]>(atual.colors, []);
    const comEstoque = coresDisponiveis(estoqueAtual, cadastradas).filter(c => c !== SEM_COR);
    const coresDaPeca = (comEstoque.length > 0 ? comEstoque : cadastradas).map(normaliza);

    if (coresDaPeca.length === 0) return NextResponse.json({ pecas: [] });

    const candidatos = await prisma.product.findMany({
      where: {
        active: true,
        id: { not: atual.id },
        categoryId: { not: atual.categoryId },
        stock: { gt: 0 },
      },
      select: {
        id: true, name: true, slug: true, price: true, images: true, colors: true,
        sizeStock: true, createdAt: true, onSale: true, saleDiscount: true,
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    const combinam = candidatos.filter(p => {
      const estoque = parseEstoque(p.sizeStock);
      const suasCadastradas = parseJson<string[]>(p.colors, []);
      const suasComEstoque = coresDisponiveis(estoque, suasCadastradas).filter(c => c !== SEM_COR);
      const suasCores = (suasComEstoque.length > 0 ? suasComEstoque : suasCadastradas).map(normaliza);
      return suasCores.some(c => coresDaPeca.includes(c));
    });

    // Uma peça por categoria: top + legging + bolsa diz mais que três leggings
    const porCategoria = new Map<string, (typeof combinam)[number]>();
    for (const p of combinam) {
      if (!porCategoria.has(p.category.name)) porCategoria.set(p.category.name, p);
    }

    return NextResponse.json({ pecas: [...porCategoria.values()].slice(0, QUANTAS) });
  } catch (error) {
    console.error("Erro no complete o look:", error);
    return NextResponse.json({ pecas: [] });
  }
}
