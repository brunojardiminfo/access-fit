import { prisma } from "@/lib/prisma";

export function parseSizeStock(json: string | null | undefined): Record<string, number> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

// Decrementa o estoque de um produto ao registrar uma venda.
// Se o produto tiver estoque por tamanho configurado e o item informar o tamanho,
// desconta daquele tamanho especificamente (pode ficar negativo = vendido além do previsto,
// mesma convenção usada para componentes de conjunto). Senão, desconta do total (comportamento legado).
export async function decrementProductStock(productId: string, quantity: number, size?: string | null) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { sizeStock: true } });
  const sizeStock = parseSizeStock(product?.sizeStock);
  const hasSizeStock = Object.keys(sizeStock).length > 0;

  if (hasSizeStock && size && size in sizeStock) {
    sizeStock[size] = (sizeStock[size] || 0) - quantity;
    const total = Object.values(sizeStock).reduce((a, b) => a + b, 0);
    await prisma.product.update({
      where: { id: productId },
      data: { sizeStock: JSON.stringify(sizeStock), stock: total },
    });
  } else {
    await prisma.product.updateMany({
      where: { id: productId },
      data: { stock: { decrement: quantity } },
    });
  }
}

// Restaura o estoque de um produto ao cancelar/excluir um pedido. Inverso de decrementProductStock.
export async function restoreProductStock(productId: string, quantity: number, size?: string | null) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { sizeStock: true } });
  const sizeStock = parseSizeStock(product?.sizeStock);
  const hasSizeStock = Object.keys(sizeStock).length > 0;

  if (hasSizeStock && size && size in sizeStock) {
    sizeStock[size] = (sizeStock[size] || 0) + quantity;
    const total = Object.values(sizeStock).reduce((a, b) => a + b, 0);
    await prisma.product.update({
      where: { id: productId },
      data: { sizeStock: JSON.stringify(sizeStock), stock: total },
    });
  } else {
    await prisma.product.updateMany({
      where: { id: productId },
      data: { stock: { increment: quantity } },
    });
  }
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
    select: { productId: true, quantity: true, size: true },
  });

  for (const item of itens) {
    if (depois) await decrementProductStock(item.productId, item.quantity, item.size);
    else await restoreProductStock(item.productId, item.quantity, item.size);
  }
}
