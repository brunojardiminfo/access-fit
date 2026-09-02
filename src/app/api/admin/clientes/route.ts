export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const customers = await prisma.user.findMany({
    where: { role: "customer" },
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(customers);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { name, email, phone, birthDate } = await req.json();
  if (!name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

  // Sem e-mail informado, gera um interno no mesmo padrao usado ao criar pedido
  const finalEmail = email?.trim() || `${name.toLowerCase().replace(/\s+/g, ".")}.${Date.now()}@cliente.accessfit.com.br`;
  const existing = await prisma.user.findUnique({ where: { email: finalEmail } });
  if (existing) return NextResponse.json({ error: "Já existe um cliente com esse e-mail" }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      name,
      email: finalEmail,
      phone: phone || null,
      birthDate: birthDate ? new Date(birthDate) : null,
      role: "customer",
    },
  });
  return NextResponse.json(user, { status: 201 });
}
