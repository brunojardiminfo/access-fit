import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSaleInfo } from "@/lib/saleHelper";
import { parseJson } from "@/lib/utils";
import { AGENDA, diaDaAgenda, montarRoteiro, DESCANSO_DA_PECA } from "@/lib/agenda";
import type { PecaDaPauta } from "@/lib/pauta";
import StoriesClient from "./StoriesClient";

export const dynamic = "force-dynamic";

/**
 * A agenda do dia: sete stories numerados, na ordem de postar.
 *
 * A TELA ANTIGA ENTREGAVA ESCOLHA, E ESCOLHER ERA O TRABALHO. Três sugestões
 * com "trocar" ainda deixavam a decisão de pé todo dia. Aqui o dia já está
 * decidido pela agenda da semana: ele abre e executa de 1 a 7.
 */
export default async function StoriesPage() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin") redirect("/");

  const agora = new Date();
  const dia = diaDaAgenda(agora);

  const [pecas, postados, vendidas] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, stock: { gt: 0 }, NOT: { slug: "venda-manual" } },
      select: {
        id: true, name: true, slug: true, price: true, images: true, stock: true,
        createdAt: true, restockedAt: true, onSale: true, saleDiscount: true, saleBlocked: true,
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.storyPost.findMany({
      where: { postedAt: { gt: new Date(agora.getTime() - 60 * 86400000) }, productId: { not: null } },
      select: { productId: true, postedAt: true },
      orderBy: { postedAt: "desc" },
    }),
    // as campeãs do sábado: o que mais saiu nos últimos sete dias
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      where: { order: { status: { not: "cancelled" }, createdAt: { gt: new Date(agora.getTime() - 7 * 86400000) } } },
    }),
  ]);

  // Peça sem foto não vira story. Aparecer para dar erro no clique é pior que
  // não aparecer.
  const comFoto = pecas.filter(p => parseJson<string[]>(p.images, []).some(u => (u || "").trim()));

  /** A última vez que cada peça foi ao ar. A lista já vem da mais nova. */
  const ultimoPost = new Map<string, Date>();
  for (const p of postados) if (p.productId && !ultimoPost.has(p.productId)) ultimoPost.set(p.productId, p.postedAt);

  const precoDe = (p: PecaDaPauta) => {
    const info = getSaleInfo({
      price: p.price, onSale: p.onSale, saleDiscount: p.saleDiscount ?? null,
      saleBlocked: p.saleBlocked, createdAt: p.createdAt, restockedAt: p.restockedAt ?? null,
    });
    return { preco: info ? info.salePrice : p.price, desconto: info ? info.discount : 0 };
  };

  // O dia manda nas candidatas: categoria do dia, campeãs no sábado, tudo no
  // domingo (que não usa peça nenhuma).
  const campeas = new Set(
    vendidas.sort((a, b) => (b._sum.quantity || 0) - (a._sum.quantity || 0)).map(v => v.productId),
  );
  const doDia = dia.categorias.length
    ? comFoto.filter(p => dia.categorias.includes(p.category?.name?.trim() || ""))
    : comFoto.filter(p => campeas.has(p.id));

  const roteiro = montarRoteiro(dia, doDia as PecaDaPauta[], comFoto as PecaDaPauta[], ultimoPost, precoDe, agora);

  const paraTela = comFoto.map(p => {
    const { preco, desconto } = precoDe(p as PecaDaPauta);
    return {
      id: p.id, nome: p.name.trim(), categoria: p.category?.name ?? null,
      foto: parseJson<string[]>(p.images, []).find(u => (u || "").trim())!,
      preco, precoCheio: p.price, desconto, estoque: p.stock,
    };
  });

  const hoje = new Date(agora.getTime() - 3 * 3600000).toISOString().slice(0, 10);
  const postadosHoje = postados.filter(
    p => new Date(p.postedAt.getTime() - 3 * 3600000).toISOString().slice(0, 10) === hoje,
  ).length;

  const miniaturas = roteiro.filter(p => p.peca).map(p => p.peca!.id);

  return (
    <StoriesClient
      pecas={paraTela}
      miniaturas={miniaturas}
      dia={{ nome: dia.nome, tema: dia.tema, categorias: dia.categorias }}
      semana={AGENDA.map(d => ({
        nome: d.nome.slice(0, 3), tema: d.categorias.join(" + ") || d.tema,
        hoje: d.diaDaSemana === dia.diaDaSemana,
      }))}
      descanso={DESCANSO_DA_PECA}
      postadosHoje={postadosHoje}
      roteiro={roteiro.map(p => ({
        slot: p.slot, tipo: p.tipo, etiqueta: p.etiqueta, instrucao: p.instrucao,
        texto: p.texto, pecaId: p.peca?.id ?? null,
        dueloIds: p.duelo ? [p.duelo.a.id, p.duelo.b.id] as [string, string] : null,
        avisoDeRepeticao: p.avisoDeRepeticao ?? null,
        capa: p.capa ?? null,
      }))}
    />
  );
}
