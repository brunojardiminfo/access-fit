export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/crm/guard";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const NEGADO = NextResponse.json({ error: "Não autorizado" }, { status: 401 });

export async function GET() {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const tags = await prisma.customerTag.findMany({
    orderBy: [{ auto: "desc" }, { name: "asc" }],
    include: { _count: { select: { links: true } } },
  });
  return NextResponse.json(
    tags.map(t => ({ id: t.id, name: t.name, slug: t.slug, color: t.color, auto: t.auto, clientes: t._count.links })),
  );
}

export async function POST(req: Request) {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const { name, color } = await req.json();
  const nome = String(name || "").trim();
  if (!nome) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

  const slug = slugify(nome);
  const existente = await prisma.customerTag.findUnique({ where: { slug } });
  if (existente) return NextResponse.json({ error: "Já existe uma etiqueta com esse nome" }, { status: 409 });

  const tag = await prisma.customerTag.create({
    data: { name: nome, slug, color: color || "#b8891a", auto: false },
  });
  return NextResponse.json(tag, { status: 201 });
}

/** Cola ou tira uma etiqueta de uma cliente. Etiqueta automática não se mexe. */
export async function PUT(req: Request) {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const { userId, tagId, colar } = await req.json();
  if (!userId || !tagId) return NextResponse.json({ error: "Cliente e etiqueta são obrigatórios" }, { status: 400 });

  const tag = await prisma.customerTag.findUnique({ where: { id: tagId } });
  if (!tag) return NextResponse.json({ error: "Etiqueta não encontrada" }, { status: 404 });
  if (tag.auto)
    return NextResponse.json(
      { error: "Essa etiqueta é calculada pelo sistema e volta sozinha na próxima varredura" },
      { status: 400 },
    );

  if (colar) {
    await prisma.customerTagLink.upsert({
      where: { userId_tagId: { userId, tagId } },
      update: {},
      create: { userId, tagId },
    });
  } else {
    await prisma.customerTagLink.deleteMany({ where: { userId, tagId } });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Etiqueta não informada" }, { status: 400 });

  const tag = await prisma.customerTag.findUnique({ where: { id } });
  if (tag?.auto)
    return NextResponse.json({ error: "Etiqueta automática não pode ser apagada" }, { status: 400 });

  await prisma.customerTag.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
