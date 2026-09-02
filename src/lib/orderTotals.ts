import { prisma } from "@/lib/prisma";

/**
 * Recalcula subtotal e total de um pedido a partir dos itens, preservando o
 * desconto ja concedido. Antes cada rota refazia essa conta por conta propria
 * com total = subtotal, o que apagava o desconto sem ninguem perceber.
 */
export async function recalcOrderTotals(orderId: string) {
  const [items, order] = await Promise.all([
    prisma.orderItem.findMany({ where: { orderId }, select: { price: true, quantity: true } }),
    prisma.order.findUnique({ where: { id: orderId }, select: { discount: true } }),
  ]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const desconto = Math.min(order?.discount || 0, subtotal);
  const total = Math.round((subtotal - desconto) * 100) / 100;

  return prisma.order.update({
    where: { id: orderId },
    data: { subtotal: Math.round(subtotal * 100) / 100, total, discount: Math.round(desconto * 100) / 100 },
  });
}
