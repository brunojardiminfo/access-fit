/**
 * Selos de frescor da vitrine: "Lançamento" e "Novidade".
 *
 * São dois fatos diferentes sobre a peça:
 *  - Lançamento → entrou no catálogo agora (DIAS_LANCAMENTO desde o cadastro)
 *  - Novidade   → já existia e voltou ao estoque (DIAS_NOVIDADE desde a reposição)
 *
 * Peça recém-cadastrada nunca mostra "Novidade": ela é lançamento, e os dois
 * juntos diriam a mesma coisa duas vezes. Os dois saem sozinhos com o tempo,
 * sem ninguém precisar desmarcar nada.
 */
export const DIAS_LANCAMENTO = 30;
export const DIAS_NOVIDADE = 7;

export type Selo = "lancamento" | "novidade" | null;

function dentroDe(data: Date | string | null | undefined, dias: number, agora: number): boolean {
  if (!data) return false;
  const d = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(d.getTime())) return false;
  return agora - d.getTime() < dias * 24 * 60 * 60 * 1000;
}

export function seloDeFrescor(
  produto: { createdAt: Date | string; restockedAt?: Date | string | null },
  agora: number = Date.now()
): Selo {
  if (dentroDe(produto.createdAt, DIAS_LANCAMENTO, agora)) return "lancamento";
  if (dentroDe(produto.restockedAt, DIAS_NOVIDADE, agora)) return "novidade";
  return null;
}

export const TEXTO_SELO: Record<"lancamento" | "novidade", string> = {
  lancamento: "Lançamento",
  novidade: "Novidade",
};
