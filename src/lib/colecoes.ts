/**
 * Coleções e papéis — a camada de curadoria que fica POR CIMA da categoria.
 *
 * Três ideias que o resto do código depende e que é melhor não esquecer:
 *
 * 1. CATEGORIA É O QUE A PEÇA É. COLEÇÃO É O QUE ELA CONTA.
 *    A Legging Aline não deixa de ser legging por entrar na UNLOCK. Por isso
 *    coleção é uma relação à parte e NUNCA toca em categoryId — o que já está
 *    cadastrado continua funcionando enquanto a curadoria acontece devagar.
 *
 * 2. UMA PEÇA PODE ESTAR EM MAIS DE UMA COLEÇÃO.
 *    Os cinco universos são permanentes e, na prática, uma peça fica em um só.
 *    Mas uma cápsula sazonal convive com o universo: um biquíni do SOL DE
 *    FLORIPA também é FLOW. Daí muitos-para-muitos desde o começo — tratar
 *    como "uma coleção por peça" trava na primeira cápsula.
 *
 * 3. O PAPEL É O QUE DÁ ORDEM À VITRINE.
 *    "Hero" não é enfeite: é a peça que carrega a coleção e tem que aparecer
 *    primeiro. Sem papel, a vitrine ordena por nome ou por data, que não diz
 *    nada à cliente. ORDEM_PAPEL abaixo é o que transforma isso em consulta.
 */

export type Papel = "hero" | "core" | "performance" | "lifestyle" | "terceira-peca";

export const PAPEIS: {
  value: Papel;
  label: string;
  descricao: string;
  cor: string;
}[] = [
  {
    value: "hero",
    label: "Hero",
    descricao: "Carrega a coleção. É a peça da foto, do anúncio e da vitrine.",
    cor: "#b8891a",
  },
  {
    value: "core",
    label: "Core",
    descricao: "Base que sempre vende. Repõe sem pensar duas vezes.",
    cor: "#2f7d4f",
  },
  {
    value: "performance",
    label: "Performance",
    descricao: "Sustentação e compressão. Vende pelo que aguenta.",
    cor: "#1a6a9a",
  },
  {
    value: "lifestyle",
    label: "Lifestyle",
    descricao: "Transita entre treino e rotina. Vende pelo conforto.",
    cor: "#8a4a6a",
  },
  {
    value: "terceira-peca",
    label: "Terceira peça",
    descricao: "Sobreposição que fecha o look e sobe o ticket.",
    cor: "#7a6040",
  },
];

/** Hero primeiro. É esta ordem que a vitrine da coleção usa. */
export const ORDEM_PAPEL: Papel[] = ["hero", "core", "performance", "lifestyle", "terceira-peca"];

export function papelLabel(valor?: string | null): string | null {
  if (!valor) return null;
  return PAPEIS.find(p => p.value === valor)?.label ?? null;
}

export function papelCor(valor?: string | null): string {
  if (!valor) return "#9a8060";
  return PAPEIS.find(p => p.value === valor)?.cor ?? "#9a8060";
}

export function papelValido(valor: unknown): valor is Papel {
  return typeof valor === "string" && PAPEIS.some(p => p.value === valor);
}

/**
 * Ordena peças de uma coleção com o papel no comando: hero antes de core,
 * core antes do resto, e peça sem papel definido por último — porque peça
 * sem papel é peça que ainda não foi curada, não peça irrelevante.
 */
export function compararPorPapel(
  a: { papel?: string | null },
  b: { papel?: string | null },
): number {
  const posicao = (p?: string | null) => {
    const i = ORDEM_PAPEL.indexOf((p ?? "") as Papel);
    return i === -1 ? ORDEM_PAPEL.length : i;
  };
  return posicao(a.papel) - posicao(b.papel);
}

/**
 * Os cinco universos da proposta de arquitetura, prontos para criar de uma vez.
 * Textos conforme o documento — não inventar mensagem nova aqui, a mensagem é
 * decisão de marca e não de código.
 */
export const UNIVERSOS_PADRAO: {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  ordem: number;
}[] = [
  {
    name: "ESSENCE",
    slug: "essence",
    tagline: "Menos excesso. Mais essência.",
    description:
      "Peças neutras, sofisticadas, atemporais e fáceis de combinar. Preto, off-white, marrom, bordô e tons terrosos.",
    ordem: 1,
  },
  {
    name: "POWER",
    slug: "power",
    tagline: "Seu corpo sabe até onde pode ir. Vá além.",
    description:
      "Treino intenso, alta sustentação, compressão e performance. CrossFit, Hyrox, corrida e academia.",
    ordem: 2,
  },
  {
    name: "FLOW",
    slug: "flow",
    tagline: "Movimento também pode ser leve.",
    description:
      "Linha mais feminina, delicada e wellness. Modelagens confortáveis que transitam entre treino e lifestyle.",
    ordem: 3,
  },
  {
    name: "UNLOCK",
    slug: "unlock",
    tagline: "Desbloqueie sua energia infinita.",
    description:
      "Coleção ousada e autoral, com cores, recortes e peças statement. É o universo que mais traduz a assinatura da marca.",
    ordem: 4,
  },
  {
    name: "ACCESS EVERYDAY",
    slug: "access-everyday",
    tagline: "Treine. Viva. Repita.",
    description:
      "Peças que acompanham a cliente fora do treino: terceira peça, camisetas, jaquetas e itens de lifestyle.",
    ordem: 5,
  },
];
