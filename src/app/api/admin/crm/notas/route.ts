export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/crm/guard";
import { prisma } from "@/lib/prisma";

const NEGADO = NextResponse.json({ error: "Não autorizado" }, { status: 401 });
const TIPOS = ["nota", "ligacao", "whatsapp", "visita"];

export async function GET(req: Request) {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Cliente não informado" }, { status: 400 });

  return NextResponse.json(
    await prisma.customerNote.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 200 }),
  );
}

export async function POST(req: Request) {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const { userId, kind, body, outcome } = await req.json();
  if (!userId || !String(body || "").trim())
    return NextResponse.json({ error: "Cliente e texto são obrigatórios" }, { status: 400 });

  const nota = await prisma.customerNote.create({
    data: {
      userId,
      kind: TIPOS.includes(kind) ? kind : "nota",
      body: String(body).trim().slice(0, 2000),
      outcome: outcome || null,
      authorName: sessao.nome,
    },
  });
  return NextResponse.json(nota, { status: 201 });
}

export async function DELETE(req: Request) {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Anotação não informada" }, { status: 400 });

  await prisma.customerNote.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
