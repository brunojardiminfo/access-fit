/**
 * Os dados da loja que aparecem em link e mensagem.
 *
 * O número estava escrito à mão em sete arquivos. Enquanto ele não muda isso
 * não incomoda; no dia em que mudar, seis lugares continuam mandando a
 * cliente para o número velho e ninguém percebe — porque link errado não dá
 * erro, só silêncio. O código novo lê daqui.
 */
export const WHATSAPP_DA_LOJA = "5551986596705";

/**
 * O link que vai no sticker de link do story.
 *
 * O GANHO NÃO É O TOQUE A MENOS DELA, É O QUE CHEGA PARA ELE. Sem isto o
 * direct abre com "oi" e ele responde "oi, qual peça?" — duas mensagens para
 * descobrir o que ela já sabia. Com o nome da peça na mensagem, a primeira
 * frase dela já diz qual peça, e ele responde preço e tamanho de uma vez.
 */
export function linkDoWhats(mensagem: string): string {
  return `https://wa.me/${WHATSAPP_DA_LOJA}?text=${encodeURIComponent(mensagem)}`;
}

export function whatsDaPeca(nome: string): string {
  return linkDoWhats(`Oi! Vi a ${nome.trim()} no story e queria mais informações 💛`);
}

export function whatsDaEnquete(a: string, b: string): string {
  return linkDoWhats(`Oi! Vi a enquete no story e queria saber mais sobre a ${a.trim()} e a ${b.trim()} 💛`);
}
