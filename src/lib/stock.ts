import { prisma } from "@/lib/prisma";
import {
  montarChave, parseEstoque, totalDoEstoque, temCorNoEstoque, SEM_COR,
} from "@/lib/variacoes";

export { parseEstoque as parseSizeStock } from "@/lib/variacoes";

/**
 * Qual chave do estoque uma venda deve mexer.
 *
 * A peça pode ter estoque no formato novo (com cor), no antigo (só tamanho),
 * ou nos dois ao mesmo tempo, enquanto o lançamento com cor não cobriu tudo.
 * A venda tira da chave exata quando ela existe; sem cor informada, ou sem a
 * combinação lançada, cai na chave antiga do tamanho — que é onde aquele
 * estoque de fato está.
 */
function chaveDaVenda(
  mapa: Record<string, number>, cor: string | null | undefined, tamanho: string
): string | null {
  const comCor = montarChave(cor || SEM_COR, tamanho);
  if (comCor in mapa) return comCor;
  const soTamanho = montarChave(SEM_COR, tamanho);
  if (soTamanho in mapa) return soTamanho;
  // Combinação nunca lançada: só assume a chave com cor se a peça já trabalha
  // com cor, senão o negativo apareceria numa variação que não existe
  if (cor && temCorNoEstoque(mapa)) return comCor;
  return null;
}

// Decrementa o estoque de um produto ao registrar uma venda.
// Se o produto tiver estoque por tamanho configurado e o item informar o tamanho,
// desconta daquele tamanho especificamente (pode ficar negativo = vendido além do previsto,
// mesma convenção usada para componentes de conjunto). Senão, desconta do total (comportamento legado).
export async function decrementProductStock(
  productId: string, quantity: number, size?: string | null, color?: string | null
) {
  await moverEstoque(productId, -quantity, size, color);
}

// Restaura o estoque de um produto ao cancelar/excluir um pedido. Inverso de decrementProductStock.
export async function restoreProductStock(
  productId: string, quantity: number, size?: string | null, color?: string | null
) {
  await moverEstoque(productId, quantity, size, color);
}

/**
 * Único lugar que escreve estoque de venda. `delta` negativo dá baixa,
 * positivo devolve. `stock` fica sempre sendo a soma das variações, para a
 * vitrine e o "Esgotado" não divergirem do detalhe.
 */
async function moverEstoque(
  productId: string, delta: number, size?: string | null, color?: string | null
) {
  const produto = await prisma.product.findUnique({
    where: { id: productId }, select: { sizeStock: true },
  });
  const mapa = parseEstoque(produto?.sizeStock);
  const chave = size ? chaveDaVenda(mapa, color, size) : null;

  if (chave === null) {
    // Peça sem estoque por variação: mexe no total, como sempre foi
    await prisma.product.updateMany({
      where: { id: productId },
      data: { stock: delta < 0 ? { decrement: -delta } : { increment: delta } },
    });
    return;
  }

  // Pode ficar negativo de propósito: é como o sistema registra venda além do
  // previsto, mesma convenção dos componentes de conjunto
  mapa[chave] = (mapa[chave] ?? 0) + delta;
  await prisma.product.update({
    where: { id: productId },
    data: { sizeStock: JSON.stringify(mapa), stock: totalDoEstoque(mapa) },
  });
}

/**
 * Status em que as peças já saíram do estoque: confirmado, enviado, entregue e
 * Home Try-On (a cliente está com as peças em casa). "Aguardando" e "preview"
 * ainda não comprometem nada — o pedido pode nunca se confirmar.
 */
const CONSOME_ESTOQUE = new Set(["confirmed", "shipped", "delivered", "try-on"]);

export function consomeEstoque(status: string | null | undefined): boolean {
  return CONSOME_ESTOQUE.has(status || "");
}

/**
 * Aplica a baixa (ou a devolução) quando o pedido cruza a fronteira entre
 * "ainda não saiu" e "saiu". Faz nada quando os dois lados são iguais, então
 * chamar de novo no mesmo status nunca dá baixa em dobro.
 */
export async function ajustarEstoquePorStatus(orderId: string, de: string | null | undefined, para: string) {
  const antes = consomeEstoque(de);
  const depois = consomeEstoque(para);
  if (antes === depois) return;

  const itens = await prisma.orderItem.findMany({
    where: { orderId },
    select: { productId: true, quantity: true, size: true, color: true },
  });

  for (const item of itens) {
    if (depois) await decrementProductStock(item.productId, item.quantity, item.size, item.color);
    else await restoreProductStock(item.productId, item.quantity, item.size, item.color);
  }
}
