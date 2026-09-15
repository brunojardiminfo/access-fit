import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/utils";
import { TETO_DIARIO } from "./tarefas";
import { aplicarVariaveis, escolherModelo, linkWhats, modelosPorTipo } from "./mensagens";
import { DIA } from "./perfil";

/**
 * Monta a fila do dia a partir das tarefas abertas.
 *
 * Duas regras impedem a fila de virar lixo:
 *
 * UM CONTATO POR CLIENTE. Se a mesma cliente cai em tres filas no mesmo dia,
 * aparece uma linha so — a mais forte — com as outras listadas embaixo. Ninguem
 * recebe tres mensagens suas na mesma manha.
 *
 * TETO DIARIO. No maximo TETO_DIARIO linhas, ordenadas por peso e por dinheiro
 * em jogo. O resto espera o dia seguinte. Lista de oitenta itens e lista que
 * ninguem abre.
 */

export type LinhaDaFila = {
  id: string;
  key: string;
  kind: string;
  userId: string | null;
  title: string;
  detail: string;
  priority: number;
  valueAtStake: number;
  nome: string | null;
  telefone: string | null;
  mensagem: string;
  whatsapp: string | null;
  /** Tarefas de loja não têm WhatsApp: levam para a tela onde se resolvem. */
  link: string | null;
  atrasadaHa: number;
  tambem: { id: string; kind: string; title: string; detail: string }[];
};

export type FilaDoDia = {
  linhas: LinhaDaFila[];
  porTipo: Record<string, number>;
  abertas: number;
  mostradas: number;
  esperando: number;
  feitasHoje: number;
  ultimaVarredura: Date | null;
};

type Meta = {
  nome?: string | null;
  telefone?: string | null;
  peca?: string | null;
  valor?: string | null;
  pedido?: string | null;
  cupom?: string | null;
  dias?: number | null;
  link?: string | null;
};

export async function filaDoDia(agora = new Date(), filtro?: string): Promise<FilaDoDia> {
  const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

  const [tarefas, modelos, feitasHoje, ultimaRun] = await Promise.all([
    prisma.crmTask.findMany({
      where: {
        status: { in: ["aberta", "adiada"] },
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: agora } }],
      },
      include: { user: { select: { name: true, phone: true } } },
      orderBy: [{ priority: "desc" }, { valueAtStake: "desc" }],
    }),
    modelosPorTipo(),
    prisma.crmTask.count({ where: { status: "feita", doneAt: { gte: inicioDoDia } } }),
    prisma.crmRun.findFirst({ orderBy: { ranAt: "desc" }, select: { ranAt: true } }),
  ]);

  const porTipo: Record<string, number> = {};
  for (const t of tarefas) porTipo[t.kind] = (porTipo[t.kind] || 0) + 1;

  const candidatas = filtro ? tarefas.filter(t => t.kind === filtro) : tarefas;

  // Agrupa por cliente. Tarefa sem cliente cadastrado agrupa pelo telefone, para
  // que a mesma pessoa sem cadastro tambem nao receba duas mensagens.
  const grupos = new Map<string, typeof candidatas>();
  for (const t of candidatas) {
    const meta = parseJson<Meta>(t.meta, {});
    const digitos = (t.user?.phone || meta.telefone || "").replace(/\D/g, "").slice(-8);
    const chave = t.userId || (digitos ? `tel:${digitos}` : `tarefa:${t.id}`);
    const lista = grupos.get(chave) || [];
    lista.push(t);
    grupos.set(chave, lista);
  }

  const ordenados = [...grupos.values()].sort((a, b) =>
    b[0].priority - a[0].priority || b[0].valueAtStake - a[0].valueAtStake,
  );

  const linhas: LinhaDaFila[] = ordenados.slice(0, TETO_DIARIO).map(grupo => {
    const t = grupo[0];
    const meta = parseJson<Meta>(t.meta, {});
    const nome = t.user?.name || meta.nome || null;
    const telefone = t.user?.phone || meta.telefone || null;

    const modelo = escolherModelo(modelos[t.kind] || [], t.key);
    const mensagem = aplicarVariaveis(modelo, {
      nome, peca: meta.peca, valor: meta.valor, pedido: meta.pedido,
      cupom: meta.cupom, dias: meta.dias,
    });

    return {
      id: t.id,
      key: t.key,
      kind: t.kind,
      userId: t.userId,
      title: t.title,
      detail: t.detail,
      priority: t.priority,
      valueAtStake: t.valueAtStake,
      nome,
      telefone,
      mensagem,
      whatsapp: linkWhats(telefone, mensagem),
      link: meta.link || null,
      atrasadaHa: Math.max(0, Math.floor((agora.getTime() - t.dueAt.getTime()) / DIA)),
      tambem: grupo.slice(1).map(o => ({ id: o.id, kind: o.kind, title: o.title, detail: o.detail })),
    };
  });

  return {
    linhas,
    porTipo,
    abertas: tarefas.length,
    mostradas: linhas.length,
    esperando: Math.max(0, ordenados.length - linhas.length),
    feitasHoje,
    ultimaVarredura: ultimaRun?.ranAt || null,
  };
}

/**
 * Fecha uma tarefa e deixa o rastro na ficha da cliente.
 *
 * Quando o tipo da tarefa corresponde a uma marca de follow-up no pedido
 * (agradecimento, confirmacao de entrega), marcar como feita tambem carimba o
 * pedido — e por isso que a mesma tarefa nao volta amanha.
 */
export async function concluirTarefa(
  taskId: string,
  opcoes: { resultado?: string; anotacao?: string; autor?: string | null } = {},
) {
  const tarefa = await prisma.crmTask.findUnique({ where: { id: taskId } });
  if (!tarefa) return null;

  const meta = parseJson<Meta & { orderId?: string; marca?: string; waitlistId?: string; cartLeadId?: string }>(
    tarefa.meta, {},
  );
  const agora = new Date();

  const carimbos: Promise<unknown>[] = [];
  if (meta.orderId && meta.marca) {
    carimbos.push(
      prisma.order.update({
        where: { id: meta.orderId },
        data: { [meta.marca]: agora } as Record<string, Date>,
      }).catch(() => null),
    );
  }
  if (meta.waitlistId) {
    carimbos.push(
      prisma.waitlist.update({ where: { id: meta.waitlistId }, data: { notified: true } }).catch(() => null),
    );
  }
  if (meta.cartLeadId) {
    carimbos.push(
      prisma.cartLead.update({
        where: { id: meta.cartLeadId },
        data: { status: "contatado", contactedAt: agora },
      }).catch(() => null),
    );
  }

  if (tarefa.userId) {
    carimbos.push(
      prisma.customerNote.create({
        data: {
          userId: tarefa.userId,
          kind: "whatsapp",
          body: opcoes.anotacao?.trim() || tarefa.title,
          outcome: opcoes.resultado || null,
          authorName: opcoes.autor || null,
          taskKey: tarefa.key,
        },
      }),
    );
  }

  await Promise.all(carimbos);

  return prisma.crmTask.update({
    where: { id: taskId },
    data: { status: "feita", doneAt: agora },
  });
}

/** Empurra a tarefa para daqui a N dias sem perder o motivo dela. */
export async function adiarTarefa(taskId: string, dias: number) {
  return prisma.crmTask.update({
    where: { id: taskId },
    data: { status: "adiada", snoozedUntil: new Date(Date.now() + Math.max(1, dias) * DIA) },
  });
}
