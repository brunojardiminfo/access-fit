/**
 * Palpite de coleção a partir do que a peça já tem cadastrado: cor, categoria
 * e nome. É palpite mesmo — serve para a curadoria das 84 peças não começar
 * numa tela em branco, não para substituir a decisão de quem conhece a peça.
 *
 * O que a cor resolve e o que não resolve:
 *
 *   Cor sozinha NÃO separa ESSENCE, POWER e FLOW. Os três andam em neutros na
 *   proposta — a Milano (ESSENCE), a Hyrox (POWER) e a Flare Nicole (FLOW) são
 *   todas neutras. Quem separa esses três é o tipo da peça, não o tom dela.
 *
 *   Cor resolve bem duas pontas: tom vibrante é UNLOCK ("cores vibrantes,
 *   peças de destaque") e tom suave puxa FLOW ("mais feminina, delicada,
 *   tons suaves"). É daí que vem a maior parte do acerto.
 *
 * Preto e branco são descartados quando a peça tem outra cor junto, porque
 * quase toda peça sai também em preto: se eles contassem, tudo viraria neutro
 * e a cor pararia de informar qualquer coisa.
 *
 * Hero não é sugerido nunca. Qual peça carrega a coleção é decisão de quem
 * vende, não coisa que se deduza de um campo de cor.
 */

import type { Papel } from "./colecoes";

type Familia = "neutro" | "suave" | "vibrante";

/** Mesma normalização de cores.ts: "Verde Militar" → "verde_militar". */
function chave(nome: string): string {
  return nome
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const FAMILIA: Record<string, Familia> = {
  // Neutros e terrosos — a base da ESSENCE, e o uniforme da POWER.
  preto: "neutro", branco: "neutro", off_white: "neutro", cru: "neutro",
  bege: "neutro", cinza: "neutro", grafite: "neutro", mescla: "neutro",
  branco_gelo: "neutro", prata: "neutro", azul_marinho: "neutro", jeans: "neutro",
  marrom: "neutro", chocolate: "neutro", caramelo: "neutro", bordo: "neutro",
  vinho: "neutro", mostarda: "neutro", verde_militar: "neutro",
  verde_oliva: "neutro", camuflado: "neutro", listrado: "neutro",

  // Suaves — a leveza do FLOW.
  nude: "suave", rosa: "suave", rosa_bebe: "suave", lilas: "suave",
  lavanda: "suave", azul_bebe: "suave", azul_serenity: "suave",
  menta: "suave", verde_agua: "suave", salmao: "suave",

  // Vibrantes — o statement do UNLOCK.
  vermelho: "vibrante", rosa_pink: "vibrante", pink: "vibrante",
  coral: "vibrante", laranja: "vibrante", amarelo: "vibrante",
  verde: "vibrante", azul: "vibrante", turquesa: "vibrante",
  roxo: "vibrante", violeta: "vibrante", dourado: "vibrante",
  animal_print: "vibrante", onca: "vibrante", estampado: "vibrante",
  tie_dye: "vibrante",
};

const BASE_DE_TUDO = new Set(["preto", "branco", "off_white", "branco_gelo", "cru"]);

/** Palavras no nome que dizem mais que a cor. */
const NOME_PERFORMANCE = /hyrox|compress|sustenta|power|train|run|corrida|cross|sport|performance|high\s*impact|alto\s*impacto/i;
const NOME_LEVEZA = /flare|pilates|yoga|wide|fluid|soft|light|leve/i;
const NOME_STATEMENT = /macaquinho|macacao|body|recorte|neon|metalic|brilho/i;

/** Categorias que são sobreposição por definição — vão de ACCESS EVERYDAY. */
const CATEGORIA_LIFESTYLE = /jaqueta|casaco|camiseta|cropped|moletom|corta\s*vento|blusa/i;

export type Sugestao = {
  slug: string | null;   // slug da coleção sugerida
  papel: Papel | null;
  motivo: string;        // por que — aparece na tela, para poder discordar
};

/**
 * Decide a família dominante da peça. Preto e branco só contam quando são a
 * única coisa que a peça tem.
 */
export function familiaDominante(cores: string[]): Familia | null {
  const chaves = cores.map(chave).filter(Boolean);
  if (!chaves.length) return null;

  const semBase = chaves.filter(c => !BASE_DE_TUDO.has(c));
  const considerar = semBase.length ? semBase : chaves;

  const contagem: Record<Familia, number> = { neutro: 0, suave: 0, vibrante: 0 };
  let conhecidas = 0;
  for (const c of considerar) {
    const f = FAMILIA[c];
    if (f) { contagem[f]++; conhecidas++; }
  }
  if (!conhecidas) return null;

  // Empate decidido pelo que mais diz sobre a peça: um statement vibrante no
  // meio de neutros é o que define a peça, não o contrário.
  if (contagem.vibrante >= contagem.suave && contagem.vibrante >= contagem.neutro) return "vibrante";
  if (contagem.suave >= contagem.neutro) return "suave";
  return "neutro";
}

export function sugerirParaPeca(peca: {
  name: string;
  categoria: string;
  cores: string[];
}): Sugestao {
  const { name, categoria, cores } = peca;

  // 1. Categoria de sobreposição fecha a questão antes de olhar cor.
  if (CATEGORIA_LIFESTYLE.test(categoria) || CATEGORIA_LIFESTYLE.test(name))
    return { slug: "access-everyday", papel: "terceira-peca", motivo: "peça de sobreposição" };

  // 2. Nome de performance ganha da cor: Hyrox preta é POWER, não ESSENCE.
  if (NOME_PERFORMANCE.test(name))
    return { slug: "power", papel: "performance", motivo: "nome de performance" };

  const familia = familiaDominante(cores);

  // 3. Peça statement pelo nome, mesmo em tom neutro.
  if (NOME_STATEMENT.test(name))
    return { slug: "unlock", papel: null, motivo: "modelagem de destaque" };

  // 4. Agora sim a cor.
  if (familia === "vibrante")
    return { slug: "unlock", papel: null, motivo: "cor vibrante" };

  if (NOME_LEVEZA.test(name))
    return { slug: "flow", papel: "lifestyle", motivo: "modelagem de leveza" };

  if (familia === "suave")
    return { slug: "flow", papel: "lifestyle", motivo: "tom suave" };

  if (familia === "neutro")
    return { slug: "essence", papel: "core", motivo: "tom neutro" };

  // Sem cor cadastrada ou cor que a tabela não conhece: não chuta.
  return { slug: null, papel: null, motivo: "cor não cadastrada — classifique à mão" };
}
