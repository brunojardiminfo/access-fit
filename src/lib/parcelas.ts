import { prisma } from "@/lib/prisma";

/**
 * Parcelas de um pedido, e a conta que mantém as telas concordando.
 *
 * A regra que sustenta tudo aqui: QUANDO O PEDIDO TEM PARCELAS, ELAS SÃO A
 * VERDADE. O `amountPaid` e o `paymentStatus` do pedido são sempre recalculados
 * a partir delas, nunca escritos por fora.
 *
 * Isso existe porque as duas telas gravavam de jeitos diferentes: o Caderno
 * escrevia `amountPaid` direto e a aba Pedidos recalculava a partir das
 * parcelas. Quem mexesse por último apagava o trabalho do outro, sem aviso.
 */

const centavos = (n: number) => Math.round(n * 100) / 100;

/**
 * Refaz `amountPaid`, `paymentStatus` e `installmentCount` do pedido a partir
 * das parcelas. Pedido sem parcela não é tocado — lá o `amountPaid` continua
 * sendo escrito à mão, e é o certo.
 */
export async function recalcularPeloParcelamento(orderId: string) {
  const parcelas = await prisma.installment.findMany({ where: { orderId } });
  if (!parcelas.length) return null;

  const pagas = parcelas.filter(p => p.status === "paid");
  const amountPaid = centavos(pagas.reduce((s, p) => s + p.amount, 0));

  return prisma.order.update({
    where: { id: orderId },
    data: {
      amountPaid,
      paymentStatus: pagas.length === parcelas.length ? "paid" : pagas.length ? "partial" : "pending",
      installmentCount: parcelas.length,
    },
  });
}

export type ResultadoRedivisao =
  | { ok: false; erro: string }
  | { ok: true; saldo: number; vezes: number; mantidas: number };

export type Redivisao = {
  orderId: string;
  vezes: number;
  primeiroVencimento: Date;
  /** Dia do mês das parcelas seguintes. Por padrão, o mesmo do primeiro. */
  intervaloEmMeses?: number;
};

/**
 * Redivide o que está em aberto, mantendo as parcelas já pagas.
 *
 * O saldo vem de `total - soma das pagas`, e não da soma das parcelas em
 * aberto: assim, se as parcelas antigas não fechavam com o total do pedido (um
 * desconto lançado depois, um item acrescentado), a redivisão corrige a conta
 * em vez de arrastar o erro adiante.
 */
export async function redividirSaldo(
  { orderId, vezes, primeiroVencimento, intervaloEmMeses = 1 }: Redivisao,
): Promise<ResultadoRedivisao> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { installments: { orderBy: { number: "asc" } } },
  });
  if (!order) return { ok: false, erro: "Pedido não encontrado" };
  if (vezes < 1 || vezes > 24) return { ok: false, erro: "Número de parcelas inválido" };

  const pagas = order.installments.filter(p => p.status === "paid");
  const jaPago = centavos(pagas.reduce((s, p) => s + p.amount, 0));
  const saldo = centavos(order.total - jaPago);

  if (saldo < 0.01) return { ok: false, erro: "Não há saldo em aberto para dividir" };

  const valorBase = centavos(saldo / vezes);
  const ultima = centavos(saldo - valorBase * (vezes - 1));

  await prisma.$transaction(async tx => {
    // Só as em aberto saem. As pagas ficam onde estão, com o número que têm.
    await tx.installment.deleteMany({ where: { orderId, status: { not: "paid" } } });

    for (let i = 0; i < vezes; i++) {
      const vence = new Date(primeiroVencimento);
      vence.setMonth(vence.getMonth() + i * intervaloEmMeses);
      await tx.installment.create({
        data: {
          orderId,
          number: pagas.length + i + 1,
          amount: i === vezes - 1 ? ultima : valorBase,
          dueDate: vence,
          status: "pending",
        },
      });
    }
  });

  await recalcularPeloParcelamento(orderId);
  return { ok: true, saldo, vezes, mantidas: pagas.length };
}

/**
 * Aplica um valor recebido às parcelas em aberto, da mais antiga para a mais
 * nova.
 *
 * Quando o valor não fecha uma parcela inteira, a parcela é partida em duas: a
 * parte recebida vira uma parcela paga e o resto continua em aberto com o mesmo
 * vencimento. É o que mantém "soma das parcelas = total do pedido" verdadeiro
 * depois de um pagamento quebrado.
 */
export async function receberNasParcelas(orderId: string, valor: number, metodo = "pix") {
  if (valor <= 0) return { erro: "Valor inválido" as const };

  const parcelas = await prisma.installment.findMany({
    where: { orderId, status: { not: "paid" } },
    orderBy: [{ dueDate: "asc" }, { number: "asc" }],
  });
  if (!parcelas.length) return { erro: "Este pedido não tem parcelas em aberto" as const };

  let restante = centavos(valor);
  const quitadas: string[] = [];

  for (const p of parcelas) {
    if (restante < 0.01) break;

    if (restante >= p.amount - 0.005) {
      await prisma.installment.update({
        where: { id: p.id },
        data: { status: "paid", paidAt: new Date() },
      });
      await prisma.payment.create({
        data: { orderId, installmentId: p.id, amount: p.amount, paymentMethod: metodo },
      });
      quitadas.push(p.id);
      restante = centavos(restante - p.amount);
      continue;
    }

    // Pagamento quebrado: parte o que sobrou em paga + em aberto.
    const sobra = centavos(p.amount - restante);
    await prisma.installment.update({
      where: { id: p.id },
      data: { amount: restante, status: "paid", paidAt: new Date() },
    });
    await prisma.payment.create({
      data: { orderId, installmentId: p.id, amount: restante, paymentMethod: metodo },
    });
    await prisma.installment.create({
      data: { orderId, number: p.number, amount: sobra, dueDate: p.dueDate, status: "pending" },
    });
    quitadas.push(p.id);
    restante = 0;
  }

  await renumerar(orderId);
  await recalcularPeloParcelamento(orderId);
  return { ok: true as const, quitadas: quitadas.length, troco: restante };
}

/**
 * Deixa a numeração seguindo a ordem de vencimento, depois de partir parcelas.
 * No mesmo vencimento a parte já paga vem antes ("paid" < "pending"), que é
 * como a pessoa leu a conta: paguei isso, falta aquilo.
 */
async function renumerar(orderId: string) {
  const parcelas = await prisma.installment.findMany({
    where: { orderId },
    orderBy: [{ dueDate: "asc" }, { status: "asc" }, { createdAt: "asc" }],
  });
  for (let i = 0; i < parcelas.length; i++) {
    if (parcelas[i].number !== i + 1) {
      await prisma.installment.update({ where: { id: parcelas[i].id }, data: { number: i + 1 } });
    }
  }
}

/**
 * Desfaz o recebimento de uma parcela deixando rastro.
 *
 * Apagar o pagamento seria mais simples, mas apagaria a história: um cheque
 * devolvido ou um Pix estornado aconteceram de verdade, e sumir com eles faz o
 * caixa do dia mentir. Então em vez de apagar, lança o contrário — um pagamento
 * negativo, com o motivo escrito.
 *
 * O valor estornado é o LÍQUIDO já lançado para aquela parcela, não o valor
 * atual dela: se a parcela foi recebida em pedaços, ou se alguém já estornou
 * antes, o que volta é exatamente o que entrou.
 */
export async function estornarParcela(installmentId: string, motivo?: string) {
  const parcela = await prisma.installment.findUnique({
    where: { id: installmentId },
    select: { id: true, number: true, orderId: true },
  });
  if (!parcela) return null;

  const [lancado, order] = await Promise.all([
    prisma.payment.aggregate({ where: { installmentId }, _sum: { amount: true } }),
    prisma.order.findUnique({ where: { id: parcela.orderId }, select: { paymentMethod: true } }),
  ]);

  const liquido = centavos(lancado._sum.amount || 0);
  if (liquido < 0.01) return null;

  return prisma.payment.create({
    data: {
      orderId: parcela.orderId,
      installmentId,
      amount: -liquido,
      paymentMethod: order?.paymentMethod || "pix",
      notes: motivo?.trim() || `Estorno da ${parcela.number}ª parcela`,
    },
  });
}
