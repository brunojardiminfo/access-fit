export const DIAS_PARA_SALE = 90;

const DIA = 1000 * 60 * 60 * 24;

/** A peça, como as regras do SALE precisam vê-la. */
type PecaComDatas = {
  createdAt: Date | string;
  /** Obrigatório de propósito: quem monta a peça na mão tem que buscar esta
      coluna. Sem ela a peça reposta ontem volta a contar desde o cadastro, em
      silêncio — que foi o defeito que isto veio consertar. */
  restockedAt: Date | string | null;
};

const comoData = (d: Date | string): Date => (typeof d === "string" ? new Date(d) : d);

/**
 * Desde quando a mercadoria que está na prateleira hoje está parada.
 *
 * Não é a data de cadastro da peça. Quando o estoque acaba e a loja compra
 * mais, o que está na arara é mercadoria nova — e o relógio do SALE tem que
 * recomeçar dali, senão a peça reposta hoje entra com 20% de desconto amanhã
 * por causa de um cadastro de três meses atrás.
 *
 * `restockedAt` é carimbado toda vez que o estoque sobe, no único lugar que
 * recebe reposição (o PUT da peça no admin). É o mesmo carimbo que acende o
 * selo "Novidade" na vitrine: uma peça não pode ser novidade e estar parada
 * há 90 dias ao mesmo tempo, que era exatamente o que acontecia.
 */
export function paradaDesde(peca: PecaComDatas): Date {
  return comoData(peca.restockedAt ?? peca.createdAt);
}

/** Há quantos dias esta mercadoria está parada. */
export function diasParada(peca: PecaComDatas, agora = new Date()): number {
  return Math.floor((agora.getTime() - paradaDesde(peca).getTime()) / DIA);
}

/** Houve reposição depois do cadastro — o relógio foi reiniciado. */
export function foiReposta(peca: PecaComDatas): boolean {
  if (!peca.restockedAt) return false;
  return comoData(peca.restockedAt).getTime() > comoData(peca.createdAt).getTime();
}

export function isSaleEligible(peca: PecaComDatas): boolean {
  return diasParada(peca) >= DIAS_PARA_SALE;
}

/**
 * Filtro Prisma das peças em SALE: marcadas na mão ou paradas há
 * DIAS_PARA_SALE dias, e nunca as que foram tiradas do SALE à mão. Fica aqui
 * para a vitrine, a home e o admin usarem a mesma regra.
 *
 * São duas condições por data porque o banco não sabe fazer coalesce num
 * where: peça reposta conta pela reposição, peça nunca reposta conta pelo
 * cadastro.
 */
export function saleWhere() {
  const corte = new Date(Date.now() - DIAS_PARA_SALE * DIA);
  return {
    saleBlocked: false,
    OR: [
      { onSale: true },
      { restockedAt: { lte: corte } },
      { restockedAt: null, createdAt: { lte: corte } },
    ],
  };
}

/** O mesmo corte, para quem precisa montar a própria consulta. */
export function paradasHaMuitoTempo(agora = new Date()) {
  const corte = new Date(agora.getTime() - DIAS_PARA_SALE * DIA);
  return {
    OR: [
      { restockedAt: { lte: corte } },
      { restockedAt: null, createdAt: { lte: corte } },
    ],
  };
}

export function calculateSalePrice(price: number, discount: number = 20): number {
  return Math.round(price * (100 - discount) / 100 * 100) / 100;
}

export function getSaleInfo(product: PecaComDatas & {
  price: number;
  onSale?: boolean;
  saleDiscount?: number | null;
  saleBlocked?: boolean;
}) {
  // Tirada do SALE à mão: nem a data nem a marcação a trazem de volta. É o
  // único jeito de uma peça velha ficar fora, porque a regra por dias entra
  // sozinha e não perguntava a ninguém.
  if (product.saleBlocked) return null;

  // Autorizada na mão: vale o desconto escolhido, sem olhar data.
  if (product.onSale) {
    const discount = product.saleDiscount || 20;
    return { salePrice: calculateSalePrice(product.price, discount), discount };
  }

  // Parada há tempo demais: 20% automáticos.
  if (isSaleEligible(product)) {
    return { salePrice: calculateSalePrice(product.price, 20), discount: 20 };
  }

  return null;
}
