/**
 * O vocabulário da agenda: o que é uma peça, e o que dizer quando não há peça.
 *
 * ESTE ARQUIVO ERA UM GERADOR DE IDEIAS. Ele montava dez sugestões a partir do
 * banco — "restam 2", "parada há 400 dias", "40% off" — e a tela pedia que o
 * Bruno escolhesse entre elas. A agenda (src/lib/agenda.ts) tomou o lugar
 * daquilo: o dia já vem decidido, e escolher deixou de ser tarefa dele.
 *
 * Ficou o que a agenda ainda usa. O resto foi embora em vez de continuar aqui
 * parecendo vivo — código morto que compila é o que faz alguém, daqui a seis
 * meses, mudar a regra no lugar que não roda.
 */

export type PecaDaPauta = {
  id: string; name: string; slug: string; price: number; images: string;
  stock: number; createdAt: Date | string; restockedAt: Date | string | null;
  onSale?: boolean; saleDiscount?: number | null; saleBlocked?: boolean;
  category?: { name: string } | null;
};

/**
 * Domingo: a prova de que a loja é gente, não vitrine.
 *
 * É o conteúdo mais fácil de fazer — foto do que já está acontecendo — e o
 * que mais constrói confiança em quem ainda não comprou. Gira pela data em
 * vez de sorteio, para o domingo de hoje ser o mesmo se ele abrir a tela duas
 * vezes.
 */
export const BASTIDORES: string[] = [
  "Domingo por aqui ✨ Semana nova vem com novidade — fica de olho 💛",
  "Separando os pedidos da semana 📦 Cada peça conferida uma a uma antes de sair.",
  "Print do feedback de quem já está usando 💛 Nada que eu falar vende mais que isso.",
  "Fim de semana por aqui. Obrigada a cada uma que confiou 💛",
  "Chegou coisa nova essa semana 👀 Segunda eu mostro tudo.",
];

export function bastidorDoDia(agora: Date = new Date()): string {
  const dia = new Date(agora.getTime() - 3 * 3600000).getUTCDate();
  return BASTIDORES[dia % BASTIDORES.length];
}
