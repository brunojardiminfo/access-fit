/**
 * Como um item de pedido nasce — em qualquer caminho que o crie.
 *
 * Existiam duas conversões, uma na criação do pedido e outra ao acrescentar
 * peças a um pedido já aberto, e elas discordavam. A da criação guardava cor,
 * componente e custo, mas perdia a descrição da venda avulsa. A de acrescentar
 * guardava a descrição e perdia cor, componente e custo — e, como a devolução
 * ao estoque lê a cor gravada no item, cancelar um pedido devolvia a peça na
 * chave errada e sumia estoque de verdade.
 *
 * Agora é uma função só. Enquanto os dois caminhos chamarem esta, não há como
 * discordarem de novo.
 *
 * A convenção do "Venda Manual": a peça não existe no catálogo, então a coluna
 * `size` carrega o texto livre, que é o que a tela mostra no lugar do nome do
 * produto. Para peça de verdade, `size` é o tamanho, como o nome diz.
 */

export type ItemRecebido = {
  productId?: string | null;
  description?: string | null;
  quantity: number;
  price: number;
  size?: string | null;
  color?: string | null;
  componentName?: string | null;
};

export type ItemGravado = {
  productId: string;
  quantity: number;
  price: number;
  size: string | null;
  color: string | null;
  componentName: string | null;
  costPrice: number | null;
};

/** true quando o item é lançamento avulso, sem peça no catálogo por trás. */
export function ehVendaAvulsa(i: ItemRecebido, vendaManualId: string | null): boolean {
  return !i.productId || (!!vendaManualId && i.productId === vendaManualId);
}

/**
 * `custoDaPeca` é o custo lido do catálogo. Em venda avulsa não existe peça,
 * então não existe custo — e deixar zero inventaria lucro no relatório.
 */
export function montarItemDoPedido(
  i: ItemRecebido,
  vendaManualId: string | null,
  custoDaPeca: number | null,
): ItemGravado {
  const avulso = ehVendaAvulsa(i, vendaManualId);
  const productId = i.productId || vendaManualId;
  if (!productId) throw new Error("Item sem produto e sem 'Venda Manual' para cair.");

  return {
    productId,
    quantity: i.quantity,
    price: i.price,
    size: avulso ? (i.description || null) : (i.size || null),
    color: avulso ? null : (i.color || null),
    componentName: avulso ? null : (i.componentName || null),
    costPrice: avulso ? null : custoDaPeca,
  };
}
