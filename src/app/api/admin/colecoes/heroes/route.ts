export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Escolhe o hero de cada coleção: a peça que mais vendeu dentro dela.
 *
 * Hero é "a peça que carrega a coleção" — a da foto, a do anúncio, a primeira
 * da vitrine. Não dá para deduzir isso de cor nem de nome, mas dá para olhar o
 * que as clientes efetivamente levaram. É o melhor sinal que existe no sistema.
 *
 * Duas decisões que valem explicar:
 *
 * JANELA DE 90 DIAS, com volta para o histórico inteiro. Hero é sobre o que
 * vende agora, não sobre o que vendeu bem em 2024. Mas coleção que não vendeu
 * nada nos últimos 90 dias ficaria sem hero nenhum, então aí vale o histórico
 * — com o aviso de que o dado é velho.
 *
 * TRY-ON E CANCELADO NÃO SÃO VENDA. Peça que foi para a casa da cliente provar
 * e voltou não vendeu, e contá-la elegeria hero errado — justamente a peça que
 * as pessoas quiseram ver e não quiseram ficar.
 *
 * Não grava nada: devolve a escolha para a tela, que preenche e espera o
 * salvar. Hero é decisão de quem vende; isto é só um ponto de partida.
 */

const STATUS_DE_VENDA = { status: { notIn: ["cancelled", "try-on"] } };
const DIAS_DA_JANELA = 90;

type Atribuicoes = Record<string, string[]>; // productId -> collectionIds

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const atribuicoes: Atribuicoes = body?.atribuicoes ?? {};
  const productIds = Object.keys(atribuicoes).filter(id => atribuicoes[id]?.length);

  if (!productIds.length)
    return NextResponse.json({ heroes: {}, aviso: "Nenhuma peça está em coleção ainda." });

  const desde = new Date(Date.now() - DIAS_DA_JANELA * 24 * 60 * 60 * 1000);

  const somar = (where: object) =>
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds }, order: where },
      _sum: { quantity: true },
    });

  const [recentes, historico] = await Promise.all([
    somar({ ...STATUS_DE_VENDA, createdAt: { gte: desde } } as object),
    somar(STATUS_DE_VENDA as object),
  ]);

  const mapa = (linhas: { productId: string; _sum: { quantity: number | null } }[]) =>
    new Map(linhas.map(l => [l.productId, l._sum.quantity ?? 0]));
  const vendasRecentes = mapa(recentes);
  const vendasHistoricas = mapa(historico);

  // Junta as peças por coleção para disputar o posto dentro de cada uma.
  const porColecao = new Map<string, string[]>();
  for (const [productId, colecoes] of Object.entries(atribuicoes)) {
    for (const c of colecoes) {
      if (!porColecao.has(c)) porColecao.set(c, []);
      porColecao.get(c)!.push(productId);
    }
  }

  const heroes: Record<string, { productId: string; vendas: number; motivo: string }> = {};
  const semVenda: string[] = [];

  for (const [collectionId, pecas] of porColecao) {
    const escolher = (fonte: Map<string, number>) =>
      pecas
        .map(id => ({ id, n: fonte.get(id) ?? 0 }))
        .filter(p => p.n > 0)
        .sort((a, b) => b.n - a.n)[0];

    const recente = escolher(vendasRecentes);
    if (recente) {
      heroes[collectionId] = {
        productId: recente.id,
        vendas: recente.n,
        motivo: `mais vendida em ${DIAS_DA_JANELA} dias (${recente.n})`,
      };
      continue;
    }

    const antigo = escolher(vendasHistoricas);
    if (antigo) {
      heroes[collectionId] = {
        productId: antigo.id,
        vendas: antigo.n,
        motivo: `nada vendeu em ${DIAS_DA_JANELA} dias — a mais vendida no histórico (${antigo.n})`,
      };
      continue;
    }

    semVenda.push(collectionId);
  }

  return NextResponse.json({ heroes, semVenda });
}
