import { prisma } from "@/lib/prisma";
import { varrer } from "./tarefas";
import { recalcularEtiquetas } from "./etiquetas";
import { filaDoDia } from "./fila";
import { sendPushToUser } from "@/lib/firebase-admin";
import { DIA } from "./perfil";
import { DIAS_PARA_SALE } from "@/lib/saleHelper";
import { parseJson } from "@/lib/utils";

/**
 * A rotina que roda sozinha.
 *
 * Diaria: recalcula etiquetas, varre a fila e avisa voce no celular.
 * Semanal (segunda): o que a loja precisa que voce olhe — peca parada, estoque
 *   baixo, pauta de conteudo.
 * Mensal (dia 1): fechamento do mes anterior.
 *
 * As tarefas de loja nao tem WhatsApp: elas levam para a tela onde o problema
 * se resolve.
 */

const ESTOQUE_BAIXO = 2;
const TETO_LISTA = 8;

const real = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function tarefaDeLoja(t: {
  key: string; kind: string; title: string; detail: string; priority: number; link: string;
}) {
  const dados = {
    kind: t.kind, title: t.title, detail: t.detail, priority: t.priority,
    userId: null, valueAtStake: 0, meta: JSON.stringify({ link: t.link }),
  };
  const antes = await prisma.crmTask.findUnique({ where: { key: t.key }, select: { id: true } });
  await prisma.crmTask.upsert({
    where: { key: t.key },
    update: dados,
    create: { key: t.key, ...dados, dueAt: new Date() },
  });
  return antes ? 0 : 1;
}

const semanaDe = (d: Date) => {
  const inicio = new Date(d.getFullYear(), 0, 1);
  return `${d.getFullYear()}s${Math.ceil(((d.getTime() - inicio.getTime()) / DIA + inicio.getDay() + 1) / 7)}`;
};

/** Peça parada, estoque acabando e a pauta da semana. */
export async function rotinaSemanal(agora = new Date()) {
  const semana = semanaDe(agora);
  const limite = new Date(agora.getTime() - DIAS_PARA_SALE * DIA);
  let criadas = 0;

  const paradas = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 }, onSale: false, createdAt: { lte: limite } },
    select: { id: true, name: true, createdAt: true, stock: true },
    orderBy: { createdAt: "asc" },
    take: TETO_LISTA,
  });
  if (paradas.length) {
    const nomes = paradas.map(p => p.name).slice(0, 4).join(", ");
    criadas += await tarefaDeLoja({
      key: `revisao-sale:${semana}`,
      kind: "revisao-sale",
      title: `${paradas.length} peça(s) passaram de ${DIAS_PARA_SALE} dias`,
      detail: `${nomes}${paradas.length > 4 ? "…" : ""}. Revisar preço ou entrar no SALE.`,
      priority: 50,
      link: "/admin/sale",
    });
  }

  const baixos = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0, lte: ESTOQUE_BAIXO } },
    select: { name: true, stock: true },
    orderBy: { stock: "asc" },
    take: TETO_LISTA,
  });
  if (baixos.length) {
    criadas += await tarefaDeLoja({
      key: `repor:${semana}`,
      kind: "repor",
      title: `${baixos.length} peça(s) acabando`,
      detail: baixos.map(p => `${p.name} (${p.stock})`).slice(0, 5).join(", "),
      priority: 52,
      link: "/admin/produtos",
    });
  }

  // Pauta: o que entra no carrinho e nao vira venda é o que precisa de conteudo.
  const sacolas = await prisma.cartLead.findMany({
    where: { updatedAt: { gte: new Date(agora.getTime() - 7 * DIA) }, status: { not: "comprou" } },
    select: { items: true },
    take: 300,
  });
  const desejo = new Map<string, number>();
  for (const s of sacolas) {
    for (const i of parseJson<{ nome?: string }[]>(s.items, [])) {
      if (i.nome) desejo.set(i.nome, (desejo.get(i.nome) || 0) + 1);
    }
  }
  const topo = [...desejo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (topo.length) {
    criadas += await tarefaDeLoja({
      key: `pauta:${semana}`,
      kind: "pauta",
      title: "Pauta da semana para o Instagram",
      detail: `Mais desejadas e não compradas: ${topo.map(([n, v]) => `${n} (${v}×)`).join(", ")}.`,
      priority: 22,
      link: "/admin/marketing",
    });
  }

  return criadas;
}

/** Fechamento do mês anterior. */
export async function rotinaMensal(agora = new Date()) {
  const fim = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const inicio = new Date(fim.getFullYear(), fim.getMonth() - 1, 1);
  const rotulo = inicio.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const pedidos = await prisma.order.findMany({
    where: { status: { not: "cancelled" }, createdAt: { gte: inicio, lt: fim } },
    select: { total: true, userId: true },
  });

  const faturamento = pedidos.reduce((s, p) => s + p.total, 0);
  const clientes = new Set(pedidos.map(p => p.userId)).size;
  const ticket = pedidos.length ? faturamento / pedidos.length : 0;

  return tarefaDeLoja({
    key: `fechamento:${inicio.getFullYear()}-${inicio.getMonth() + 1}`,
    kind: "fechamento",
    title: `Fechamento de ${rotulo}`,
    detail: `${real(faturamento)} em ${pedidos.length} pedidos, ${clientes} clientes, ticket ${real(ticket)}.`,
    priority: 45,
    link: "/admin/financeiro",
  });
}

function resumoDaManha(porTipo: Record<string, number>, total: number): string {
  if (!total) return "Hoje está limpo — nada urgente na fila.";
  const nomes: Record<string, string> = {
    carrinho: "carrinho", cobranca: "cobrança", pos24h: "agradecer",
    entrega3d: "confirmar entrega", feedback7d: "feedback", reengaja30d: "reengajar",
    aniversario: "aniversário", "aniversario-breve": "aniversário chegando",
    espera: "lista de espera", inativa: "sumida", "vip-frio": "VIP",
    "troca-parada": "troca", "revisao-sale": "revisar SALE", repor: "repor",
    pauta: "pauta", fechamento: "fechamento",
  };
  const partes = Object.entries(porTipo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([kind, n]) => `${n} ${nomes[kind] || kind}`);
  return `${total} na fila: ${partes.join(", ")}.`;
}

/**
 * Uma passada completa. `kind` decide o que entra além da varredura diária.
 * Sempre devolve o resumo, mesmo quando o push não sai — o painel mostra a
 * mesma informação.
 */
export async function rodarRotina(kind: "diaria" | "semanal" | "mensal" = "diaria", agora = new Date()) {
  const etiquetas = await recalcularEtiquetas(agora);

  let deLoja = 0;
  if (kind === "semanal") deLoja += await rotinaSemanal(agora);
  if (kind === "mensal") {
    deLoja += await rotinaSemanal(agora);
    deLoja += await rotinaMensal(agora);
  }

  const varredura = await varrer(agora);
  const fila = await filaDoDia(agora, undefined, { revarrer: false });
  const resumo = resumoDaManha(fila.porTipo, fila.abertas);

  await prisma.crmRun.create({
    data: {
      kind,
      criadas: varredura.criadas + deLoja,
      fechadas: varredura.fechadas,
      notes: resumo,
    },
  });

  // Push para quem administra a loja. Sem token configurado, segue em silêncio.
  const admins = await prisma.user.findMany({
    where: { role: "admin", notificationToken: { isNot: null } },
    select: { id: true },
  });
  for (const a of admins) {
    await sendPushToUser(a.id, fila.abertas ? "Fila de hoje" : "Bom dia!", resumo).catch(() => null);
  }

  return {
    kind,
    resumo,
    etiquetas,
    criadas: varredura.criadas + deLoja,
    fechadas: varredura.fechadas,
    naFila: fila.abertas,
    avisados: admins.length,
  };
}
