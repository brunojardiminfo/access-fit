/**
 * Quem aparece na vitrine da loja.
 *
 * São duas condições, com donos diferentes:
 *
 *   `active`      — a decisão de quem administra: peça desligada à mão.
 *   `stock > 0`   — a realidade da prateleira.
 *
 * Peça esgotada some sozinha da vitrine e volta sozinha quando o estoque é
 * reposto. Ninguém precisa lembrar de desligar nem de religar, e a peça nunca
 * é excluída: ela continua no catálogo, no histórico de pedidos e nos
 * relatórios.
 *
 * Estoque negativo — vendido além do previsto — também fica de fora, porque
 * negativo não é disponibilidade.
 *
 * O QUE ISTO *NÃO* ESCONDE: a página da peça. Quem chega nela por link,
 * busca ou favorito continua vendo a peça marcada como esgotada, com o botão
 * "me avise quando voltar ao estoque". É por ali que a venda é recuperada e
 * que se descobre o que vale repor; esconder a página junto mataria a lista
 * de espera e transformaria todo link antigo em erro.
 *
 * O admin não usa este filtro: lá tudo aparece, esgotado ou não.
 */
export const PECA_NA_VITRINE = { active: true, stock: { gt: 0 } };

/** O mesmo, para quando a peça vem por uma relação (coleção, look, pedido). */
export const PRODUTO_NA_VITRINE = { product: PECA_NA_VITRINE };
