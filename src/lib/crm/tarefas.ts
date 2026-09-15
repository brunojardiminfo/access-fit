import { prisma } from "@/lib/prisma";
import { perfisDeTodas, DIA } from "./perfil";
import { parseJson } from "@/lib/utils";
import { quantidadeDe, parseEstoque } from "@/lib/variacoes";

/**
 * O motor da fila: olha o banco inteiro e devolve o que precisa ser feito hoje.
 *
 * Duas ideias sustentam tudo aqui:
 *
 * 1. A CHAVE descreve o FATO, nao o momento da varredura. "cobranca:<pedido>:3d"
 *    e o mesmo fato sempre, entao rodar a rotina dez vezes no mesmo dia nao cria
 *    dez tarefas.
 * 2. TAREFA SEM MOTIVO MORRE SOZINHA. Cada passada monta o conjunto de chaves que
 *    ainda fazem sentido; toda tarefa aberta que ficou de fora e encerrada. A
 *    cliente pagou, o carrinho virou pedido, a peca esgotou de novo — a tarefa
 *    some sem ninguem precisar lembrar de fecha-la.
 */

export const TETO_DIARIO = 15;
const MINUTOS_PARA_ABANDONO = 45;
const HORAS_LIMITE_CARRINHO = 72;
const DIAS_TROCA_PARADA = 5;
const DIAS_VIP_FRIO = 60;
const ATRASO_INATIVA = 1.5;
const DIAS_SEM_CICLO = 120;

/** Peso base de cada tipo. Empate se resolve por dinheiro em jogo. */
const PESO: Record<string, number> = {
  cobranca: 100,
  carrinho: 90,
  espera: 80,
  "troca-parada": 75,
  aniversario: 70,
  entrega3d: 60,
  pos24h: 55,
  feedback7d: 40,
  "vip-frio": 35,
  inativa: 30,
  reengaja30d: 25,
  "aniversario-breve": 20,
};

/**
 * Tipos que a varredura diaria sabe regenerar — e portanto os unicos que ela
 * pode encerrar por falta de motivo. Tarefas de outra origem (a revisao semanal
 * de estoque, o fechamento do mes) ficam de fora e sobrevivem a varredura.
 */
export const KINDS_AUTOMATICOS = new Set(Object.keys(PESO));

export type TarefaGerada = {
  key: string;
  userId: string | null;
  kind: string;
  title: string;
  detail: string;
  priority: number;
  valueAtStake: number;
  meta: Record<string, unknown>;
};

const real = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const diasEntre = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / DIA);

function tarefa(t: Omit<TarefaGerada, "priority"> & { priority?: number }): TarefaGerada {
  return { ...t, priority: t.priority ?? PESO[t.kind] ?? 10 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Geradores
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Carrinho parado com contato.
 *
 * So entra na fila quem deixou telefone e ainda tem a peca disponivel — chamar
 * alguem para oferecer o que esgotou e pior do que nao chamar.
 */
async function carrinhosAbandonados(agora: Date): Promise<TarefaGerada[]> {
  const inicio = new Date(agora.getTime() - HORAS_LIMITE_CARRINHO * 60 * 60 * 1000);
  const fim = new Date(agora.getTime() - MINUTOS_PARA_ABANDONO * 60 * 1000);

  const sacolas = await prisma.cartLead.findMany({
    where: { status: "aberto", phone: { not: null }, updatedAt: { gte: inicio, lte: fim } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  if (!sacolas.length) return [];

  type Item = { nome?: string; slug?: string; cor?: string; tamanho?: string; quantidade?: number };
  const slugs = new Set<string>();
  for (const s of sacolas) {
    for (const i of parseJson<Item[]>(s.items, [])) if (i.slug) slugs.add(i.slug);
  }

  const produtos = await prisma.product.findMany({
    where: { slug: { in: [...slugs] } },
    select: { slug: true, name: true, stock: true, sizeStock: true, active: true },
  });
  const porSlug = new Map(produtos.map(p => [p.slug, p]));

  // Casa a sacola com uma cliente cadastrada pelo telefone, para a tarefa cair
  // na ficha dela em vez de virar um contato solto.
  const telefones = sacolas.map(s => (s.phone || "").replace(/\D/g, "")).filter(Boolean);
  const clientes = telefones.length
    ? await prisma.user.findMany({
        where: { phone: { not: null } },
        select: { id: true, phone: true },
      })
    : [];
  const porTelefone = new Map(
    clientes.map(c => [(c.phone || "").replace(/\D/g, "").slice(-8), c.id]),
  );

  const saida: TarefaGerada[] = [];
  for (const s of sacolas) {
    const itens = parseJson<Item[]>(s.items, []);
    const disponiveis = itens.filter(i => {
      const p = i.slug ? porSlug.get(i.slug) : null;
      if (!p || !p.active) return false;
      if (i.cor || i.tamanho) {
        const qtd = quantidadeDe(parseEstoque(p.sizeStock), i.cor || "", i.tamanho || "");
        return qtd > 0 || p.stock > 0;
      }
      return p.stock > 0;
    });
    if (!disponiveis.length) continue;

    const nomes = disponiveis
      .map(i => [i.nome, i.cor, i.tamanho].filter(Boolean).join(" "))
      .slice(0, 3)
      .join(", ");
    const horas = Math.max(1, Math.round((agora.getTime() - s.updatedAt.getTime()) / 3_600_000));
    const digitos = (s.phone || "").replace(/\D/g, "").slice(-8);

    saida.push(tarefa({
      key: `carrinho:${s.id}`,
      userId: porTelefone.get(digitos) || null,
      kind: "carrinho",
      title: `Carrinho parado — ${s.name || "sem nome"}`,
      detail: `Deixou ${nomes} há ${horas}h, ${real(s.total)}. Tudo em estoque.`,
      valueAtStake: s.total,
      meta: { cartLeadId: s.id, nome: s.name, telefone: s.phone, peca: nomes, horas },
    }));
  }
  return saida;
}

/**
 * Cobranca escalonada: 1 dia, 3 dias, 7 dias. Depois disso o sistema para de
 * insistir — cobrar toda semana para sempre queima a cliente.
 */
async function cobrancas(agora: Date): Promise<TarefaGerada[]> {
  const pedidos = await prisma.order.findMany({
    where: {
      status: { not: "cancelled" },
      paymentStatus: { not: "paid" },
      createdAt: { lte: new Date(agora.getTime() - DIA) },
    },
    include: { user: { select: { id: true, name: true, phone: true } } },
    take: 200,
  });

  return pedidos.flatMap(o => {
    const dias = diasEntre(o.createdAt, agora);
    const etapa = dias >= 7 ? "7d" : dias >= 3 ? "3d" : "1d";
    const aberto = Math.max(0, o.total - o.amountPaid);
    if (aberto < 0.01) return [];
    const numero = `#${o.id.slice(-8).toUpperCase()}`;

    return [tarefa({
      key: `cobranca:${o.id}:${etapa}`,
      userId: o.userId,
      kind: "cobranca",
      title: `Cobrar ${o.user?.name || "cliente"} — ${numero}`,
      detail: `${real(aberto)} em aberto há ${dias} dias${etapa === "7d" ? " (último toque)" : ""}.`,
      priority: PESO.cobranca + (etapa === "7d" ? 10 : etapa === "3d" ? 5 : 0),
      valueAtStake: aberto,
      meta: { orderId: o.id, pedido: numero, etapa, nome: o.user?.name, telefone: o.user?.phone, valor: real(aberto) },
    })];
  });
}

/** Agradecer 24h depois do pagamento confirmado. */
async function agradecimentos(agora: Date): Promise<TarefaGerada[]> {
  const pedidos = await prisma.order.findMany({
    where: {
      paymentStatus: "paid",
      status: { not: "cancelled" },
      createdAt: { lte: new Date(agora.getTime() - DIA) },
      thanks24hSentAt: null,
    },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      items: { select: { quantity: true, size: true, color: true, componentName: true, product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return pedidos.map(o => {
    const pecas = o.items
      .map(i => [i.componentName || i.product?.name, i.color, i.size].filter(Boolean).join(" "))
      .slice(0, 3).join(", ");
    return tarefa({
      key: `pos24h:${o.id}`,
      userId: o.userId,
      kind: "pos24h",
      title: `Agradecer ${o.user?.name || "cliente"}`,
      detail: `Comprou ${pecas} há ${diasEntre(o.createdAt, agora)} dia(s), ${real(o.total)}.`,
      valueAtStake: o.total,
      meta: { orderId: o.id, marca: "thanks24hSentAt", peca: pecas, nome: o.user?.name, telefone: o.user?.phone },
    });
  });
}

/**
 * Pos-venda depois da entrega: 3 dias, 7 dias, 30 dias.
 *
 * Gera so a proxima etapa pendente de cada pedido, e nao as tres de uma vez: a
 * fila precisa dizer "a proxima coisa", nao despejar o historico inteiro.
 */
async function posEntrega(agora: Date): Promise<TarefaGerada[]> {
  const pedidos = await prisma.order.findMany({
    where: { status: "delivered", deliveredAt: { not: null } },
    include: {
      user: { select: { id: true, name: true, phone: true } },
      items: { select: { size: true, color: true, componentName: true, product: { select: { name: true } } } },
    },
    orderBy: { deliveredAt: "asc" },
    take: 300,
  });

  const etapas = [
    { dias: 3, kind: "entrega3d", marca: "followUpSentAt", titulo: "Confirmar que chegou" },
    { dias: 7, kind: "feedback7d", marca: "feedback7dSentAt", titulo: "Pedir foto ou opinião" },
    { dias: 30, kind: "reengaja30d", marca: "reengage30dSentAt", titulo: "Voltar a conversar" },
  ] as const;

  const saida: TarefaGerada[] = [];
  for (const o of pedidos) {
    if (!o.deliveredAt) continue;
    const dias = diasEntre(o.deliveredAt, agora);
    const pendente = etapas.find(e => dias >= e.dias && !o[e.marca]);
    if (!pendente) continue;

    const pecas = o.items
      .map(i => [i.componentName || i.product?.name, i.color, i.size].filter(Boolean).join(" "))
      .slice(0, 2).join(", ");

    saida.push(tarefa({
      key: `${pendente.kind}:${o.id}`,
      userId: o.userId,
      kind: pendente.kind,
      title: `${pendente.titulo} — ${o.user?.name || "cliente"}`,
      detail: `Entregue há ${dias} dias: ${pecas}.`,
      valueAtStake: o.total,
      meta: { orderId: o.id, marca: pendente.marca, peca: pecas, nome: o.user?.name, telefone: o.user?.phone },
    }));
  }
  return saida;
}

/**
 * Aniversario: aviso 7 dias antes e no dia, com o cupom ja criado.
 *
 * Usa o mesmo codigo do cupom que a propria cliente geraria pelo site, para as
 * duas portas nao criarem cupons diferentes para o mesmo aniversario.
 */
async function aniversarios(agora: Date): Promise<TarefaGerada[]> {
  const clientes = await prisma.user.findMany({
    where: { role: "customer", birthDate: { not: null } },
    select: { id: true, name: true, phone: true, birthDate: true, birthdayCouponYear: true },
  });

  const ano = agora.getFullYear();
  const chave = (d: Date) => `${d.getMonth() + 1}-${d.getDate()}`;
  const hoje = chave(agora);
  const emSete = chave(new Date(agora.getTime() + 7 * DIA));

  const saida: TarefaGerada[] = [];
  for (const c of clientes) {
    if (!c.birthDate) continue;
    const dia = chave(c.birthDate);
    const ehHoje = dia === hoje;
    const ehBreve = dia === emSete;
    if (!ehHoje && !ehBreve) continue;

    const codigo = `BDAY${c.id.substring(0, 8).toUpperCase()}${ano}`;
    if (c.birthdayCouponYear !== ano) {
      const fimDoMes = new Date(ano, c.birthDate.getMonth() + 1, 0, 23, 59, 59);
      await prisma.coupon.upsert({
        where: { code: codigo },
        update: {},
        create: { code: codigo, discount: 15, type: "percent", maxUses: 1, expiresAt: fimDoMes, active: true },
      });
      await prisma.user.update({ where: { id: c.id }, data: { birthdayCouponYear: ano } });
    }

    saida.push(tarefa({
      key: `${ehHoje ? "aniversario" : "aniversario-breve"}:${c.id}:${ano}`,
      userId: c.id,
      kind: ehHoje ? "aniversario" : "aniversario-breve",
      title: `${ehHoje ? "Aniversário hoje" : "Aniversário em 7 dias"} — ${c.name || "cliente"}`,
      detail: `Cupom ${codigo}, 15% de desconto, válido até o fim do mês.`,
      valueAtStake: 0,
      meta: { cupom: codigo, nome: c.name, telefone: c.phone },
    }));
  }
  return saida;
}

/** Chegou a peca que ela pediu para avisar. */
async function listaDeEspera(): Promise<TarefaGerada[]> {
  const espera = await prisma.waitlist.findMany({
    where: { notified: false },
    include: { product: { select: { name: true, stock: true, active: true } } },
    take: 200,
  });

  const comEstoque = espera.filter(e => e.product?.active && e.product.stock > 0);
  if (!comEstoque.length) return [];

  const clientes = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true },
  });
  const porTelefone = new Map(
    clientes.map(c => [(c.phone || "").replace(/\D/g, "").slice(-8), c.id]),
  );

  return comEstoque.map(e => tarefa({
    key: `espera:${e.id}`,
    userId: porTelefone.get((e.phone || "").replace(/\D/g, "").slice(-8)) || null,
    kind: "espera",
    title: `Chegou o que ${e.name} esperava`,
    detail: `${e.product.name} voltou ao estoque (${e.product.stock} un.). Ela pediu aviso em ${e.createdAt.toLocaleDateString("pt-BR")}.`,
    valueAtStake: 0,
    meta: { waitlistId: e.id, peca: e.product.name, nome: e.name, telefone: e.phone },
  }));
}

/** Troca ou devolucao aberta ha dias sem desfecho. */
async function trocasParadas(agora: Date): Promise<TarefaGerada[]> {
  const devolucoes = await prisma.return.findMany({
    where: {
      status: { in: ["solicitado", "aprovado"] },
      requestedAt: { lte: new Date(agora.getTime() - DIAS_TROCA_PARADA * DIA) },
    },
    include: { order: { select: { id: true, userId: true, user: { select: { name: true, phone: true } } } } },
    take: 100,
  });

  return devolucoes.map(d => tarefa({
    key: `troca-parada:${d.id}`,
    userId: d.order?.userId || null,
    kind: "troca-parada",
    title: `Troca parada — ${d.order?.user?.name || "cliente"}`,
    detail: `Aberta há ${diasEntre(d.requestedAt, agora)} dias, status "${d.status}", ${real(d.amount)}.`,
    valueAtStake: d.amount,
    meta: { returnId: d.id, nome: d.order?.user?.name, telefone: d.order?.user?.phone },
  }));
}

/**
 * Quem sumiu e quem esfriou, a partir do ritmo de cada uma.
 *
 * A chave leva o ano-mes: a mesma cliente nao volta para a fila todo dia, mas
 * volta no mes seguinte se continuar sumida.
 */
async function sumidas(agora: Date): Promise<TarefaGerada[]> {
  const [perfis, clientes, ultimasNotas, vips] = await Promise.all([
    perfisDeTodas(agora),
    prisma.user.findMany({
      where: { role: "customer" },
      select: { id: true, name: true, phone: true },
    }),
    prisma.customerNote.groupBy({ by: ["userId"], _max: { createdAt: true } }),
    prisma.customerTagLink.findMany({
      where: { tag: { slug: "vip" } },
      select: { userId: true },
    }),
  ]);

  const dados = new Map(clientes.map(c => [c.id, c]));
  const ultimoContato = new Map(ultimasNotas.map(n => [n.userId, n._max.createdAt]));
  const ehVip = new Set(vips.map(v => v.userId));
  const periodo = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;

  const saida: TarefaGerada[] = [];
  for (const [userId, p] of perfis) {
    const cliente = dados.get(userId);
    if (!cliente || !p.quantidade) continue;

    const contato = ultimoContato.get(userId);
    const diasDeContato = contato ? diasEntre(contato, agora) : null;

    const sumiu = p.atraso !== null
      ? p.atraso >= ATRASO_INATIVA
      : (p.diasSemComprar ?? 0) >= DIAS_SEM_CICLO;

    if (sumiu && (diasDeContato === null || diasDeContato >= 30)) {
      saida.push(tarefa({
        key: `inativa:${userId}:${periodo}`,
        userId,
        kind: "inativa",
        title: `Sumiu — ${cliente.name || "cliente"}`,
        detail: p.cicloMedio
          ? `Comprava a cada ${p.cicloMedio} dias e está há ${p.diasSemComprar} sem comprar.`
          : `Comprou uma vez, há ${p.diasSemComprar} dias.`,
        valueAtStake: p.ticketMedio,
        meta: { nome: cliente.name, telefone: cliente.phone, dias: p.diasSemComprar },
      }));
      continue;
    }

    if (
      ehVip.has(userId) &&
      (p.diasSemComprar ?? 0) >= DIAS_VIP_FRIO &&
      (diasDeContato === null || diasDeContato >= DIAS_VIP_FRIO)
    ) {
      saida.push(tarefa({
        key: `vip-frio:${userId}:${periodo}`,
        userId,
        kind: "vip-frio",
        title: `VIP esfriando — ${cliente.name || "cliente"}`,
        detail: `${real(p.totalGasto)} em ${p.quantidade} pedidos, e ${p.diasSemComprar} dias sem comprar.`,
        valueAtStake: p.ticketMedio,
        meta: { nome: cliente.name, telefone: cliente.phone, dias: p.diasSemComprar },
      }));
    }
  }
  return saida;
}

// ─────────────────────────────────────────────────────────────────────────────
// Varredura
// ─────────────────────────────────────────────────────────────────────────────

export async function gerarTarefas(agora = new Date()): Promise<TarefaGerada[]> {
  const grupos = await Promise.all([
    carrinhosAbandonados(agora),
    cobrancas(agora),
    agradecimentos(agora),
    posEntrega(agora),
    aniversarios(agora),
    listaDeEspera(),
    trocasParadas(agora),
    sumidas(agora),
  ]);
  return grupos.flat();
}

/**
 * Roda a varredura e deixa a tabela de tarefas igual a realidade: cria o que
 * nasceu, atualiza o texto do que mudou e encerra o que perdeu o motivo.
 */
export async function varrer(agora = new Date()) {
  const geradas = await gerarTarefas(agora);
  const chaves = new Set(geradas.map(t => t.key));

  const existentes = await prisma.crmTask.findMany({
    where: { status: { in: ["aberta", "adiada"] } },
    select: { id: true, key: true, kind: true },
  });
  const jaAbertas = new Set(existentes.map(t => t.key));

  let criadas = 0;
  for (const t of geradas) {
    const dados = {
      userId: t.userId,
      kind: t.kind,
      title: t.title,
      detail: t.detail,
      priority: t.priority,
      valueAtStake: t.valueAtStake,
      meta: JSON.stringify(t.meta),
    };
    // upsert e nao create: a tarefa aberta tem o texto atualizado (o carrinho
    // cresceu, a divida envelheceu) sem virar uma segunda tarefa.
    await prisma.crmTask.upsert({
      where: { key: t.key },
      update: dados,
      create: { key: t.key, ...dados, dueAt: agora },
    });
    if (!jaAbertas.has(t.key)) criadas++;
  }

  // Tarefa sem motivo morre sozinha — e e isso que tambem faz a cobranca
  // escalonar: quando a etapa de 3 dias nasce, a de 1 dia deixa de ser gerada
  // e cai aqui, sem precisar de regra propria.
  const orfas = existentes.filter(t => KINDS_AUTOMATICOS.has(t.kind) && !chaves.has(t.key));

  let fechadas = 0;
  if (orfas.length) {
    const r = await prisma.crmTask.updateMany({
      where: { id: { in: orfas.map(o => o.id) } },
      data: { status: "descartada", doneAt: agora },
    });
    fechadas = r.count;
  }

  return { criadas, fechadas, total: geradas.length };
}
