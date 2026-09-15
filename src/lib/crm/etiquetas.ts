import { prisma } from "@/lib/prisma";
import { perfisDeTodas, type Perfil } from "./perfil";

/**
 * Etiquetas calculadas. Voce nao mantem nenhuma destas na mao: a rotina noturna
 * apaga e refaz todos os vinculos automaticos a cada passada. As etiquetas que
 * voce cria (auto = false) nunca sao tocadas por aqui.
 */

export type EtiquetaAuto = {
  slug: string;
  nome: string;
  cor: string;
  explica: string;
  /** `topo` e o corte do top 10% em valor gasto, calculado sobre a loja toda. */
  vale: (p: Perfil, contexto: { topo: number; indicacoes: number }) => boolean;
};

const DIAS_PARA_NOVA = 60;
const DIAS_SEM_CICLO = 120;
const ATRASO_INATIVA = 1.5;

export const ETIQUETAS_AUTO: EtiquetaAuto[] = [
  {
    slug: "vip", nome: "VIP", cor: "#b8891a",
    explica: "Está entre os 10% que mais gastaram, com 2 pedidos ou mais",
    vale: (p, c) => p.quantidade >= 2 && p.totalGasto >= c.topo && c.topo > 0,
  },
  {
    slug: "nova", nome: "Nova", cor: "#1a8a2a",
    explica: `Comprou uma vez só, e faz menos de ${DIAS_PARA_NOVA} dias`,
    vale: p => p.quantidade === 1 && (p.diasSemComprar ?? 999) <= DIAS_PARA_NOVA,
  },
  {
    slug: "recorrente", nome: "Recorrente", cor: "#1a6a9a",
    explica: "Já comprou 3 vezes ou mais",
    vale: p => p.quantidade >= 3,
  },
  {
    slug: "inativa", nome: "Inativa", cor: "#c04040",
    explica: `Passou de ${ATRASO_INATIVA}× o próprio ritmo de compra (ou ${DIAS_SEM_CICLO} dias, quando só comprou uma vez)`,
    vale: p => {
      if (!p.quantidade) return false;
      if (p.atraso !== null) return p.atraso >= ATRASO_INATIVA;
      return (p.diasSemComprar ?? 0) >= DIAS_SEM_CICLO;
    },
  },
  {
    slug: "so-promocao", nome: "Só em promoção", cor: "#8a1ab8",
    explica: "70% ou mais dos pedidos dela saíram com desconto ou cupom",
    vale: p => p.quantidade >= 3 && p.fatiaComDesconto >= 0.7,
  },
  {
    slug: "devolve-muito", nome: "Devolve com frequência", cor: "#a0522d",
    explica: "Duas devoluções ou mais, ou devolveu em 1 de cada 3 pedidos",
    vale: p => p.devolucoes >= 2 || (p.quantidade >= 3 && p.devolucoes / p.quantidade >= 0.33),
  },
  {
    slug: "indica-amigas", nome: "Indica amigas", cor: "#d1477a",
    explica: "Trouxe pelo menos uma cliente por indicação",
    vale: (_p, c) => c.indicacoes > 0,
  },
  {
    slug: "saldo-aberto", nome: "Saldo em aberto", cor: "#856404",
    explica: "Tem valor a receber em algum pedido",
    vale: p => p.saldoAberto > 0.01,
  },
];

const AUTO_SLUGS = ETIQUETAS_AUTO.map(e => e.slug);

/** Percentil sem depender de biblioteca: 0.9 devolve o corte do top 10%. */
function corte(valores: number[], percentil: number): number {
  const positivos = valores.filter(v => v > 0).sort((a, b) => a - b);
  if (!positivos.length) return 0;
  const i = Math.min(positivos.length - 1, Math.floor(positivos.length * percentil));
  return positivos[i];
}

async function garantirEtiquetasAuto() {
  for (const e of ETIQUETAS_AUTO) {
    await prisma.customerTag.upsert({
      where: { slug: e.slug },
      update: { name: e.nome, color: e.cor, auto: true },
      create: { slug: e.slug, name: e.nome, color: e.cor, auto: true },
    });
  }
}

/**
 * Recalcula as etiquetas automaticas da loja inteira.
 *
 * Substitui os vinculos automaticos por inteiro em vez de tentar descobrir o que
 * mudou: e uma consulta a mais e uma classe de bug a menos (etiqueta que nao sai
 * quando a cliente deixa de se encaixar).
 */
export async function recalcularEtiquetas(agora = new Date()) {
  await garantirEtiquetasAuto();

  const [tags, perfis, indicacoes] = await Promise.all([
    prisma.customerTag.findMany({ where: { auto: true } }),
    perfisDeTodas(agora),
    prisma.referral.groupBy({ by: ["referrerId"], _count: { _all: true } }),
  ]);

  const idDaTag = new Map(tags.map(t => [t.slug, t.id]));
  const indicacoesPor = new Map(indicacoes.map(r => [r.referrerId, r._count._all]));
  const topo = corte([...perfis.values()].map(p => p.totalGasto), 0.9);

  const novos: { userId: string; tagId: string }[] = [];
  for (const [userId, perfil] of perfis) {
    const contexto = { topo, indicacoes: indicacoesPor.get(userId) || 0 };
    for (const e of ETIQUETAS_AUTO) {
      const tagId = idDaTag.get(e.slug);
      if (tagId && e.vale(perfil, contexto)) novos.push({ userId, tagId });
    }
  }

  const idsAuto = tags.map(t => t.id);
  await prisma.$transaction([
    prisma.customerTagLink.deleteMany({ where: { tagId: { in: idsAuto } } }),
    prisma.customerTagLink.createMany({ data: novos, skipDuplicates: true }),
  ]);

  return { clientes: perfis.size, vinculos: novos.length, corteVip: topo };
}

export function ehAutomatica(slug: string) {
  return AUTO_SLUGS.includes(slug);
}
