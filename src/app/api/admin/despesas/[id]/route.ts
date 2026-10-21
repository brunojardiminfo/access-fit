export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

function dateOnly(s: string): Date { return new Date(s + "T12:00:00.000Z"); }

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  if (d.getDate() !== date.getDate()) d.setDate(0);
  return d;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { date, description, amount, category, paymentMethod, supplierId, notes, dueDate, installments } = body;

  // Busca groupId antigo para deletar parcelas antigas
  const oldExpense = await prisma.expense.findUnique({ where: { id }, select: { groupId: true } });
  if (oldExpense?.groupId) {
    await prisma.expense.deleteMany({ where: { groupId: oldExpense.groupId } });
  }

  const isCard = paymentMethod === "cartao_credito";
  // Mesma distinção do POST: parcelado divide, recorrente repete o valor cheio.
  const recorrente = body.modo === "recorrente";
  const totalInst = isCard && installments > 1 ? parseInt(installments) : 1;
  // dueDate vem como "YYYY-MM" → dia 10
  const firstDue = isCard && dueDate
    ? (() => { const [y, m] = dueDate.split("-").map(Number); return new Date(y, m - 1, 10); })()
    : (dueDate ? new Date(dueDate) : null);

  const instAmt = recorrente ? parseFloat(amount) : parseFloat((parseFloat(amount) / totalInst).toFixed(2));

  if (totalInst === 1) {
    // Simples: só atualiza
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        date: dateOnly(date), description, amount: parseFloat(amount),
        category, paymentMethod, supplierId: supplierId || null,
        notes: notes || null, dueDate: firstDue,
        installments: 1, installmentNumber: 1, groupId: null,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });
    return NextResponse.json(expense);
  }

  // Parcelado: atualiza o registro atual como parcela 1 e cria os demais
  const groupId = randomUUID();

  await prisma.expense.update({
    where: { id },
    data: {
      date: dateOnly(date),
      description: recorrente ? description : `${description} (1/${totalInst})`,
      amount: instAmt, category, paymentMethod: "cartao_credito",
      supplierId: supplierId || null, notes: notes || null,
      dueDate: firstDue,
      installments: recorrente ? 1 : totalInst,
      installmentNumber: 1, groupId,
    },
  });

  for (let i = 1; i < totalInst; i++) {
    const due = addMonths(firstDue!, i);
    const isLast = i === totalInst - 1;
    const parcAmt = recorrente
      ? instAmt
      : isLast ? parseFloat((parseFloat(amount) - instAmt * (totalInst - 1)).toFixed(2)) : instAmt;
    await prisma.expense.create({
      data: {
        date: dateOnly(date),
        description: recorrente ? description : `${description} (${i + 1}/${totalInst})`,
        amount: parcAmt, category, paymentMethod: "cartao_credito",
        supplierId: supplierId || null, notes: notes || null,
        dueDate: due,
        installments: recorrente ? 1 : totalInst,
        installmentNumber: recorrente ? 1 : i + 1,
        groupId,
      },
    });
  }

  return NextResponse.json({ ok: true, installments: totalInst });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  // Busca groupId para deletar todas as parcelas do grupo
  const expense = await prisma.expense.findUnique({ where: { id }, select: { groupId: true } });
  if (expense?.groupId) {
    await prisma.expense.deleteMany({ where: { groupId: expense.groupId } });
  } else {
    await prisma.expense.delete({ where: { id } });
  }
  return NextResponse.json({ ok: true });
}
