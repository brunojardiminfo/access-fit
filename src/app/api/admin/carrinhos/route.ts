export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Sacola parada há menos que isso ainda pode virar compra sozinha. */
const MINUTOS_PARA_ABANDONO = 45;

function admin(session: unknown) {
  const user = (session as { user?: { role?: string } } | null)?.user;
  return Boolean(user && user.role === "admin");
}

export async function GET() {
  const session = await auth();
  if (!admin(session)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const corte = new Date(Date.now() - MINUTOS_PARA_ABANDONO * 60 * 1000);

  const [comContato, anonimas] = await Promise.all([
    // Quem deixou nome e telefone e não fechou: é aqui que mora a venda
    prisma.cartLead.findMany({
      where: { status: "aberto", phone: { not: null }, updatedAt: { lte: corte }, pecas: { gt: 0 } },
      orderBy: { updatedAt: "desc" },
      take: 60,
    }),
    // Sem contato: não dá para abordar ninguém, mas diz o que é desejado
    prisma.cartLead.findMany({
      where: { status: "aberto", phone: null, updatedAt: { lte: corte }, pecas: { gt: 0 } },
      orderBy: { updatedAt: "desc" },
      take: 300,
      select: { items: true, total: true, updatedAt: true },
    }),
  ]);

  // Ranking das peças que entram no carrinho e não são compradas
  const desejo = new Map<string, { nome: string; vezes: number }>();
  for (const sacola of anonimas) {
    let itens: { nome?: string }[] = [];
    try { itens = JSON.parse(sacola.items || "[]"); } catch { itens = []; }
    for (const item of itens) {
      const nome = (item?.nome || "").trim();
      if (!nome) continue;
      const atual = desejo.get(nome) || { nome, vezes: 0 };
      atual.vezes += 1;
      desejo.set(nome, atual);
    }
  }

  return NextResponse.json({
    sacolas: comContato,
    anonimas: anonimas.length,
    desejadas: [...desejo.values()].sort((a, b) => b.vezes - a.vezes).slice(0, 8),
  });
}

/** Marca uma sacola como já abordada ou descartada. */
export async function PUT(req: Request) {
  const session = await auth();
  if (!admin(session)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id, status } = await req.json();
  if (!id || !["contatado", "descartado", "aberto"].includes(status))
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  await prisma.cartLead.update({
    where: { id },
    data: { status, contactedAt: status === "contatado" ? new Date() : null },
  });
  return NextResponse.json({ ok: true });
}
