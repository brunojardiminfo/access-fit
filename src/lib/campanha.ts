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
  // Meses em JS começam no zero: 8 = setembro
  inicio: new Date(2026, 8, 1),
  fim: new Date(2026, 8, 30, 23, 59, 59),
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
