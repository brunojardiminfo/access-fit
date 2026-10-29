import { unstable_cache, revalidateTag } from "next/cache";

/**
 * O cache da vitrine — o que impede o site de acordar o banco a cada visita.
 *
 * O PROBLEMA QUE ISTO RESOLVE. Toda página da loja consultava o Postgres
 * direto, uma vez por visitante. O Neon cobra por *tempo ligado*, e desliga o
 * banco sozinho depois de alguns minutos sem ninguém perguntar nada. Com cada
 * visita, e cada robô de buscador de madrugada, batendo no banco, ele nunca
 * dormia: ficou ligado 24 horas por dia e a cota mensal acabou no dia dez.
 *
 * POR QUE O PRAZO É LONGO. É o ponto que engana. O Neon dorme depois de ~5
 * minutos parado; um cache de 5 minutos venceria exatamente a tempo de acordar
 * o banco de novo, e ele nunca dormiria — o cache existiria sem economizar
 * nada. O prazo precisa ser bem maior que a soneca para sobrar silêncio no
 * meio. Com uma hora, o banco acorda umas duas dúzias de vezes por dia em vez
 * de ficar ligado o tempo todo.
 *
 * E A LOJA NÃO FICA UMA HORA ATRASADA, porque o prazo não é o que mantém ela
 * em dia: quem mantém é `avisarQueOCatalogoMudou()`, chamado em todo lugar que
 * escreve peça, coleção ou estoque. Salvou no admin, a vitrine já mostra. A
 * hora é só o teto de segurança para o caso de alguém, um dia, escrever num
 * caminho novo e esquecer de avisar.
 *
 * O QUE NUNCA ENTRA AQUI: nada de cliente. Conta, meus pedidos, nota, sacola,
 * crédito e qualquer coisa que dependa de quem está logado continuam ao vivo.
 * Cachear dado de pessoa é servir a página de uma cliente para outra.
 */

/** Tudo que é catálogo: peça, categoria, coleção, estoque, preço, SALE. */
export const TAG_CATALOGO = "catalogo";

/** Uma hora. Veja o comentário acima: longo é de propósito. */
const VALIDADE = 3600;

/**
 * Embrulha uma consulta do catálogo.
 *
 * `chave` identifica a consulta e precisa incluir tudo que muda o resultado —
 * categoria, busca, página. Chaves iguais para resultados diferentes fariam a
 * loja mostrar a lista errada.
 */
export function consultaDaVitrine<T>(
  chave: string[],
  consulta: () => Promise<T>,
): () => Promise<T> {
  return unstable_cache(consulta, ["vitrine", ...chave], {
    tags: [TAG_CATALOGO],
    revalidate: VALIDADE,
  });
}

/**
 * Joga fora o catálogo guardado. Chame depois de QUALQUER escrita que a
 * cliente possa ver: peça, categoria, coleção, e principalmente estoque.
 *
 * Nunca derruba quem chamou. Isto roda dentro de rotas que salvam pedido e
 * baixam estoque; se o aviso falhar, o pior que acontece é a vitrine demorar
 * até o teto de uma hora. Deixar a exceção subir perderia a venda — e perder
 * venda para manter cache em dia é trocar ouro por vidro.
 */
export function avisarQueOCatalogoMudou(): void {
  try {
    // O segundo argumento é exigido pelo Next 16 e diz QUANDO o que está
    // guardado expira. Tem que ser zero — agora. Com "max" a chamada
    // acontecia sem erro nenhum e não limpava nada, que foi exatamente o que
    // o teste pegou.
    revalidateTag(TAG_CATALOGO, { expire: 0 });
  } catch {
    // Fora de um request (seed, script, cron) não há cache para invalidar.
  }
}
