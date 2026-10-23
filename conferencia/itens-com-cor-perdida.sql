-- Itens de pedido gravados sem cor por causa do bug de "acrescentar peça a
-- pedido já aberto" (corrigido em src/lib/itensDoPedido.ts).
--
-- O que aconteceu: ao acrescentar uma peça a um pedido existente, o sistema
-- gravava a DESCRIÇÃO dentro da coluna de tamanho e não gravava cor nenhuma.
-- A baixa do estoque saiu da chave certa, mas a devolução ao cancelar lê a cor
-- gravada no item — que estava vazia. Pedido cancelado devolvia a peça na
-- chave errada, e o estoque ficava menor do que a prateleira.
--
-- Esta consulta NÃO muda nada. Só lista o que conferir à mão.
--
-- Coluna "o que fazer":
--   "conferir prateleira" → a peça saiu do estoque por cor e pode não ter
--                           voltado; confira a quantidade dessa cor.
--   "sem custo"           → a linha entrou no relatório de lucro como se a
--                           peça fosse de graça.

SELECT
  o.id                                   AS pedido,
  o."createdAt"::date                    AS data,
  u.name                                 AS cliente,
  o.status,
  p.name                                 AS peca,
  oi.quantity                            AS qtd,
  oi.size                                AS "gravado_no_tamanho",
  oi.color                               AS cor,
  oi."costPrice"                         AS custo,
  p."sizeStock"                          AS estoque_atual_da_peca,
  CASE
    WHEN oi.color IS NULL AND p."sizeStock" LIKE '%|%' THEN 'conferir prateleira'
    WHEN oi."costPrice" IS NULL                        THEN 'sem custo'
    ELSE 'conferir'
  END                                    AS o_que_fazer
FROM "OrderItem" oi
JOIN "Product" p ON p.id = oi."productId"
JOIN "Order"   o ON o.id = oi."orderId"
LEFT JOIN "User" u ON u.id = o."userId"
WHERE p.name <> 'Venda Manual'
  AND (
        -- peça que trabalha com cor, mas o item não guardou cor
        (p."sizeStock" LIKE '%|%' AND oi.color IS NULL)
        -- ou o tamanho gravado não é um dos tamanhos da peça (é descrição)
     OR (oi.size IS NOT NULL AND p.sizes LIKE '[%' AND p.sizes NOT LIKE '%"' || oi.size || '"%')
        -- ou a peça tem custo no catálogo e o item nasceu sem custo
     OR (oi."costPrice" IS NULL AND p."costPrice" IS NOT NULL)
      )
ORDER BY o."createdAt" DESC;
