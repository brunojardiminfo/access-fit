export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSaleInfo, calculateSalePrice } from "@/lib/saleHelper";

type IncomingItem = { productId?: string; quantity?: number; price?: number; size?: string | null };

// O preco cobrado nunca vem do cliente: e recalculado aqui a partir do banco,
// aplicando o desconto de SALE quando a peca esta em promocao.
async function resolvePrices(items: IncomingItem[]) {
  const productIds = Array.from(
    new Set(items.map(i => i.productId).filter((id): id is string => !!id))
  );

  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { conjuntoItems: true },
      })
    : [];
  const byId = new Map(products.map(p => [p.id, p]));

  return items.map(item => {
    const clientPrice = Number(item.price) || 0;
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const product = item.productId ? byId.get(item.productId) : undefined;

    // Venda manual / produto inexistente: sem preco no banco para conferir
    if (!product) return { ...item, quantity, price: clientPrice };

    const saleInfo = getSaleInfo(product);
    const withSale = (value: number) =>
      saleInfo ? calculateSalePrice(value, saleInfo.discount) : value;

    // O carrinho nao diferencia conjunto completo de componente avulso, entao
    // aceitamos qualquer preco valido da peca e devolvemos a versao com desconto.
    const candidates = [product.price, ...product.conjuntoItems.map(c => c.price)];
    const matched = candidates.find(
      value => Math.abs(clientPrice - value) < 0.01 || Math.abs(clientPrice - withSale(value)) < 0.01
    );

    return { ...item, quantity, price: withSale(matched ?? product.price) };
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { items, paymentMethod, notes, couponCode, status } = body;

  if (!items?.length) return NextResponse.json({ error: "Nenhum item" }, { status: 400 });

  const pricedItems = await resolvePrices(items as IncomingItem[]);
  const subtotal = pricedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Cupom revalidado no banco: o desconto tambem nao vem do cliente
  let discount = 0;
  let validCouponCode: string | null = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: String(couponCode).toUpperCase() } });
    const expired = coupon?.expiresAt ? new Date() > coupon.expiresAt : false;
    const exhausted = coupon?.maxUses ? coupon.usedCount >= coupon.maxUses : false;
    if (coupon && coupon.active && !expired && !exhausted) {
      validCouponCode = coupon.code;
      discount = coupon.type === "fixed" || coupon.type === "valor"
        ? Math.min(coupon.discount, subtotal)
        : (subtotal * coupon.discount) / 100;
    }
  }

  const totalFinal = Math.round(Math.max(0, subtotal - discount) * 100) / 100;

  // Tenta pegar o usuário logado, senão usa um usuário genérico
  const session = await auth();
  let userId: string;

  if (session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    userId = user?.id || "";
  }

  // Se não logado, cria/busca usuário anônimo
  if (!userId!) {
    const guestEmail = "pedido.site@accessfit.com.br";
    const guest = await prisma.user.upsert({
      where: { email: guestEmail },
      update: {},
      create: { email: guestEmail, name: "Pedido Site", role: "customer" },
    });
    userId = guest.id;
  }

  const vendaManual = await prisma.product.findFirst({ where: { name: "Venda Manual" } });

  const orderItems = pricedItems.map(i => ({ ...i, productId: i.productId || vendaManual?.id }));
  if (orderItems.some(i => !i.productId)) {
    return NextResponse.json({ error: "Item sem produto valido" }, { status: 400 });
  }

  const order = await prisma.order.create({
    data: {
      userId,
      status: status || "pending",
      paymentStatus: "pending",
      paymentMethod: paymentMethod || "pix",
      amountPaid: 0,
      total: totalFinal,
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      shipping: 0,
      notes: notes || null,
      couponCode: validCouponCode,
      items: {
        create: orderItems.map(i => ({
          productId: i.productId as string,
          quantity: i.quantity,
          price: i.price,
          size: i.size || null,
        })),
      },
    },
  });

  await prisma.orderStatusHistory.create({ data: { orderId: order.id, status: order.status } });

  // Incrementar usedCount do cupom
  if (validCouponCode) {
    await prisma.coupon.updateMany({
      where: { code: validCouponCode },
      data: { usedCount: { increment: 1 } },
    });
  }

  return NextResponse.json({ id: order.id });
}
