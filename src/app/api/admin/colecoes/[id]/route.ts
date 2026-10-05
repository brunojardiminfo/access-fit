export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

async function guard() {
  const session = await auth();
  return !(!session || (session.user as any)?.role !== "admin");
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
    data.slug = slugify(body.name.trim());
  }
  if ("tagline" in body) data.tagline = body.tagline?.trim() || null;
  if ("description" in body) data.description = body.description?.trim() || null;
  if ("image" in body) data.image = body.image?.trim() || null;
  if ("sazonal" in body) data.sazonal = Boolean(body.sazonal);
  if ("active" in body) data.active = Boolean(body.active);
  if ("ordem" in body && Number.isFinite(Number(body.ordem))) data.ordem = Number(body.ordem);

  const colecao = await prisma.collection.update({ where: { id }, data });
  return NextResponse.json(colecao);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await guard()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  // Coleção com peça dentro não é excluída por acidente: a curadoria é trabalho
  // manual de horas e um clique errado jogaria tudo fora sem aviso.
  const comPecas = await prisma.productCollection.count({ where: { collectionId: id } });
  if (comPecas > 0)
    return NextResponse.json(
      { error: `Esta coleção tem ${comPecas} peça(s). Tire as peças antes de excluir.` },
      { status: 409 },
    );

  await prisma.collection.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
