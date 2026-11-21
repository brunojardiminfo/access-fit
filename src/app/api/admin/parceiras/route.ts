export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KIND_CASHBACK, baseDaComissao, novoToken, resumoDaParceira } from "@/lib/parceiras";

async function souAdmin() {
  const session = await auth();
  return !!session && (session.user as { role?: string })?.role === "admin";
}

/**
 * A lista das parceiras com o que cada uma gerou.
 *
 * TRÊS CONSULTAS, não três por parceira. Os pedidos e os créditos de todas
 * vêm de uma vez e são agrupados em memória — com uma consulta por parceira,
 * abrir a tela com dez parceiras acordaria o banco trinta vezes, e o Neon
 * cobra por tempo ligado.
 */
export async function GET() {
  if (!await souAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const parceiras = await prisma.parceira.findMany({
    orderBy: { nome: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (parceiras.length === 0) return NextResponse.json({ parceiras: [] });

  const ids = parceiras.map(p => p.id);
  const codigos = parceiras.map(p => p.codigo);
  const userIds = parceiras.map(p => p.userId).filter((x): x is string => !!x);

  const [pedidos, creditos] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: { not: "cancelled" },
        OR: [{ parceiraId: { in: ids } }, { couponCode: { in: codigos } }],
      },
      select: { id: true, parceiraId: true, couponCode: true, subtotal: true, discount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    userIds.length
      ? prisma.customerCredit.findMany({
          where: { userId: { in: userIds } },
          select: { userId: true, amount: true, kind: true },
        })
      : Promise.resolve([]),
  ]);

  const resultado = parceiras.map(p => {
    const meus = pedidos.filter(o => o.parceiraId === p.id || o.couponCode === p.codigo);
    const dela = creditos.filter(c => c.userId === p.userId);
    const resumo = resumoDaParceira(
      meus, p.comissao,
      dela.filter(c => c.kind === KIND_CASHBACK && c.amount > 0).map(c => c.amount),
      dela.map(c => c.amount),
    );
    return {
      id: p.id, nome: p.nome, codigo: p.codigo, telefone: p.telefone,
      comissao: p.comissao, ativa: p.ativa, token: p.token,
      user: p.user,
      ...resumo,
      ultimas: meus.slice(0, 5).map(o => ({ id: o.id, data: o.createdAt, valor: baseDaComissao(o) })),
    };
  });

  return NextResponse.json({ parceiras: resultado });
}

/** Cadastra uma parceira. O token nasce aqui e nunca aparece numa tela pública. */
export async function POST(req: Request) {
  if (!await souAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { nome, codigo, telefone, comissao, userId } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  const code = String(codigo || "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Código é obrigatório" }, { status: 400 });

  const jaExiste = await prisma.parceira.findUnique({ where: { codigo: code } });
  if (jaExiste) return NextResponse.json({ error: `Já existe parceira com o código ${code}` }, { status: 409 });

  const pct = Number(comissao);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100)
    return NextResponse.json({ error: "Comissão precisa estar entre 0 e 100" }, { status: 400 });

  const parceira = await prisma.parceira.create({
    data: {
      nome: nome.trim(), codigo: code, telefone: telefone?.trim() || null,
      comissao: pct, userId: userId || null, token: novoToken(),
    },
  });
  return NextResponse.json(parceira);
}

/**
 * Edita a parceira, ou lança o cashback dela como crédito na loja.
 *
 * O VALOR LANÇADO É RECALCULADO AQUI, não aceito da tela. A tela mostra
 * quanto falta creditar, mas quem chamar esta rota direto não passa pela
 * tela — e aqui o número vira dinheiro gastável.
 */
export async function PUT(req: Request) {
  if (!await souAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { id, acao } = body;
  if (!id) return NextResponse.json({ error: "Parceira não informada" }, { status: 400 });

  const parceira = await prisma.parceira.findUnique({ where: { id } });
  if (!parceira) return NextResponse.json({ error: "Parceira não encontrada" }, { status: 404 });

  if (acao === "creditar") {
    if (!parceira.userId)
      return NextResponse.json(
        { error: "Ligue a parceira a uma conta de cliente antes de creditar — o crédito vive na conta dela." },
        { status: 400 },
      );

    const [pedidos, creditos] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: { not: "cancelled" },
          OR: [{ parceiraId: parceira.id }, { couponCode: parceira.codigo }],
        },
        select: { subtotal: true, discount: true },
      }),
      prisma.customerCredit.findMany({
        where: { userId: parceira.userId, kind: KIND_CASHBACK, amount: { gt: 0 } },
        select: { amount: true },
      }),
    ]);

    const { aCreditar } = resumoDaParceira(pedidos, parceira.comissao, creditos.map(c => c.amount), []);
    if (aCreditar <= 0)
      return NextResponse.json({ error: "Não há cashback pendente para lançar." }, { status: 400 });

    const session = await auth();
    await prisma.customerCredit.create({
      data: {
        userId: parceira.userId,
        amount: aCreditar,
        kind: KIND_CASHBACK,
        note: `Cashback de parceria ${parceira.codigo} (${parceira.comissao}%)`,
        authorName: (session?.user as { name?: string })?.name || "admin",
      },
    });
    return NextResponse.json({ creditado: aCreditar });
  }

  const data: Record<string, unknown> = {};
  if (body.nome !== undefined) data.nome = String(body.nome).trim();
  if (body.telefone !== undefined) data.telefone = String(body.telefone).trim() || null;
  if (body.ativa !== undefined) data.ativa = !!body.ativa;
  if (body.userId !== undefined) data.userId = body.userId || null;
  if (body.comissao !== undefined) {
    const pct = Number(body.comissao);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100)
      return NextResponse.json({ error: "Comissão precisa estar entre 0 e 100" }, { status: 400 });
    data.comissao = pct;
  }
  // Trocar o token derruba o link antigo: serve para quando ele vazar.
  if (body.novoLink) data.token = novoToken();

  const atualizada = await prisma.parceira.update({ where: { id }, data });
  return NextResponse.json(atualizada);
}
