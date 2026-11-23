export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Código obrigatório" }, { status: 400 });

  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

  if (!coupon || !coupon.active)
    return NextResponse.json({ error: "Cupom inválido ou inativo" }, { status: 404 });

  if (coupon.expiresAt && new Date() > coupon.expiresAt)
    return NextResponse.json({ error: "Cupom expirado" }, { status: 400 });

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses)
    return NextResponse.json({ error: "Cupom esgotado" }, { status: 400 });

  /**
   * Valor mínimo da sacola.
   *
   * O erro diz QUANTO FALTA, não só que não deu. "Cupom válido acima de
   * R$ 200" faz a cliente fechar o carrinho; "faltam R$ 38 para usar este
   * cupom" faz ela voltar e completar — e é a mesma informação.
   *
   * A base vem da sacola porque o servidor não conhece o carrinho dela. Sem o
   * parâmetro, o mínimo não é conferido aqui — por isso a rota do pedido
   * confere de novo, com os itens na mão, antes de gravar.
   */
  const base = Number(searchParams.get("base"));
  if (coupon.minValue && Number.isFinite(base) && base > 0 && base < coupon.minValue) {
    const falta = Math.round((coupon.minValue - base) * 100) / 100;
    const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    return NextResponse.json({
      error: `Faltam ${moeda(falta)} para usar este cupom (mínimo de ${moeda(coupon.minValue)}).`,
      minValue: coupon.minValue, falta,
    }, { status: 400 });
  }

  return NextResponse.json({
    code: coupon.code, discount: coupon.discount, type: coupon.type,
    minValue: coupon.minValue,
  });
}
