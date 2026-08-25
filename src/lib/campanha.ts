/**
 * Campanha em cartaz no site.
 *
 * Para ligar, desligar ou mudar as datas, mexa só neste arquivo.
 *
 * Fases:
 *  - "teaser"    → antes de `inicio`: o site avisa que vem aí, sem contar o que é
 *  - "ativa"     → entre `inicio` e `fim`
 *  - "encerrada" → depois de `fim`, ou com `ligada: false`
 *
 * Enquanto `revelarRegras` for false, o site não mostra a mecânica em lugar
 * nenhum — nem durante a campanha. Vire para true no dia do anúncio.
 */
export const CAMPANHA = {
  ligada: true,
  nome: "Mês do Consumidor",
  // Fuso de Brasília explícito: o servidor roda em UTC, e sem o -03:00 a
  // campanha começaria às 21h do dia anterior
  inicio: new Date("2026-09-01T00:00:00-03:00"),
  fim: new Date("2026-09-30T23:59:59-03:00"),
  revelarRegras: false,
  // Só entram em cena quando revelarRegras virar true
  regras: [
    { pecas: 1, desconto: 10 },
    { pecas: 2, desconto: 20 },
    { pecas: 3, desconto: 30 },
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

/** Teto da escada progressiva. Nunca passa disso, por mais peças que levem. */
export const TETO_PROGRESSIVO = 30;

/**
 * Desconto progressivo pela quantidade de peças na sacola: 1 peça 10%,
 * 2 peças 20%, 3 ou mais 30%. Função pura — a mesma conta roda no
 * carrinho e no servidor, para o valor cobrado nunca divergir do exibido.
 */
export function descontoProgressivo(qtdPecas: number): number {
  if (qtdPecas < 1) return 0;
  const escada = CAMPANHA.regras
    .filter(r => qtdPecas >= r.pecas)
    .reduce((maior, r) => Math.max(maior, r.desconto), 0);
  return Math.min(escada, TETO_PROGRESSIVO);
}

/**
 * Desconto que vale para uma peça: o maior entre o SALE dela e o progressivo.
 * Os dois nunca somam — a cliente leva a melhor condição, não as duas.
 */
export function descontoEfetivo(descontoSale: number, qtdPecas: number, agora: Date = new Date()): number {
  const progressivo = faseCampanha(agora) === "ativa" ? descontoProgressivo(qtdPecas) : 0;
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
  const progressivo = faseCampanha(agora) === "ativa" ? descontoProgressivo(pecas) : 0;

  let subtotal = 0;   // o que a sacola custaria só com o SALE
  let total = 0;      // o que sai com a melhor condição

  for (const item of itens) {
    const qtd = Math.max(1, item.quantity || 1);
    const sale = item.descontoSale || 0;
    // Sem preço cheio conhecido, o preço do item ja e o de partida
    const cheio = item.precoCheio ?? item.price;
    const efetivo = Math.max(sale, progressivo);
    subtotal += item.price * qtd;
    total += arredonda(cheio * (100 - efetivo) / 100) * qtd;
  }

  subtotal = arredonda(subtotal);
  total = arredonda(total);
  return { pecas, progressivo, subtotal, total, desconto: arredonda(subtotal - total) };
}

function arredonda(v: number) {
  return Math.round(v * 100) / 100;
}
