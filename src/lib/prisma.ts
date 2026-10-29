import { PrismaClient } from "@prisma/client";
import { avisarQueOCatalogoMudou } from "@/lib/cacheDaVitrine";

/**
 * O que a cliente vê na vitrine. Escrita em qualquer uma destas tabelas torna
 * o catálogo guardado velho, e o cache precisa ser avisado.
 *
 * `Product` cobre o estoque, porque estoque é coluna de peça — é por aqui que
 * a venda, o cancelamento e a devolução avisam também, sem precisarem saber
 * que existe cache.
 */
const TABELAS_DA_VITRINE = new Set([
  "Product", "Category", "Collection", "CollectionProduct", "ConjuntoItem",
]);

const ESCRITAS = new Set([
  "create", "createMany", "createManyAndReturn",
  "update", "updateMany", "upsert",
  "delete", "deleteMany",
]);

function createPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

  /**
   * POR QUE AQUI, E NÃO EM CADA ROTA.
   *
   * São catorze arquivos que escrevem catálogo hoje, e vai existir o décimo
   * quinto. Avisar o cache em cada um é uma lista que alguém — eu, daqui a
   * dois meses — vai deixar incompleta, e o sintoma seria o pior possível:
   * vitrine mostrando peça esgotada, sem erro nenhum aparecendo. Este projeto
   * já teve um bug assim, quando duas conversões de item de pedido passaram a
   * discordar em silêncio.
   *
   * Aqui não há como esquecer: toda escrita passa por este ponto.
   */
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const resultado = await query(args);
          if (model && TABELAS_DA_VITRINE.has(model) && ESCRITAS.has(operation)) {
            avisarQueOCatalogoMudou();
          }
          return resultado;
        },
      },
    },
  });
}

type ClientePrisma = ReturnType<typeof createPrismaClient>;

declare global {
  var prismaGlobal: ClientePrisma | undefined;
}

export const prisma: ClientePrisma = global.prismaGlobal ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") global.prismaGlobal = prisma;
