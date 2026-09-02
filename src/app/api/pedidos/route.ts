export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSaleInfo, calculateSalePrice } from "@/lib/saleHelper";
import { descontoEfetivo, descontoProgressivo, faseCampanha, CAMPANHA } from "@/lib/campanha";
import { decrementProductStock, consomeEstoque } from "@/lib/stock";

type IncomingItem = { productId?: string; quantity?: number; price?: number; size?: string | null };

// O preco cobrado nunca vem do cliente: e recalculado aqui a partir do banco,
// aplicando o desconto de SALE quando a peca esta em promocao.
async function resolvePrices(items: IncomingItem[], ignorarCampanha = false) {
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

  // Quantas pecas a sacola tem no total: e isso que define a faixa progressiva
  const totalPecas = items.reduce((s, i) => s + Math.max(1, Number(i.quantity) || 1), 0);

  return items.map(item => {
    const clientPrice = Number(item.price) || 0;
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const product = item.productId ? byId.get(item.productId) : undefined;

    // Venda manual / produto inexistente: sem preco no banco para conferir
    if (!product) return { ...item, quantity, price: clientPrice, descontoSale: 0 };

    const saleInfo = getSaleInfo(product);
    const descontoSale = saleInfo?.discount ?? 0;
    // Vale a melhor condicao entre SALE e progressivo — os dois nunca somam
    const efetivo = ignorarCampanha ? descontoSale : descontoEfetivo(descontoSale, totalPecas);

    const withSale = (value: number) => calculateSalePrice(value, descontoSale);
    const withEfetivo = (value: number) => calculateSalePrice(value, efetivo);

    // O carrinho nao diferencia conjunto completo de componente avulso, entao
    // aceitamos qualquer preco valido da peca — de tabela, com SALE ou ja com
    // a campanha — e devolvemos sempre a versao correta.
    const candidates = [product.price, ...product.conjuntoItems.map(c => c.price)];
    const bate = (alvo: number) => Math.abs(clientPrice - alvo) < 0.01;
    const matched = candidates.find(
      value => bate(value) || bate(withSale(value)) || bate(withEfetivo(value))
    );

    return { ...item, quantity, price: withEfetivo(matched ?? product.price), descontoSale };
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { items, paymentMethod, notes, couponCode, status, previewId, cliente, endereco } = body;

  if (!items?.length) return NextResponse.json({ error: "Nenhum item" }, { status: 400 });

  // Duas contas: uma so com o SALE (onde o cupom pode entrar) e outra com a
  // campanha. Vale a melhor para a cliente — cupom e campanha nunca somam.
  const itensSoSale = await resolvePrices(items as IncomingItem[], true);
  const itensCampanha = await resolvePrices(items as IncomingItem[]);
  const subtotalSoSale = itensSoSale.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const subtotalCampanha = itensCampanha.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const pecas = itensCampanha.reduce((s, i) => s + i.quantity, 0);
  const progressivoAplicado = faseCampanha() === "ativa" ? descontoProgressivo(pecas) : 0;

  // Cupom revalidado no banco: o desconto tambem nao vem do cliente
  // Peça em SALE não acumula cupom: a base do cupom é só o que está a preço cheio
  const baseCupom = itensSoSale
    .filter(i => (i.descontoSale || 0) <= 0)
    .reduce((sum, i) => sum + i.price * i.quantity, 0);

  let descontoCupom = 0;
  let cupomValido: string | null = null;
  if (couponCode && baseCupom > 0) {
    const coupon = await prisma.coupon.findUnique({ where: { code: String(couponCode).toUpperCase() } });
    const expired = coupon?.expiresAt ? new Date() > coupon.expiresAt : false;
    const exhausted = coupon?.maxUses ? coupon.usedCount >= coupon.maxUses : false;
    if (coupon && coupon.active && !expired && !exhausted) {
      cupomValido = coupon.code;
      descontoCupom = coupon.type === "fixed" || coupon.type === "valor"
        ? Math.min(coupon.discount, baseCupom)
        : (baseCupom * coupon.discount) / 100;
    }
  }

  const totalComCupom = Math.max(0, subtotalSoSale - descontoCupom);
  const cupomGanha = cupomValido !== null && descontoCupom > 0.001 && totalComCupom < subtotalCampanha - 0.001;

  const pricedItems = cupomGanha ? itensSoSale : itensCampanha;
  const subtotal = cupomGanha ? subtotalSoSale : subtotalCampanha;
  const discount = cupomGanha ? descontoCupom : 0;
  const validCouponCode = cupomGanha ? cupomValido : null;
  const notaCampanha = !cupomGanha && progressivoAplicado > 0
    ? `${CAMPANHA.nome}: ${pecas} peças (-${progressivoAplicado}%)`
    : null;

  const totalFinal = Math.round(Math.max(0, subtotal - discount) * 100) / 100;

  // Tenta pegar o usuário logado, senão usa um usuário genérico
  const session = await auth();
  let userId: string;

  if (session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    userId = user?.id || "";
  }

  // Sem login, o pedido vai para a propria cliente: o nome que ela digitou no
  // checkout vira cadastro, em vez de cair no generico "Pedido Site"
  if (!userId! && cliente?.nome) {
    const telefone = String(cliente.telefone || "").replace(/\D/g, "");
    const nascimento = cliente.nascimento ? new Date(`${cliente.nascimento}T12:00:00`) : null;

    // Mesma pessoa comprando de novo: reaproveita o cadastro pelo telefone
    const existente = telefone
      ? await prisma.user.findFirst({ where: { phone: telefone, role: "customer" } })
      : null;

    if (existente) {
      // Completa o que faltava, sem apagar o que ja estava preenchido
      const faltando: { name?: string; birthDate?: Date } = {};
      if (!existente.name && cliente.nome) faltando.name = cliente.nome;
      if (!existente.birthDate && nascimento) faltando.birthDate = nascimento;
      if (Object.keys(faltando).length) {
        await prisma.user.update({ where: { id: existente.id }, data: faltando });
      }
      userId = existente.id;
    } else {
      const email = `${cliente.nome.toLowerCase().trim().replace(/\s+/g, ".")}.${Date.now()}@cliente.accessfit.com.br`;
      const nova = await prisma.user.create({
        data: { name: cliente.nome, email, phone: telefone || null, birthDate: nascimento, role: "customer" },
      });
      userId = nova.id;
    }
  }

  // Ultimo recurso: pedido sem nome nenhum ainda precisa de dono
  if (!userId!) {
    const guestEmail = "pedido.site@accessfit.com.br";
    const guest = await prisma.user.upsert({
      where: { email: guestEmail },
      update: {},
      create: { email: guestEmail, name: "Pedido Site", role: "customer" },
    });
    userId = guest.id;
  }

  // Endereco de entrega fica no cadastro da cliente, para a proxima compra
  // ja vir preenchido e para a entrega nao depender da mensagem do WhatsApp
  let addressId: string | null = null;
  if (endereco?.rua && endereco?.numero && endereco?.cidade) {
    const dados = {
      street: String(endereco.rua),
      number: String(endereco.numero),
      complement: endereco.complemento ? String(endereco.complemento) : null,
      district: String(endereco.bairro || ""),
      city: String(endereco.cidade),
      state: String(endereco.estado || "").toUpperCase().slice(0, 2),
      zipCode: String(endereco.cep || "").replace(/\D/g, ""),
    };
    // Mesmo endereco de novo nao vira duplicata: atualiza o que ja existe
    const atual = await prisma.address.findFirst({ where: { userId } });
    const salvo = atual
      ? await prisma.address.update({ where: { id: atual.id }, data: dados })
      : await prisma.address.create({ data: { ...dados, userId, label: "Entrega" } });
    addressId = salvo.id;
  }

  const vendaManual = await prisma.product.findFirst({ where: { name: "Venda Manual" } });

  const orderItems = pricedItems.map(i => ({ ...i, productId: i.productId || vendaManual?.id }));
  if (orderItems.some(i => !i.productId)) {
    return NextResponse.json({ error: "Item sem produto valido" }, { status: 400 });
  }

  const orderData = {
    userId,
    status: status || "pending",
    paymentStatus: "pending",
    paymentMethod: paymentMethod || "pix",
    amountPaid: 0,
    total: totalFinal,
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    shipping: 0,
    notes: [notes, notaCampanha].filter(Boolean).join(" | ") || null,
    ...(addressId ? { addressId } : {}),
    couponCode: validCouponCode,
  };
  const itemsData = orderItems.map(i => ({
    productId: i.productId as string,
    quantity: i.quantity,
    price: i.price,
    size: i.size || null,
  }));

  // Veio de um link de compartilhamento: aproveita o rascunho em vez de criar
  // outro pedido, senao o mesmo carrinho vira duas linhas no admin
  const rascunho = previewId
    ? await prisma.order.findUnique({ where: { id: String(previewId) }, select: { id: true, status: true } })
    : null;

  let order;
  if (rascunho && rascunho.status === "preview") {
    await prisma.orderItem.deleteMany({ where: { orderId: rascunho.id } });
    order = await prisma.order.update({
      where: { id: rascunho.id },
      data: { ...orderData, items: { create: itemsData } },
    });
  } else {
    order = await prisma.order.create({
      data: { ...orderData, items: { create: itemsData } },
    });
  }

  await prisma.orderStatusHistory.create({ data: { orderId: order.id, status: order.status } });

  // Home Try-On ja sai com as pecas; pedido "aguardando" so da baixa quando
  // for confirmado no admin
  if (consomeEstoque(order.status)) {
    for (const item of orderItems) {
      await decrementProductStock(item.productId as string, item.quantity, item.size);
    }
  }

  // Incrementar usedCount do cupom
  if (validCouponCode) {
    await prisma.coupon.updateMany({
      where: { code: validCouponCode },
      data: { usedCount: { increment: 1 } },
    });
  }

  return NextResponse.json({ id: order.id });
}
