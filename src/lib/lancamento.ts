/**
 * A data do lançamento da Alma de Floripa, num lugar só.
 *
 * Fica aqui, e não dentro do componente da faixa, porque é informação do
 * negócio e não de interface: quando a data mudar, é este arquivo que se abre.
 *
 * O instante é absoluto, em UTC, porque o servidor roda em UTC e a loja vive no
 * horário de Brasília. 2026-10-21T03:00Z é a meia-noite do dia 21 em Porto
 * Alegre — ou seja, o fim do dia 20.
 */
export const LANCAMENTO_ALMA_DE_FLORIPA = Date.parse("2026-10-21T03:00:00Z");

/**
 * A faixa some sozinha depois da data. Aviso de contagem regressiva esquecido
 * no ar é pior que aviso nenhum: no dia 21 ele passa a anunciar uma data que
 * já passou, e quem chega na loja conclui que ninguém cuida dela.
 */
export function avisoDoLancamentoAtivo(agora: number = Date.now()): boolean {
  return agora < LANCAMENTO_ALMA_DE_FLORIPA;
}
