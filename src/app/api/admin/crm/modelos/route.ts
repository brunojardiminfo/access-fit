export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/crm/guard";
import { prisma } from "@/lib/prisma";
import { MODELOS_PADRAO, TIPOS_DE_TAREFA } from "@/lib/crm/mensagens";

const NEGADO = NextResponse.json({ error: "Não autorizado" }, { status: 401 });
const KINDS = TIPOS_DE_TAREFA.map(t => t.kind);

export async function GET() {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const salvos = await prisma.messageTemplate.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ tipos: TIPOS_DE_TAREFA, padroes: MODELOS_PADRAO, salvos });
}

export async function POST(req: Request) {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const { kind, body } = await req.json();
  if (!KINDS.includes(kind)) return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  if (!String(body || "").trim()) return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 });

  const modelo = await prisma.messageTemplate.create({
    data: { kind, body: String(body).trim().slice(0, 1000) },
  });
  return NextResponse.json(modelo, { status: 201 });
}

export async function PUT(req: Request) {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const { id, body, active } = await req.json();
  if (!id) return NextResponse.json({ error: "Modelo não informado" }, { status: 400 });

  const modelo = await prisma.messageTemplate.update({
    where: { id },
    data: {
      ...(body !== undefined ? { body: String(body).trim().slice(0, 1000) } : {}),
      ...(active !== undefined ? { active: !!active } : {}),
    },
  });
  return NextResponse.json(modelo);
}

export async function DELETE(req: Request) {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Modelo não informado" }, { status: 400 });

  await prisma.messageTemplate.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
