import { paradaDesde } from "@/lib/saleHelper";

/**
 * Quanto dinheiro está parado em cada peça, e até onde o desconto pode ir.
 *
 * POR QUE NÃO BASTA "DIAS PARADA". Uma legging encalhada com 1 unidade e
 * outra com 14 aparecem iguais numa lista ordenada por tempo, mas são
 * problemas de tamanhos muito diferentes: uma prende R$ 45, a outra R$ 630.
 * Numa liquidação de fim de ano o que se quer recuperar é caixa, então a
 * ordem certa é pelo dinheiro, não pelo calendário.
 *
 * A CONTA. `dinheiroParado` é o que a loja já desembolsou e está na arara:
 * unidades × custo. O `peso` multiplica isso pelos dias — é o custo de
 * carregar a peça, e é por ele que a lista é ordenada. Assim R$ 600 presos
 * há um ano vêm antes de R$ 600 presos há um mês, que é a decisão certa.
 *
 * O TETO DO DESCONTO. A margem do catálogo varia de 25% a 75%: um "50% off"
 * geral quebraria uma peça e sobraria na outra. `descontoMaximo` é o quanto
 * cada peça aguenta antes de ser vendida abaixo do custo — calculado peça a
 * peça, porque é a única forma de um desconto em lote ser seguro.
 */

export type PecaParaLiquidar = {
  price: number;
  costPrice: number | null;
  stock: number;
  createdAt: Date | string;
  restockedAt: Date | string | null;
};

const DIA = 1000 * 60 * 60 * 24;

/** Há quantos dias esta mercadoria está parada. Conta da reposição. */
export function diasParada(p: PecaParaLiquidar, agora = new Date()): number {
  return Math.max(0, Math.floor((agora.getTime() - paradaDesde(p).getTime()) / DIA));
}

/** O que a loja desembolsou e ainda está na arara. */
export function dinheiroParado(p: PecaParaLiquidar): number {
  if (p.costPrice === null || p.costPrice <= 0) return 0;
  return Math.round(p.costPrice * Math.max(0, p.stock) * 100) / 100;
}

/**
 * O custo de carregar a peça: dinheiro × tempo. É a ordem da lista.
 *
 * Não tem unidade que signifique algo sozinha — é um número de comparação.
 * Por isso a tela mostra "R$ X parados há Y dias", e não este valor.
 */
export function pesoDoEncalhe(p: PecaParaLiquidar, agora = new Date()): number {
  return dinheiroParado(p) * diasParada(p, agora);
}

/**
 * O maior desconto que ainda paga o custo da peça, em pontos percentuais
 * inteiros, arredondado para baixo.
 *
 * Arredondar para baixo é de propósito: 33,7% vira 33%, e a peça sai um
 * centavo acima do custo em vez de um centavo abaixo. Numa liquidação de
 * centenas de peças, esse centavo repetido é dinheiro.
 *
 * `null` quando não dá para saber — peça sem custo cadastrado. Quem não sabe
 * o custo não pode garantir piso nenhum, e a tela trata essas à parte em vez
 * de arriscar.
 */
export function descontoMaximo(p: PecaParaLiquidar): number | null {
  if (p.costPrice === null || p.costPrice <= 0 || p.price <= 0) return null;
  if (p.costPrice >= p.price) return 0; // já nasce sem margem
  return Math.floor((1 - p.costPrice / p.price) * 100);
}

/** O que a cliente pagaria com este desconto. */
export function precoCom(p: PecaParaLiquidar, desconto: number): number {
  return Math.round(p.price * (100 - desconto)) / 100;
}

/**
 * Decide, para um lote, qual desconto cada peça vai receber.
 *
 * Três destinos possíveis, e a tela mostra os três antes de aplicar:
 *
 *   aplicadas   — aguentam o desconto pedido;
 *   aparadas    — não aguentam, e vão com o próprio máximo delas;
 *   recusadas   — sem custo cadastrado: não dá para garantir o piso.
 *
 * O cálculo mora aqui, e não na tela, porque o servidor refaz exatamente
 * esta conta antes de gravar. Teto conferido só no navegador não é teto.
 */
export function planejarLote<T extends PecaParaLiquidar & { id: string }>(
  pecas: T[],
  descontoPedido: number,
  aparar: boolean,
): { aplicadas: { peca: T; desconto: number }[]; aparadas: { peca: T; desconto: number }[]; recusadas: T[] } {
  const aplicadas: { peca: T; desconto: number }[] = [];
  const aparadas: { peca: T; desconto: number }[] = [];
  const recusadas: T[] = [];

  for (const peca of pecas) {
    const teto = descontoMaximo(peca);
    if (teto === null) { recusadas.push(peca); continue; }
    if (descontoPedido <= teto) { aplicadas.push({ peca, desconto: descontoPedido }); continue; }
    if (aparar && teto > 0) aparadas.push({ peca, desconto: teto });
    else recusadas.push(peca);
  }
  return { aplicadas, aparadas, recusadas };
}
