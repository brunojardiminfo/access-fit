export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { items, total, subtotal, couponCode, discount } = await req.json();

  if (!items || items.length === 0)
    return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });

  // Cria um "rascunho" de pedido com status "preview"
  // Usa um usuário dummy para pedidos de preview (será atualizado quando cliente fizer login/checkout)
  let guestUser = await prisma.user.findUnique({
    where: { email: "preview@accessfit.local" },
  });

  if (!guestUser) {
    guestUser = await prisma.user.create({
      data: {
        email: "preview@accessfit.local",
        name: "Preview",
        role: "customer",
      },
    });
  }

  const order = await prisma.order.create({
    data: {
      status: "preview",
      paymentStatus: "pending",
      paymentMethod: "whatsapp",
      total,
      subtotal: subtotal || total,
      discount: discount || 0,
      couponCode: couponCode || undefined,
      userId: guestUser.id,
      items: {
        create: items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          size: item.size || null,
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });

  return NextResponse.json({
    previewToken: order.id,
    shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.accessfit.com.br"}/pedido-preview/${order.id}`
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("id");

  if (!orderId)
    return NextResponse.json({ error: "ID não informado" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });

  if (!order)
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

  return NextResponse.json(order);
}
