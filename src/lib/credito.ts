import { prisma } from "@/lib/prisma";
import { receberNasParcelas } from "@/lib/parcelas";

/**
 * Crédito da cliente: o caderno ao contrário.
 *
 * Três regras sustentam tudo aqui:
 *
 * 1. O SALDO É A SOMA DO EXTRATO. Não existe campo "saldo" em lugar nenhum —
 *    ele é sempre recalculado dos lançamentos. Saldo guardado é saldo que uma
 *    hora diverge do histórico.
 * 2. CRÉDITO NÃO É DESCONTO, É PAGAMENTO. Usar crédito não encolhe o pedido:
 *    a venda registra o valor cheio e o crédito entra como forma de pagamento.
 *    Como desconto, uma venda de R$ 300 paga com R$ 200 de crédito apareceria
 *    como R$ 100 de faturamento.
 * 3. MAS NÃO É DINHEIRO ENTRANDO HOJE. O dinheiro entrou lá atrás, quando ela
 *    pagou a compra que virou crédito. Por isso o pagamento sai marcado como
 *    `credito` e as telas de caixa o ignoram — senão o caixa do dia infla com
 *    dinheiro que ninguém recebeu.
 */

export const FORMA_CREDITO = "credito";

/**
 * Filtro das telas de caixa: crédito usado não é dinheiro que entrou hoje.
 *
 * A venda aconteceu e está no faturamento; o dinheiro dela entrou meses atrás,
 * na compra que virou crédito. Somar de novo aqui contaria o mesmo dinheiro
 * duas vezes.
 */
export const MOVIMENTA_CAIXA = { paymentMethod: { not: FORMA_CREDITO } } as const;

/** Lançamentos que concedem. */
export const MOTIVOS_DE_ENTRADA = [
  { kind: "peca-recebida", rotulo: "Peça recebida da cliente" },
  { kind: "devolucao", rotulo: "Devolução de compra" },
  { kind: "cortesia", rotulo: "Cortesia" },
  { kind: "pagamento-maior", rotulo: "Pagou a mais" },
  { kind: "acerto", rotulo: "Acerto manual" },
] as const;

/** Lançamentos que consomem. O sistema cria estes; você não digita. */
export const MOTIVOS_DE_SAIDA = [
  { kind: "uso", rotulo: "Usado na compra" },
  { kind: "abatimento-caderno", rotulo: "Abatido no caderno" },
  { kind: "devolvido-em-dinheiro", rotulo: "Devolvido em dinheiro" },
] as const;

const ENTRADAS = new Set(MOTIVOS_DE_ENTRADA.map(m => m.kind));
const centavos = (n: number) => Math.round(n * 100) / 100;

export type Lancamento = {
  id: string;
  amount: number;
  kind: string;
  rotulo: string;
  note: string | null;
  orderId: string | null;
  appliedOrderId: string | null;
  authorName: string | null;
  createdAt: Date;
};

const ROTULOS: Record<string, string> = Object.fromEntries(
  [...MOTIVOS_DE_ENTRADA, ...MOTIVOS_DE_SAIDA].map(m => [m.kind, m.rotulo]),
);

export async function saldoDaCliente(userId: string): Promise<number> {
  const r = await prisma.customerCredit.aggregate({ where: { userId }, _sum: { amount: true } });
  return centavos(r._sum.amount || 0);
}

export async function extratoDaCliente(userId: string) {
  const linhas = await prisma.customerCredit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const lancamentos: Lancamento[] = linhas.map(l => ({
    id: l.id,
    amount: l.amount,
    kind: l.kind,
    rotulo: ROTULOS[l.kind] || l.kind,
    note: l.note,
    orderId: l.orderId,
    appliedOrderId: l.appliedOrderId,
    authorName: l.authorName,
    createdAt: l.createdAt,
  }));

  return { lancamentos, saldo: centavos(linhas.reduce((s, l) => s + l.amount, 0)) };
}

/** Saldo de várias clientes de uma vez, para listas e para o passivo da loja. */
export async function saldosDeTodas(): Promise<Map<string, number>> {
  const somas = await prisma.customerCredit.groupBy({
    by: ["userId"],
    _sum: { amount: true },
  });
  return new Map(somas.map(s => [s.userId, centavos(s._sum.amount || 0)]));
}

/** Quanto a loja deve em créditos. Só saldos positivos contam. */
export async function passivoDaLoja() {
  const saldos = [...(await saldosDeTodas()).values()].filter(v => v > 0.005);
  return {
    total: centavos(saldos.reduce((s, v) => s + v, 0)),
    clientes: saldos.length,
  };
}

export type Concessao = {
  userId: string;
  valor: number;
  kind: string;
  note?: string | null;
  orderId?: string | null;
  returnId?: string | null;
  autor?: string | null;
};

export async function concederCredito(c: Concessao) {
  const valor = centavos(c.valor);
  if (!(valor > 0)) return { ok: false as const, erro: "Valor precisa ser maior que zero" };
  if (!ENTRADAS.has(c.kind as never)) return { ok: false as const, erro: "Motivo inválido" };

  const lancamento = await prisma.customerCredit.create({
    data: {
      userId: c.userId,
      amount: valor,
      kind: c.kind,
      note: c.note?.trim() || null,
      orderId: c.orderId || null,
      returnId: c.returnId || null,
      authorName: c.autor || null,
    },
  });
  return { ok: true as const, lancamento, saldo: await saldoDaCliente(c.userId) };
}

/**
 * Gasta crédito, registrando o pagamento no pedido que o recebeu.
 *
 * Nunca deixa o saldo negativo: o valor é conferido contra o saldo no momento
 * do uso, e o que passar é recusado em vez de ser aparado em silêncio — aparar
 * esconderia um erro de digitação seu.
 */
async function gastar(
  userId: string, valor: number, kind: string,
  extras: { appliedOrderId?: string | null; note?: string | null; autor?: string | null } = {},
) {
  const pedido = centavos(valor);
  if (!(pedido > 0)) return { ok: false as const, erro: "Valor precisa ser maior que zero" };

  const saldo = await saldoDaCliente(userId);
  if (pedido > saldo + 0.005) {
    return { ok: false as const, erro: `Ela tem R$ ${saldo.toFixed(2).replace(".", ",")} de crédito, menos que o valor pedido` };
  }

  await prisma.customerCredit.create({
    data: {
      userId,
      amount: -pedido,
      kind,
      note: extras.note?.trim() || null,
      appliedOrderId: extras.appliedOrderId || null,
      authorName: extras.autor || null,
    },
  });

  return { ok: true as const, usado: pedido, saldo: centavos(saldo - pedido) };
}

/**
 * Usa crédito numa compra. O pedido ganha um pagamento marcado como crédito,
 * então ele fica quitado nessa parte sem que o total encolha.
 */
export async function usarNaCompra(
  userId: string, orderId: string, valor: number, autor?: string | null,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, total: true, amountPaid: true, _count: { select: { installments: true } } },
  });
  if (!order) return { ok: false as const, erro: "Pedido não encontrado" };
  if (order.userId !== userId) return { ok: false as const, erro: "Esse pedido não é dessa cliente" };

  const emAberto = centavos(order.total - order.amountPaid);
  const pedido = centavos(valor);
  if (pedido > emAberto + 0.005) {
    return { ok: false as const, erro: `O pedido tem R$ ${emAberto.toFixed(2).replace(".", ",")} em aberto, menos que o valor pedido` };
  }

  const gasto = await gastar(userId, pedido, "uso", {
    appliedOrderId: orderId,
    note: `Pedido #${orderId.slice(-8).toUpperCase()}`,
    autor,
  });
  if (!gasto.ok) return gasto;

  // Pedido parcelado recebe pelas parcelas, como qualquer outro pagamento;
  // sem parcelas, entra direto no pedido.
  if (order._count.installments > 0) {
    await receberNasParcelas(orderId, pedido, FORMA_CREDITO);
  } else {
    const pago = centavos(order.amountPaid + pedido);
    await prisma.order.update({
      where: { id: orderId },
      data: { amountPaid: pago, paymentStatus: pago >= order.total - 0.01 ? "paid" : "partial" },
    });
    await prisma.payment.create({
      data: { orderId, amount: pedido, paymentMethod: FORMA_CREDITO, notes: "Crédito da cliente" },
    });
  }

  return { ...gasto, aplicadoEm: orderId };
}

/**
 * Abate a dívida do caderno com o crédito. Quita do pedido mais antigo para o
 * mais novo, como qualquer pagamento do caderno.
 *
 * Nunca roda sozinho: quem decide abater é você, na tela.
 */
export async function abaterNoCaderno(userId: string, valor: number, autor?: string | null) {
  const pedidos = await prisma.order.findMany({
    where: {
      userId, paymentMethod: "caderno",
      paymentStatus: { not: "paid" }, status: { not: "cancelled" },
    },
    select: { id: true, total: true, amountPaid: true, _count: { select: { installments: true } } },
    orderBy: { createdAt: "asc" },
  });

  const divida = centavos(pedidos.reduce((s, p) => s + (p.total - p.amountPaid), 0));
  if (divida < 0.01) return { ok: false as const, erro: "Ela não tem nada em aberto no caderno" };

  const pedido = centavos(Math.min(valor, divida));

  // Quais pedidos o valor alcança, para a nota dizer o que foi quitado.
  let sobra = pedido;
  const alvos: string[] = [];
  for (const p of pedidos) {
    if (sobra < 0.01) break;
    const emAberto = centavos(p.total - p.amountPaid);
    if (emAberto < 0.01) continue;
    alvos.push(`#${p.id.slice(-8).toUpperCase()}`);
    sobra = centavos(sobra - Math.min(sobra, emAberto));
  }

  const gasto = await gastar(userId, pedido, "abatimento-caderno", {
    autor,
    note: alvos.length ? `Pedido(s) ${alvos.join(", ")}` : null,
  });
  if (!gasto.ok) return gasto;

  let restante = pedido;
  const quitados: string[] = [];

  for (const p of pedidos) {
    if (restante < 0.01) break;
    const emAberto = centavos(p.total - p.amountPaid);
    if (emAberto < 0.01) continue;
    const pagar = Math.min(restante, emAberto);

    if (p._count.installments > 0) {
      await receberNasParcelas(p.id, pagar, FORMA_CREDITO);
    } else {
      const pago = centavos(p.amountPaid + pagar);
      await prisma.order.update({
        where: { id: p.id },
        data: { amountPaid: pago, paymentStatus: pago >= p.total - 0.01 ? "paid" : "partial" },
      });
      await prisma.payment.create({
        data: { orderId: p.id, amount: pagar, paymentMethod: FORMA_CREDITO, notes: "Crédito da cliente" },
      });
    }

    quitados.push(p.id);
    restante = centavos(restante - pagar);
  }

  return { ...gasto, abatido: pedido, pedidos: quitados.length, dividaRestante: centavos(divida - pedido) };
}

/**
 * Devolve crédito em dinheiro. Existe para o caso raro — cobrança duplicada,
 * uma reclamação que você escolha resolver assim — e não para o dia a dia: a
 * política da loja é crédito, não dinheiro de volta.
 */
export async function devolverEmDinheiro(userId: string, valor: number, note: string, autor?: string | null) {
  return gastar(userId, valor, "devolvido-em-dinheiro", { note, autor });
}
