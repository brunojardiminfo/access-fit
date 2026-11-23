/**
 * Quando a venda vira dinheiro na conta.
 *
 * O PROBLEMA QUE ISTO RESOLVE. O pedido gravava o recebimento com
 * `receivedAt: order.createdAt` — a data da VENDA — qualquer que fosse a
 * forma de pagamento. O Pix cai na hora, então para ele estava certo; mas a
 * venda no link, que só cai 31 dias depois, aparecia como dinheiro que entrou
 * no mês da venda. Novembro parecia ter recebido o que só chega em dezembro.
 *
 * VENDA E RECEBIMENTO SÃO DOIS NÚMEROS. "Vendi R$ 10 mil este mês" e "entrou
 * R$ 6 mil este mês" podem ser as duas coisas verdadeiras ao mesmo tempo, e
 * as telas mostram as duas lado a lado em vez de escolher uma e chamar de
 * "faturamento".
 *
 * SALDO EM CAIXA NÃO APARECE em lugar nenhum, de propósito: o dinheiro da
 * loja mora junto com o pessoal, então qualquer "saldo" que o sistema
 * calculasse seria uma ficção.
 */

/**
 * Quantos dias cada forma leva para virar dinheiro na conta.
 *
 * Está aqui, num lugar só, porque é a informação que mais muda: basta a
 * maquininha ou o gateway mudarem de prazo. Mudar o número aqui corrige todas
 * as telas de uma vez.
 */
export const PRAZO_DE_RECEBIMENTO: Record<string, number> = {
  pix: 0,
  dinheiro: 0,
  link: 31,
  cartao: 31,
  // caderno não entra aqui: o dinheiro dele chega quando a cliente paga a
  // parcela, e isso já é registrado como um pagamento com a data real.
};

/** O dia em que o dinheiro desta forma de pagamento cai. */
export function quandoEntra(metodo: string, dataDaVenda: Date): Date {
  const dias = PRAZO_DE_RECEBIMENTO[metodo] ?? 0;
  if (dias === 0) return dataDaVenda;
  const d = new Date(dataDaVenda);
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}

/** Formas cujo dinheiro não cai no mesmo dia da venda. */
export function temPrazo(metodo: string): boolean {
  return (PRAZO_DE_RECEBIMENTO[metodo] ?? 0) > 0;
}

export const ROTULO_FORMA: Record<string, string> = {
  pix: "Pix", dinheiro: "Dinheiro", link: "Link de pagamento",
  cartao: "Cartão", caderno: "Caderno", credito: "Crédito da cliente",
};

/** Primeiro instante do mês, no fuso de Brasília. */
export function inicioDoMes(ano: number, mes: number): Date {
  return new Date(Date.UTC(ano, mes, 1, 3, 0, 0));
}

/** Primeiro instante do mês seguinte — o limite superior, exclusivo. */
export function fimDoMes(ano: number, mes: number): Date {
  return inicioDoMes(mes === 11 ? ano + 1 : ano, mes === 11 ? 0 : mes + 1);
}

/** "2026-11" → { ano, mes } com mes de 0 a 11, como o JavaScript conta. */
export function lerMes(ym: string): { ano: number; mes: number } {
  const [a, m] = ym.split("-").map(Number);
  return { ano: a, mes: m - 1 };
}

export function nomeDoMes(ano: number, mes: number): string {
  return new Date(Date.UTC(ano, mes, 15)).toLocaleDateString("pt-BR", {
    month: "long", year: "numeric", timeZone: "UTC",
  });
}

export type Entrada = { amount: number; paymentMethod: string };

/**
 * O que entrou no mês, somado e separado por forma.
 *
 * Crédito da cliente fica de fora do total: a venda aconteceu e está no
 * faturamento, mas o dinheiro dela entrou meses atrás, na compra que gerou o
 * crédito. Contar de novo aqui somaria o mesmo dinheiro duas vezes — e ainda
 * assim ele aparece na lista por forma, porque sumir faria o total não bater
 * com as linhas.
 */
export function somarEntradas(entradas: Entrada[]) {
  const porForma = new Map<string, number>();
  let total = 0;
  for (const e of entradas) {
    porForma.set(e.paymentMethod, arredonda((porForma.get(e.paymentMethod) || 0) + e.amount));
    if (e.paymentMethod !== "credito") total += e.amount;
  }
  return {
    total: arredonda(total),
    porForma: [...porForma.entries()]
      .map(([forma, valor]) => ({ forma, rotulo: ROTULO_FORMA[forma] || forma, valor }))
      .sort((a, b) => b.valor - a.valor),
  };
}

function arredonda(v: number) {
  return Math.round(v * 100) / 100;
}
