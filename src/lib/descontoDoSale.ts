import { prisma } from "@/lib/prisma";
import { saleWhere } from "@/lib/saleHelper";
import { PECA_NA_VITRINE } from "@/lib/vitrine";
import { consultaDaVitrine } from "@/lib/cacheDaVitrine";

/**
 * O maior desconto que existe de verdade no SALE agora.
 *
 * POR QUE ISTO É UMA CONSULTA E NÃO UM NÚMERO ESCRITO À MÃO. A faixa da Black
 * November anuncia "até X% OFF". Escrever o X na faixa significaria que, no
 * dia em que o estoque virasse ou alguém tirasse as peças mais descontadas, a
 * loja continuaria prometendo um desconto que não existe mais — e a cliente
 * que entra atrás dele não acha. Lido do banco, o número da faixa é sempre o
 * que a vitrine entrega: sobe sozinho quando a liquidação é aplicada, e desce
 * sozinho quando as peças acabam.
 *
 * A conta repete `getSaleInfo`: peça autorizada à mão vale o desconto dela
 * (20% quando não escolheram nenhum), e peça que entrou pela regra dos 90 dias
 * vale 20%. Os mesmos 20 dos dois lados, porque é a mesma regra.
 *
 * Passa pelo cache da vitrine: a faixa aparece em toda página da loja, e sem
 * isso seria uma ida ao banco por visita — o Neon cobra por tempo ligado. A
 * invalidação é a mesma do catálogo, então aplicar a liquidação já derruba
 * este número junto.
 */
const DESCONTO_PADRAO = 20;

export const maiorDescontoDoSale = consultaDaVitrine(["maior-desconto-sale"], async () => {
  const pecas = await prisma.product.findMany({
    where: { ...PECA_NA_VITRINE, ...saleWhere() },
    select: { onSale: true, saleDiscount: true },
  });

  return pecas.reduce((maior, p) => {
    const dela = p.onSale ? (p.saleDiscount || DESCONTO_PADRAO) : DESCONTO_PADRAO;
    return Math.max(maior, dela);
  }, 0);
});
