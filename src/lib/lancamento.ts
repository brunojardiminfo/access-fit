/**
 * A data do lançamento da Alma de Floripa, num lugar só.
 *
 * Fica aqui, e não dentro do componente da faixa, porque é informação do
 * negócio e não de interface: quando a data mudar, é este arquivo que se abre.
 *
 * UMA FONTE SÓ. A primeira versão guardava o instante do corte aqui e o texto
 * "20.10" escrito à mão dentro da faixa. Mudar a data e esquecer o rótulo (ou
 * o contrário) era questão de tempo — e o estrago seria a loja anunciar um dia
 * e sumir no outro. Agora as duas coisas saem daqui.
 */
const DIA = 25, MES = 10, ANO = 2026;

/** Como a data aparece para a cliente: "25.10". */
export const DATA_DO_LANCAMENTO = `${String(DIA).padStart(2, "0")}.${String(MES).padStart(2, "0")}`;

/**
 * Até quando a faixa fica no ar: a virada do dia seguinte em Porto Alegre.
 * O instante é absoluto porque o servidor roda em UTC e a loja vive no horário
 * de Brasília (UTC−3) — meia-noite em POA é 03:00Z.
 */
export const FIM_DO_AVISO = Date.UTC(ANO, MES - 1, DIA + 1, 3, 0, 0);

/**
 * A faixa some sozinha depois da data. Aviso de contagem regressiva esquecido
 * no ar é pior que aviso nenhum: no dia seguinte ele passa a anunciar uma data
 * que já passou, e quem chega na loja conclui que ninguém cuida dela.
 */
export function avisoDoLancamentoAtivo(agora: number = Date.now()): boolean {
  return agora < FIM_DO_AVISO;
}
