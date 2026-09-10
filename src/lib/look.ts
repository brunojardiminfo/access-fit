/**
 * Link de look: um carrinho pronto que cabe num link só.
 *
 * A modelo aparece com três peças no story, mas o Instagram só deixa um link.
 * Em vez de mandar a cliente caçar peça por peça, o link já abre a sacola
 * montada.
 *
 * As peças viajam na propria URL, sem nada gravado no banco:
 *
 *   /look?p=legging-sculpt~Preto~M~1,top-nadador~Preto~P~1
 *
 * Assim o link nao cria pedido nenhum no admin, nunca expira, e da para
 * conferir a olho o que ele carrega. Cor, tamanho e quantidade sao opcionais:
 * "legging-sculpt" sozinho ja vale, e a cliente escolhe o resto.
 */
export type ItemDoLook = {
  slug: string;
  cor?: string;
  tamanho?: string;
  quantidade: number;
};

const SEP_ITEM = ",";
const SEP_CAMPO = "~";
const MAX_ITENS = 12;

export function montarLook(itens: ItemDoLook[]): string {
  return itens
    .filter(i => i.slug)
    .slice(0, MAX_ITENS)
    .map(i => [
      i.slug,
      i.cor || "",
      i.tamanho || "",
      String(Math.max(1, i.quantidade || 1)),
    ].join(SEP_CAMPO).replace(/~+$/, "")) // corta campos vazios no fim
    .join(SEP_ITEM);
}

export function lerLook(p: string | null | undefined): ItemDoLook[] {
  if (!p) return [];
  return p
    .split(SEP_ITEM)
    .map((pedaco): ItemDoLook | null => {
      const [slug, cor, tamanho, qtd] = pedaco.split(SEP_CAMPO);
      if (!slug?.trim()) return null;
      const n = parseInt(qtd || "1", 10);
      return {
        slug: slug.trim(),
        cor: cor?.trim() || undefined,
        tamanho: tamanho?.trim() || undefined,
        quantidade: Number.isNaN(n) || n < 1 ? 1 : Math.min(n, 20),
      };
    })
    .filter((i): i is ItemDoLook => i !== null)
    .slice(0, MAX_ITENS);
}

/** URL completa do look, para copiar e colar no story. */
export function urlDoLook(itens: ItemDoLook[], base: string): string {
  const p = montarLook(itens);
  return `${base.replace(/\/$/, "")}/look?p=${encodeURIComponent(p)}`;
}
