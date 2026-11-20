/**
 * O que a loja pode contar sobre uma peça para quem não está no admin.
 *
 * O PROBLEMA QUE ISTO RESOLVE. As consultas da vitrine usavam `include`, que
 * devolve a linha inteira do banco. Como o Next manda o objeto do servidor
 * para o navegador, o custo de cada peça saía no código-fonte da página: a
 * home entregava o custo de 38 peças, a lista de conjuntos o de 15, e a API
 * da peça entregava a linha completa. Quem abrisse "ver código-fonte" montava
 * a tabela de custos da loja inteira — e, com ela, sabia exatamente quanta
 * folga a loja tem numa negociação.
 *
 * `include` é uma porta aberta: traz tudo que existe hoje e tudo que for
 * acrescentado amanhã. `select` é uma porta com lista: só sai o que está
 * escrito aqui. Coluna nova no banco não vaza sozinha.
 *
 * O QUE FICA DE FORA, E POR QUÊ:
 *
 *   costPrice     — quanto a peça custa para a loja. É a margem.
 *   supplierCode  — o código do fornecedor. Entrega de quem a loja compra.
 *
 * O `sku` FICA, de propósito: a página da peça mostra ele para a cliente,
 * como código do produto. Não é segredo, é informação de catálogo.
 *
 * COMO USAR: em toda consulta de produto que alimente página ou rota pública,
 * troque `include: { category: true }` por `select: PECA_PUBLICA`. Para quem
 * precisa dos componentes do conjunto, use `PECA_PUBLICA_COM_CONJUNTO`.
 *
 * O admin NÃO usa isto: lá o custo é justamente o que se quer ver.
 */

export const PECA_PUBLICA = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  compareAt: true,
  images: true,
  sizes: true,
  sizeRange: true,
  colors: true,
  sizeStock: true,
  stock: true,
  restockedAt: true,
  sku: true,
  featuredHero: true,
  featured: true,
  saleDiscount: true,
  saleBlocked: true,
  onSale: true,
  isConjunto: true,
  sellComponentsSeparately: true,
  papel: true,
  active: true,
  categoryId: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
} as const;

/** A peça com os componentes do conjunto — a página da peça precisa deles. */
export const PECA_PUBLICA_COM_CONJUNTO = {
  ...PECA_PUBLICA,
  conjuntoItems: true,
} as const;

/**
 * Os campos que nunca podem sair numa resposta pública.
 *
 * Existe para o teste poder afirmar o contrário do que o código faz: em vez
 * de conferir se o `select` está certo, o teste abre as páginas e as rotas de
 * verdade e falha se encontrar qualquer um destes nomes na resposta. É a
 * única forma de pegar o caso em que alguém, daqui a um ano, troca um
 * `select` por um `include` sem perceber — porque isso não quebra nada
 * visível.
 */
export const CAMPOS_SIGILOSOS = ["costPrice", "supplierCode"] as const;
