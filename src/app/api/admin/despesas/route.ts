export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

// Salva datas como meio-dia UTC para evitar problema de timezone (UTC-3 Brasil)
function dateOnly(s: string): Date { return new Date(s + "T12:00:00.000Z"); }

function monthToDueDate(month: string): Date {
  // month = "YYYY-MM" → dia 10
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 10, 12, 0, 0));
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  if (d.getDate() !== date.getDate()) d.setDate(0); // ajuste fim de mês
  return d;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const supplierId = searchParams.get("supplierId");
  const category = searchParams.get("category");
  const cartao = searchParams.get("cartao");

  const where: any = {};

  if (cartao) {
    where.paymentMethod = "cartao_credito";
    if (from || to) {
      where.dueDate = {};
      if (from) where.dueDate.gte = new Date(from + "T00:00:00.000Z");
      if (to) where.dueDate.lte = new Date(to + "T23:59:59.999Z");
    }
  } else {
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from + "T00:00:00.000Z");
      if (to) where.date.lte = new Date(to + "T23:59:59.999Z");
    }
    if (supplierId) where.supplierId = supplierId;
    if (category) where.category = category;
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: cartao ? { dueDate: "asc" } : { date: "desc" },
    include: { supplier: { select: { id: true, name: true } } },
  });

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  return NextResponse.json({ expenses, total });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { date, description, amount, category, paymentMethod, supplierId, notes, installments, dueDate } = body;

  if (!description?.trim()) return NextResponse.json({ error: "Descrição obrigatória" }, { status: 400 });
  if (!amount || isNaN(amount) || amount <= 0) return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  if (!date) return NextResponse.json({ error: "Data obrigatória" }, { status: 400 });

  const isCard = paymentMethod === "cartao_credito";
  // Parcelado divide o valor; recorrente repete o valor cheio todo mês. Eram a
  // mesma coisa no código, e lançar uma assinatura mensal de R$ 113,48 "em 12x"
  // virava doze cobranças de R$ 9,46.
  const recorrente = body.modo === "recorrente";
  const totalInst = isCard && installments > 1 ? parseInt(installments) : 1;
  const instAmt = recorrente ? parseFloat(amount) : parseFloat((amount / totalInst).toFixed(2));
  const groupId = totalInst > 1 ? randomUUID() : null;

  // dueDate vem como "YYYY-MM" → converte para dia 10
  const firstDue = isCard && dueDate ? monthToDueDate(dueDate) : (dueDate ? new Date(dueDate) : null);

  if (totalInst === 1) {
    const expense = await prisma.expense.create({
      data: {
        date: dateOnly(date), description: description.trim(),
        amount: parseFloat(amount), category: category || "outros",
        paymentMethod: paymentMethod || "pix",
        supplierId: supplierId || null, notes: notes || null,
        dueDate: firstDue, installments: 1, installmentNumber: 1,
      },
      include: { supplier: { select: { id: true, name: true } } },
    });
    return NextResponse.json(expense, { status: 201 });
  }

  const created = [];
  for (let i = 0; i < totalInst; i++) {
    const due = addMonths(firstDue!, i);
    const isLast = i === totalInst - 1;
    // Na recorrente cada mês é o valor cheio. No parcelado a última parcela
    // absorve a sobra do arredondamento, para a soma fechar com o total.
    const parcAmt = recorrente
      ? instAmt
      : isLast ? parseFloat((amount - instAmt * (totalInst - 1)).toFixed(2)) : instAmt;
    created.push(await prisma.expense.create({
      data: {
        date: dateOnly(date),
        // A recorrente não numera: cada mês é uma cobrança inteira, não a
        // fatia de uma compra. O mês do vencimento já separa uma da outra.
        description: recorrente ? description.trim() : `${description.trim()} (${i + 1}/${totalInst})`,
        amount: parcAmt, category: category || "outros",
        paymentMethod: "cartao_credito",
        supplierId: supplierId || null, notes: notes || null,
        dueDate: due,
        installments: recorrente ? 1 : totalInst,
        installmentNumber: recorrente ? 1 : i + 1,
        groupId,
      },
    }));
  }
  return NextResponse.json(created, { status: 201 });
}
