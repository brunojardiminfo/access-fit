/**
 * A Black November, num lugar só.
 *
 * POR QUE NÃO USEI O SISTEMA DE CAMPANHA QUE JÁ EXISTE (src/lib/campanha.ts).
 * Aquele não anuncia: ele *cobra*. A escada dele entra no preço da sacola, no
 * checkout e no servidor. A Black November desta vez é outra mecânica — o
 * desconto está marcado peça a peça no SALE, pelo painel de liquidação — e
 * ligar a campanha só para ter a faixa sairia dando um segundo desconto por
 * cima, em cima do que a cliente já está pagando a menos. Aqui é anúncio e
 * nada mais: esta faixa não altera preço nenhum.
 *
 * SOME SOZINHA. Dia 01/12 a faixa desaparece sem ninguém lembrar dela.
 * Promoção vencida esquecida no ar é pior que promoção nenhuma: anuncia uma
 * data que já passou, e quem chega conclui que ninguém cuida da loja.
 */

const INICIO = new Date("2026-11-20T00:00:00-03:00");
const FIM = new Date("2026-11-30T23:59:59-03:00");

/** Como as datas aparecem para a cliente: "20 a 30 de novembro". */
export const PERIODO = "20 a 30 de novembro";

export function blackNovemberAtiva(agora: Date = new Date()): boolean {
  return agora >= INICIO && agora <= FIM;
}

/**
 * Quantos dias ainda restam, contando hoje. No último dia vale 1, nunca 0.
 *
 * Contado sobre a data de Brasília, não sobre a do servidor: o servidor roda
 * em UTC, e entre 21h e meia-noite em Porto Alegre ele já virou o dia. Sem
 * isso, a faixa diria "último dia" numa noite em que ainda faltam dois.
 */
export function diasRestantes(agora: Date = new Date()): number {
  const emPOA = (d: Date) =>
    new Date(d.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const hoje = emPOA(agora);
  const fim = emPOA(FIM);
  hoje.setHours(0, 0, 0, 0);
  fim.setHours(0, 0, 0, 0);
  const dias = Math.round((fim.getTime() - hoje.getTime()) / 86400000) + 1;
  return Math.max(0, dias);
}

/**
 * A urgência que a faixa mostra — e só quando é verdade.
 *
 * Nada de "últimas horas" no dia 21. A frase só aperta quando a data aperta
 * de fato, porque urgência inventada é a coisa que a cliente aprende a
 * ignorar primeiro.
 */
export function chamadaDePrazo(agora: Date = new Date()): string {
  const d = diasRestantes(agora);
  if (d <= 1) return "último dia";
  if (d <= 3) return `últimos ${d} dias`;
  return PERIODO;
}
