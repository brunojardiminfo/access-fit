export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

async function guard() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") return false;
  return true;
}

export async function GET() {
  if (!(await guard()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const colecoes = await prisma.collection.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sazonal: "asc" }, { ordem: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(colecoes);
}

export async function POST(req: Request) {
  if (!(await guard()))
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });

  const slug = slugify(name);
  const existe = await prisma.collection.findFirst({
    where: { OR: [{ slug }, { name }] },
  });
  if (existe)
    return NextResponse.json({ error: "Já existe uma coleção com esse nome." }, { status: 409 });

  const colecao = await prisma.collection.create({
    data: {
      name,
      slug,
      tagline: body.tagline?.trim() || null,
      description: body.description?.trim() || null,
      sazonal: Boolean(body.sazonal),
      ordem: Number.isFinite(Number(body.ordem)) ? Number(body.ordem) : 0,
    },
  });
  return NextResponse.json(colecao, { status: 201 });
}
