export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const cupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });

  // Busca stats reais de pedidos por cupom
  const stats = await prisma.$queryRaw<Array<{couponCode: string, uses: number, revenue: number}>>`
    SELECT "couponCode", COUNT(id) as uses, SUM(total) as revenue
    FROM "Order"
    WHERE "couponCode" IS NOT NULL AND status != 'cancelled'
    GROUP BY "couponCode"
  `;

  const statsMap = Object.fromEntries(stats.map(s => [s.couponCode, { uses: Number(s.uses), revenue: Number(s.revenue) }]));

  const cuponsComStats = cupons.map(c => ({
    ...c,
    usesReal: statsMap[c.code]?.uses || 0,
    revenueGerada: statsMap[c.code]?.revenue || 0,
  }));

  return NextResponse.json(cuponsComStats);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = await req.json();
  if (!body.code?.trim()) return NextResponse.json({ error: "Código obrigatório" }, { status: 400 });
  const coupon = await prisma.coupon.create({
    data: {
      code: body.code.trim().toUpperCase(),
      discount: parseFloat(body.discount),
      type: body.type || "percent",
      maxUses: body.maxUses ? parseInt(body.maxUses) : null,
      // Vazio é "sem mínimo", não zero: um mínimo de R$ 0 passaria a aparecer
      // como regra na tela sem ser regra nenhuma.
      minValue: body.minValue ? parseFloat(body.minValue) : null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      active: true,
    },
  });
  return NextResponse.json(coupon, { status: 201 });
}
