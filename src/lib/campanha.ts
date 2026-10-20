/**
 * Campanha em cartaz no site.
 *
 * Para ligar, desligar ou mudar as datas, mexa só neste arquivo.
 *
 * Fases:
 *  - "teaser"    → antes de `inicio`: o site anuncia, mas nenhum desconto sai
 *  - "ativa"     → entre `inicio` e `fim`
 *  - "encerrada" → depois de `fim`, ou com `ligada: false`
 *
 * `revelarRegras` controla só o que aparece na tela, nunca o que é cobrado:
 * com ele ligado o site publica a escada em qualquer fase (no teaser, junto
 * com a data de estreia); desligado, não mostra a mecânica em lugar nenhum.
 * Quem decide se o desconto sai é a fase — no teaser não sai.
 */
export const CAMPANHA = {
  // Para a próxima campanha, troque nome, datas e regras aqui — o resto do
  // arquivo serve. Para tirar do ar sem apagar nada, basta `ligada: false`.
  ligada: true,
  nome: "Promoção de Fim de Mês",
  // Fuso de Brasília explícito: o servidor roda em UTC, e sem o -03:00 a
  // campanha começaria às 21h do dia anterior
  inicio: new Date("2026-10-20T00:00:00-03:00"),
  fim: new Date("2026-10-31T23:59:59-03:00"),
  revelarRegras: true,
  /**
   * Piso em reais: abaixo dele a campanha não vale. `null` tira o piso e a
   * regra volta a ser só por quantidade de peças.
   *
   * O piso é medido sobre a sacola COM o SALE já aplicado — o número que a
   * cliente está olhando no carrinho — e nunca sobre o preço de tabela. Medir
   * pelo preço cheio faria a sacola "passar de 200" numa tela e não passar na
   * outra.
   */
  minimoValor: 200 as number | null,
  // Só aparecem na tela com revelarRegras ligado; só valem na fase ativa
  regras: [
    { pecas: 1, desconto: 15 },
  ],
};

export type FaseCampanha = "teaser" | "ativa" | "encerrada";

export function faseCampanha(agora: Date = new Date()): FaseCampanha {
  if (!CAMPANHA.ligada) return "encerrada";
  if (agora < CAMPANHA.inicio) return "teaser";
  if (agora <= CAMPANHA.fim) return "ativa";
  return "encerrada";
}

/** Ex.: "setembro" — usado no aviso sem entregar a mecânica. */
export function mesDaCampanha(): string {
  return CAMPANHA.inicio.toLocaleDateString("pt-BR", { month: "long" });
}

/** Ex.: "10/09" — a data de estreia, para o anúncio antes da campanha. */
export function diaDeInicio(): string {
  return CAMPANHA.inicio.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo",
  });
}

/** Teto da escada progressiva. Nunca passa disso, por mais peças que levem. */
export const TETO_PROGRESSIVO = 20;

/** O maior desconto que esta campanha chega a dar. Vai no selo da barra. */
export function tetoDaCampanha(): number {
  const maior = CAMPANHA.regras.reduce((m, r) => Math.max(m, r.desconto), 0);
  return Math.min(maior, TETO_PROGRESSIVO);
}

/**
 * Desconto progressivo da sacola, lido de `regras` e do piso `minimoValor`.
 * Função pura — a mesma conta roda no carrinho e no servidor, para o valor
 * cobrado nunca divergir do exibido.
 *
 * `valorDaSacola` é obrigatório de propósito: com um padrão, um chamador
 * esquecido daria o desconto abaixo do piso (ou nunca daria) em silêncio.
 * Exigindo o parâmetro, o compilador aponta quem falta ajustar.
 */
export function descontoProgressivo(qtdPecas: number, valorDaSacola: number): number {
  if (qtdPecas < 1) return 0;
  if (CAMPANHA.minimoValor !== null && valorDaSacola < CAMPANHA.minimoValor) return 0;
  const escada = CAMPANHA.regras
    .filter(r => qtdPecas >= r.pecas)
    .reduce((maior, r) => Math.max(maior, r.desconto), 0);
  return Math.min(escada, TETO_PROGRESSIVO);
}

/**
 * Desconto que vale para uma peça: o maior entre o SALE dela e o progressivo.
 * Os dois nunca somam — a cliente leva a melhor condição, não as duas.
 */
export function descontoEfetivo(descontoSale: number, qtdPecas: number, valorDaSacola: number, agora: Date = new Date()): number {
  const progressivo = faseCampanha(agora) === "ativa" ? descontoProgressivo(qtdPecas, valorDaSacola) : 0;
  return Math.max(descontoSale || 0, progressivo);
}

export type ItemSacola = {
  price: number;          // preço já com o SALE aplicado
  quantity: number;
  precoCheio?: number;    // preço de tabela, quando conhecido
  descontoSale?: number;  // % de SALE embutido em price
};

/**
 * Conta da sacola inteira. Mesma função no carrinho, no checkout e no servidor,
 * para o que a cliente vê ser exatamente o que é cobrado.
 */
export function calcularSacola(itens: ItemSacola[], agora: Date = new Date()) {
  const pecas = itens.reduce((s, i) => s + Math.max(1, i.quantity || 1), 0);

  // Primeira passada: o que a sacola custa só com o SALE. É esse número que o
  // piso da campanha enxerga, então ele tem que existir antes do desconto.
  let subtotal = 0;
  let baseCupom = 0;    // só as peças fora do SALE — cupom não vale nelas
  for (const item of itens) {
    const qtd = Math.max(1, item.quantity || 1);
    subtotal += item.price * qtd;
    if ((item.descontoSale || 0) <= 0) baseCupom += item.price * qtd;
  }
  subtotal = arredonda(subtotal);
  baseCupom = arredonda(baseCupom);

  const progressivo = faseCampanha(agora) === "ativa" ? descontoProgressivo(pecas, subtotal) : 0;

  // Segunda passada: o total com a melhor condição peça a peça.
  let total = 0;
  for (const item of itens) {
    const qtd = Math.max(1, item.quantity || 1);
    const sale = item.descontoSale || 0;
    // Sem preço cheio conhecido, o preço do item ja e o de partida
    const cheio = item.precoCheio ?? item.price;
    const efetivo = Math.max(sale, progressivo);
    total += arredonda(cheio * (100 - efetivo) / 100) * qtd;
  }
  total = arredonda(total);

  // Quanto falta para a sacola alcançar o piso. Zero quando já alcançou ou
  // quando não há piso — a tela usa isso para convidar sem ter que recalcular.
  const faltaParaOMinimo = CAMPANHA.minimoValor !== null && subtotal < CAMPANHA.minimoValor
    ? arredonda(CAMPANHA.minimoValor - subtotal)
    : 0;

  return { pecas, progressivo, subtotal, total, baseCupom, faltaParaOMinimo, desconto: arredonda(subtotal - total) };
}

function arredonda(v: number) {
  return Math.round(v * 100) / 100;
}

/**
 * Quanto um cupom vale numa sacola. Peça em SALE não acumula cupom, então a
 * porcentagem incide apenas sobre o que está a preço cheio.
 */
export function descontoDoCupom(baseCupom: number, percentual: number): number {
  if (!percentual || baseCupom <= 0) return 0;
  return arredonda((baseCupom * percentual) / 100);
}
