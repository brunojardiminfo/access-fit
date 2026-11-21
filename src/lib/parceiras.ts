/**
 * As contas da parceria com influencers.
 *
 * O PROBLEMA QUE ISTO RESOLVE. O cupom era duas coisas ao mesmo tempo: o
 * desconto da cliente e o crachá de quem trouxe a venda. Quando o desconto
 * não pode sair — peça em SALE não acumula cupom — o crachá sumia junto, e a
 * parceira aparecia valendo zero justamente na semana em que mais vendeu.
 * `Order.parceiraId` é o crachá, separado do desconto.
 *
 * O HISTÓRICO NÃO SE PERDE. Uma venda conta para a parceira se foi marcada
 * para ela OU se o cupom do pedido é o código dela. Sem esse "ou", ligar a
 * parceira hoje apagaria tudo que ela já vendeu, porque os pedidos antigos só
 * têm `couponCode`.
 *
 * CANCELADO NÃO É VENDA. Pedido cancelado fica de fora de tudo — se entrasse,
 * daria para gerar comissão abrindo e cancelando pedidos.
 */

export const KIND_CASHBACK = "cashback-parceira";

/** O filtro dos pedidos que contam para uma parceira. */
export function pedidosDaParceira(parceiraId: string, codigo: string) {
  return {
    status: { not: "cancelled" },
    OR: [{ parceiraId }, { couponCode: codigo }],
  };
}

export type PedidoParaComissao = {
  subtotal: number;
  discount: number;
};

/**
 * Sobre quanto a comissão incide: o que a cliente pagou PELAS PEÇAS.
 *
 * `subtotal` é a soma dos itens, com o SALE já embutido no preço de cada um.
 * O `discount` (cupom ou campanha) sai porque a loja não recebeu esse valor.
 * O frete fica de fora: ele não é lucro da loja, é custo repassado — pagar
 * comissão sobre frete é pagar para entregar.
 *
 * Nunca negativo: um desconto maior que o subtotal é dado errado, e comissão
 * negativa viraria uma dívida da parceira.
 */
export function baseDaComissao(p: PedidoParaComissao): number {
  return Math.max(0, arredonda(p.subtotal - (p.discount || 0)));
}

/** O cashback de um pedido, pela comissão da parceira. */
export function comissaoDoPedido(p: PedidoParaComissao, comissao: number): number {
  return arredonda(baseDaComissao(p) * (comissao / 100));
}

export type ResumoParceira = {
  pedidos: number;
  vendido: number;
  cashbackGerado: number;
  jaCreditado: number;
  aCreditar: number;
  saldoNaLoja: number;
};

/**
 * O resumo que a tela e o link dela mostram.
 *
 * GERADO E CREDITADO SÃO COISAS DIFERENTES, e por isso são dois números.
 * O gerado é recalculado dos pedidos toda vez: se um pedido for cancelado, ele
 * cai sozinho, sem ninguém lembrar de estornar nada. O creditado é o que já
 * virou saldo no extrato dela — dinheiro que ela pode gastar. A diferença é o
 * que falta lançar.
 *
 * Se o gerado ficar MENOR que o creditado (cancelamento depois de creditado),
 * `aCreditar` dá zero em vez de negativo: tirar crédito que ela já pode ter
 * gastado é decisão de gente, não de fórmula. A tela mostra os dois números,
 * então o caso aparece em vez de sumir.
 */
export function resumoDaParceira(
  pedidos: PedidoParaComissao[],
  comissao: number,
  creditosDaParceria: number[],
  extratoCompleto: number[],
): ResumoParceira {
  const vendido = arredonda(pedidos.reduce((s, p) => s + baseDaComissao(p), 0));
  const cashbackGerado = arredonda(vendido * (comissao / 100));
  const jaCreditado = arredonda(creditosDaParceria.reduce((s, v) => s + v, 0));
  return {
    pedidos: pedidos.length,
    vendido,
    cashbackGerado,
    jaCreditado,
    aCreditar: Math.max(0, arredonda(cashbackGerado - jaCreditado)),
    saldoNaLoja: arredonda(extratoCompleto.reduce((s, v) => s + v, 0)),
  };
}

/**
 * A chave do link dela. Longa e aleatória porque é a única tranca da página:
 * o link abre sem senha, então adivinhar o token é entrar.
 */
export function novoToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

function arredonda(v: number): number {
  return Math.round(v * 100) / 100;
}
