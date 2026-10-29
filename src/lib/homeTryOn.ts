/**
 * As condições do Home Try-On, num lugar só.
 *
 * A cliente leva as peças para experimentar em casa. Duas coisas precisam
 * estar escritas na nota antes de ela sair com a sacola, porque combinar por
 * WhatsApp e lembrar depois é como nasce discussão:
 *
 *   1. devolver o que ela não ficar é por conta dela;
 *   2. se ela não ficar com nada, há uma taxa pelo serviço.
 *
 * Está aqui e não escrito dentro de cada nota porque são três telas de nota —
 * a que a loja imprime, a que a cliente abre pelo link e a de vários pedidos
 * juntos. Texto copiado em três lugares vira três textos diferentes no dia em
 * que um deles mudar.
 *
 * Para mudar o valor da taxa, mude só a linha abaixo.
 */

export const TAXA_SEM_NENHUMA_PECA = 30;

export const ehHomeTryOn = (status: string | null | undefined): boolean =>
  status === "try-on";

const reais = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const CONDICOES_HOME_TRY_ON: readonly string[] = [
  "As peças que você não ficar voltam para a loja, e o envio da devolução é por sua conta.",
  `Se você não ficar com nenhuma peça, é cobrada uma taxa de ${reais(TAXA_SEM_NENHUMA_PECA)} pelo serviço.`,
];
