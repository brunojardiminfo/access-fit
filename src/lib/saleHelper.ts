export const DIAS_PARA_SALE = 60;

export function isSaleEligible(createdAt: Date): boolean {
  const daysSinceCreation = Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceCreation >= DIAS_PARA_SALE;
}

/**
 * Filtro Prisma das peças em SALE: marcadas na mão ou com DIAS_PARA_SALE dias
 * de cadastro. Fica aqui para a vitrine, a home e o admin usarem a mesma regra.
 */
export function saleWhere() {
  const corte = new Date(Date.now() - DIAS_PARA_SALE * 24 * 60 * 60 * 1000);
  return { OR: [{ createdAt: { lte: corte } }, { onSale: true }] };
}

export function calculateSalePrice(price: number, discount: number = 20): number {
  return Math.round(price * (100 - discount) / 100 * 100) / 100;
}

export function getSaleInfo(product: {
  price: number;
  createdAt: Date;
  onSale?: boolean;
  saleDiscount?: number | null;
}) {
  // Se não está autorizado para SALE e não é elegível por data
  if (!product.onSale && !isSaleEligible(product.createdAt)) {
    return null;
  }

  // Se foi autorizado manualmente
  if (product.onSale) {
    const discount = product.saleDiscount || 20;
    return {
      salePrice: calculateSalePrice(product.price, discount),
      discount,
    };
  }

  // Se é elegível por data (60+ dias) e não foi bloqueado
  if (isSaleEligible(product.createdAt)) {
    return {
      salePrice: calculateSalePrice(product.price, 20),
      discount: 20,
    };
  }

  return null;
}
