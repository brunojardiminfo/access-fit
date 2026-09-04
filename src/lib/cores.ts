/**
 * Cores das peças viram bolinhas na vitrine.
 *
 * O campo `colors` do produto é texto livre digitado no admin ("Preto, Rosa"),
 * então aqui mora a tradução de nome para cor de tela. Nome que não estiver na
 * tabela cai numa bolinha neutra com a inicial, em vez de sumir da vitrine ou
 * mentir uma cor errada.
 */
type Tom = { fundo: string; borda?: string };

const TABELA: Record<string, Tom> = {
  preto: { fundo: "#1a1510" },
  branco: { fundo: "#ffffff", borda: "rgba(0,0,0,0.25)" },
  off_white: { fundo: "#f4efe4", borda: "rgba(0,0,0,0.18)" },
  cru: { fundo: "#efe6d2", borda: "rgba(0,0,0,0.18)" },
  nude: { fundo: "#e3c4ac" },
  bege: { fundo: "#d9c3a5" },
  caramelo: { fundo: "#a9682f" },
  marrom: { fundo: "#5d3a22" },
  chocolate: { fundo: "#4a2c1a" },
  cinza: { fundo: "#8e8e8e" },
  grafite: { fundo: "#4a4a4a" },
  mescla: { fundo: "#b8b0a6" },
  branco_gelo: { fundo: "#f0f4f4", borda: "rgba(0,0,0,0.18)" },
  vermelho: { fundo: "#c8102e" },
  vinho: { fundo: "#6b1f2e" },
  bordo: { fundo: "#5c1a26" },
  rosa: { fundo: "#e8a0b8" },
  rosa_bebe: { fundo: "#f4c2ce" },
  rosa_pink: { fundo: "#e6197f" },
  pink: { fundo: "#e6197f" },
  coral: { fundo: "#f4735a" },
  salmao: { fundo: "#f0917a" },
  laranja: { fundo: "#ef7215" },
  amarelo: { fundo: "#f2c230" },
  mostarda: { fundo: "#c99a1e" },
  verde: { fundo: "#2f8f52" },
  verde_militar: { fundo: "#586b3a" },
  verde_oliva: { fundo: "#6b6b32" },
  verde_agua: { fundo: "#8fd3c4" },
  menta: { fundo: "#a8ddc8" },
  azul: { fundo: "#1f5fa8" },
  azul_marinho: { fundo: "#1c2b4a" },
  azul_bebe: { fundo: "#a9cbe8" },
  azul_serenity: { fundo: "#9db6d6" },
  turquesa: { fundo: "#2fb3ac" },
  jeans: { fundo: "#4a6b8a" },
  lilas: { fundo: "#c2aada" },
  lavanda: { fundo: "#cbb8e0" },
  roxo: { fundo: "#6b3fa0" },
  violeta: { fundo: "#7b4fb0" },
  dourado: { fundo: "#b8891a" },
  prata: { fundo: "#c0c0c0", borda: "rgba(0,0,0,0.2)" },
  animal_print: { fundo: "#c69a5c" },
  onca: { fundo: "#c69a5c" },
  estampado: { fundo: "#c9a76a" },
  tie_dye: { fundo: "#b8a0d0" },
  camuflado: { fundo: "#6b7245" },
  listrado: { fundo: "#9a9a9a" },
};

const NEUTRO: Tom = { fundo: "#d8cdbb", borda: "rgba(0,0,0,0.18)" };

/** "Verde Militar" → "verde_militar". Tira acento, espaço e pontuação. */
function chave(nome: string): string {
  return nome
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export type BolinhaDeCor = { nome: string; fundo: string; borda: string; conhecida: boolean };

export function bolinhaDeCor(nome: string): BolinhaDeCor {
  const tom = TABELA[chave(nome)];
  return {
    nome,
    fundo: (tom || NEUTRO).fundo,
    borda: (tom || NEUTRO).borda || "rgba(0,0,0,0.12)",
    conhecida: Boolean(tom),
  };
}

export function bolinhasDeCor(nomes: string[]): BolinhaDeCor[] {
  return nomes.filter(n => n && n.trim()).map(bolinhaDeCor);
}
