/**
 * Estoque por variação: cor + tamanho.
 *
 * Mora no mesmo campo `sizeStock` do produto, que sempre foi um JSON simples
 * de tamanho para quantidade. A chave agora carrega a cor antes do tamanho,
 * separadas por "|":
 *
 *   {"Preto|P": 2, "Preto|M": 1, "Rosa|P": 3}
 *
 * Chave sem "|" é o formato antigo — estoque lançado antes de existir cor.
 * Ele continua valendo e aparece como "sem cor definida", para nenhum número
 * sumir nem ser inventado. Conforme a peça for reposta com cor, o estoque
 * migra sozinho.
 */
export const SEM_COR = "";
const SEP = "|";

export type Variacao = { cor: string; tamanho: string };

export function montarChave(cor: string, tamanho: string): string {
  const c = (cor || "").trim();
  const t = (tamanho || "").trim();
  return c ? `${c}${SEP}${t}` : t;
}

export function lerChave(chave: string): Variacao {
  const i = chave.indexOf(SEP);
  if (i === -1) return { cor: SEM_COR, tamanho: chave };
  return { cor: chave.slice(0, i), tamanho: chave.slice(i + 1) };
}

export function parseEstoque(json: string | null | undefined): Record<string, number> {
  if (!json) return {};
  try {
    const p = JSON.parse(json);
    if (typeof p !== "object" || p === null || Array.isArray(p)) return {};
    const limpo: Record<string, number> = {};
    for (const [k, v] of Object.entries(p)) {
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isNaN(n)) limpo[k] = n;
    }
    return limpo;
  } catch {
    return {};
  }
}

export function totalDoEstoque(mapa: Record<string, number>): number {
  return Object.values(mapa).reduce((s, n) => s + n, 0);
}

/** Quantidade de uma variação. Sem cor pedida, cai na chave antiga. */
export function quantidadeDe(mapa: Record<string, number>, cor: string, tamanho: string): number {
  return mapa[montarChave(cor, tamanho)] ?? 0;
}

/** Soma de todas as variações de uma cor, em todos os tamanhos. */
export function totalDaCor(mapa: Record<string, number>, cor: string): number {
  return Object.entries(mapa)
    .filter(([k]) => lerChave(k).cor === cor)
    .reduce((s, [, n]) => s + n, 0);
}

/** Cores que aparecem no estoque, na ordem em que a peça as cadastrou. */
export function coresDoEstoque(mapa: Record<string, number>, ordem: string[] = []): string[] {
  const presentes = new Set(Object.keys(mapa).map(k => lerChave(k).cor));
  const ordenadas = ordem.filter(c => presentes.has(c));
  const resto = [...presentes].filter(c => !ordenadas.includes(c));
  return [...ordenadas, ...resto];
}

/** Cores com ao menos uma peça disponível. */
export function coresDisponiveis(mapa: Record<string, number>, ordem: string[] = []): string[] {
  return coresDoEstoque(mapa, ordem).filter(c => totalDaCor(mapa, c) > 0);
}

/** Tamanhos lançados para uma cor, na ordem em que a peça os cadastrou. */
export function tamanhosDaCor(mapa: Record<string, number>, cor: string, ordem: string[] = []): string[] {
  const presentes = Object.keys(mapa).map(lerChave).filter(v => v.cor === cor).map(v => v.tamanho);
  const unicos = [...new Set(presentes)];
  const ordenados = ordem.filter(t => unicos.includes(t));
  return [...ordenados, ...unicos.filter(t => !ordenados.includes(t))];
}

/** true quando a peça tem estoque lançado por variação. */
export function temEstoquePorVariacao(mapa: Record<string, number>): boolean {
  return Object.keys(mapa).length > 0;
}

/** true quando alguma chave carrega cor — a peça já foi lançada no formato novo. */
export function temCorNoEstoque(mapa: Record<string, number>): boolean {
  return Object.keys(mapa).some(k => lerChave(k).cor !== SEM_COR);
}

/** Soma `delta` numa variação. Nunca cria chave para somar zero. */
export function somarNaVariacao(
  mapa: Record<string, number>, cor: string, tamanho: string, delta: number
): Record<string, number> {
  if (delta === 0) return { ...mapa };
  const chave = montarChave(cor, tamanho);
  return { ...mapa, [chave]: (mapa[chave] ?? 0) + delta };
}
