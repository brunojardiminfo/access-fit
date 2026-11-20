import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LiquidaClient from "./LiquidaClient";
import { diasParada, dinheiroParado, pesoDoEncalhe, descontoMaximo } from "@/lib/encalhe";

export const dynamic = "force-dynamic";

/**
 * A tela da liquidação: onde está o dinheiro parado, e até onde dá para
 * descontar.
 *
 * Uma consulta só, de propósito. A tela de giro de estoque que já existia
 * faz três consultas POR PEÇA para montar o relatório — com 87 peças são
 * mais de 250 idas ao banco numa abertura, e o Neon cobra por tempo ligado.
 * Aqui tudo o que a tela precisa sai de um `findMany`, e as contas são
 * feitas em memória.
 */
export default async function LiquidaPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") redirect("/");

  const pecas = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 }, NOT: { slug: "venda-manual" } },
    select: {
      id: true, name: true, slug: true, images: true, price: true, costPrice: true,
      stock: true, sizeStock: true, colors: true, createdAt: true, restockedAt: true,
      onSale: true, saleDiscount: true, saleBlocked: true,
      category: { select: { name: true } },
    },
  });

  const agora = new Date();
  const lista = pecas
    .map(p => ({
      id: p.id,
      nome: p.name,
      categoria: p.category?.name || "—",
      foto: primeiraFoto(p.images),
      preco: p.price,
      custo: p.costPrice,
      estoque: p.stock,
      dias: diasParada(p, agora),
      parado: dinheiroParado(p),
      peso: pesoDoEncalhe(p, agora),
      tetoDesconto: descontoMaximo(p),
      emSale: p.onSale,
      descontoAtual: p.saleDiscount,
      bloqueada: p.saleBlocked,
    }))
    // Mais dinheiro parado há mais tempo primeiro: é a ordem da decisão.
    .sort((a, b) => b.peso - a.peso);

  return <LiquidaClient pecas={lista} />;
}

function primeiraFoto(images: string | null): string | null {
  try {
    const fotos = JSON.parse(images || "[]");
    return Array.isArray(fotos) && fotos.length ? String(fotos[0]) : null;
  } catch {
    return null;
  }
}
