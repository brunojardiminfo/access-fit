import { prisma } from "@/lib/prisma";

/**
 * Perfil de compra de uma cliente, calculado a partir dos pedidos dela.
 *
 * Tres telas dependem deste calculo — a ficha, as etiquetas automaticas e o
 * motor de tarefas — e todas precisam concordar no que e "uma compra". Por isso
 * a conta mora aqui e nao em cada uma delas: pedido cancelado nunca conta, e
 * "gasto" e sempre o total do pedido (com desconto aplicado), nao o subtotal.
 */

export const DIA = 24 * 60 * 60 * 1000;

export type ItemDoPerfil = {
  productId: string;
  produto: string;
  categoria: string;
  cor: string | null;
  tamanho: string | null;
  componente: string | null;
  quantidade: number;
  preco: number;
};

export type PedidoDoPerfil = {
  id: string;
  createdAt: Date;
  deliveredAt: Date | null;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  amountPaid: number;
  discount: number;
  couponCode: string | null;
  itens: ItemDoPerfil[];
};

export type Perfil = {
  pedidos: PedidoDoPerfil[];
  quantidade: number;
  totalGasto: number;
  totalPago: number;
  saldoAberto: number;
  ticketMedio: number;
  primeiraCompra: Date | null;
  ultimaCompra: Date | null;
  diasSemComprar: number | null;
  /** Intervalo tipico entre as compras dela, em dias. Null com menos de 2 compras. */
  cicloMedio: number | null;
  /** Quanto ela ja passou do proprio ciclo. 1 = esta na hora; 2 = dobro do normal. */
  atraso: number | null;
  pecas: number;
  tamanhos: Contagem[];
  cores: Contagem[];
  categorias: Contagem[];
  produtos: Contagem[];
  /** Fatia dos pedidos que teve cupom ou desconto. */
  fatiaComDesconto: number;
  devolucoes: number;
  trocas: number;
};

export type Contagem = { nome: string; vezes: number; fatia: number };

function contar(valores: (string | null | undefined)[]): Contagem[] {
  const mapa = new Map<string, number>();
  let total = 0;
  for (const v of valores) {
    const nome = (v || "").trim();
    if (!nome) continue;
    mapa.set(nome, (mapa.get(nome) || 0) + 1);
    total++;
  }
  return [...mapa.entries()]
    .map(([nome, vezes]) => ({ nome, vezes, fatia: total ? vezes / total : 0 }))
    .sort((a, b) => b.vezes - a.vezes);
}

/** Mediana, e nao media: uma compra fora da curva nao desloca o ciclo inteiro. */
function mediana(nums: number[]): number | null {
  if (!nums.length) return null;
  const ordenado = [...nums].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  return ordenado.length % 2 ? ordenado[meio] : (ordenado[meio - 1] + ordenado[meio]) / 2;
}

const DUAS_CASAS = (n: number) => Math.round(n * 100) / 100;

type OrderCru = {
  id: string; createdAt: Date; deliveredAt: Date | null; status: string;
  paymentStatus: string; paymentMethod: string; total: number; amountPaid: number;
  discount: number; couponCode: string | null;
  items: {
    productId: string; quantity: number; price: number; size: string | null;
    color: string | null; componentName: string | null;
    product: { name: string; category: { name: string } | null } | null;
  }[];
};

type DevolucaoCrua = { replacementProductId: string | null };

const INCLUDE_ITENS = {
  items: {
    select: {
      productId: true, quantity: true, price: true, size: true, color: true,
      componentName: true,
      product: { select: { name: true, category: { select: { name: true } } } },
    },
  },
} as const;

/** O calculo em si, sem banco — para servir tanto uma cliente quanto todas. */
export function montarPerfil(orders: OrderCru[], devolucoes: DevolucaoCrua[], agora: Date): Perfil {
  const pedidos: PedidoDoPerfil[] = orders
    .filter(o => o.status !== "cancelled")
    .map(o => ({
      id: o.id,
      createdAt: o.createdAt,
      deliveredAt: o.deliveredAt,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      total: o.total,
      amountPaid: o.amountPaid,
      discount: o.discount,
      couponCode: o.couponCode,
      itens: o.items.map(i => ({
        productId: i.productId,
        produto: i.product?.name || "Peça",
        categoria: i.product?.category?.name || "Sem categoria",
        cor: i.color,
        tamanho: i.size,
        componente: i.componentName,
        quantidade: i.quantity,
        preco: i.price,
      })),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const totalGasto = DUAS_CASAS(pedidos.reduce((s, p) => s + p.total, 0));
  const totalPago = DUAS_CASAS(pedidos.reduce((s, p) => s + p.amountPaid, 0));
  const datas = pedidos.map(p => p.createdAt.getTime()).sort((a, b) => a - b);
  const ultimaCompra = datas.length ? new Date(datas[datas.length - 1]) : null;

  // Intervalos entre compras consecutivas, em dias.
  const intervalos: number[] = [];
  for (let i = 1; i < datas.length; i++) intervalos.push((datas[i] - datas[i - 1]) / DIA);
  const cicloMedio = mediana(intervalos);

  const diasSemComprar = ultimaCompra
    ? Math.floor((agora.getTime() - ultimaCompra.getTime()) / DIA)
    : null;

  const todosItens = pedidos.flatMap(p => p.itens);
  const comDesconto = pedidos.filter(p => p.discount > 0 || !!p.couponCode).length;

  return {
    pedidos,
    quantidade: pedidos.length,
    totalGasto,
    totalPago,
    saldoAberto: DUAS_CASAS(Math.max(0, totalGasto - totalPago)),
    ticketMedio: pedidos.length ? DUAS_CASAS(totalGasto / pedidos.length) : 0,
    primeiraCompra: datas.length ? new Date(datas[0]) : null,
    ultimaCompra,
    diasSemComprar,
    cicloMedio: cicloMedio ? Math.round(cicloMedio) : null,
    atraso: cicloMedio && diasSemComprar !== null ? DUAS_CASAS(diasSemComprar / cicloMedio) : null,
    pecas: todosItens.reduce((s, i) => s + i.quantidade, 0),
    tamanhos: contar(todosItens.map(i => i.tamanho)),
    cores: contar(todosItens.map(i => i.cor)),
    categorias: contar(todosItens.map(i => i.categoria)),
    produtos: contar(todosItens.map(i => i.produto)),
    fatiaComDesconto: pedidos.length ? comDesconto / pedidos.length : 0,
    devolucoes: devolucoes.filter(d => !d.replacementProductId).length,
    trocas: devolucoes.filter(d => !!d.replacementProductId).length,
  };
}

export async function perfilDaCliente(userId: string, agora = new Date()): Promise<Perfil> {
  const [orders, devolucoes] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: INCLUDE_ITENS,
    }),
    prisma.return.findMany({
      where: { order: { userId } },
      select: { replacementProductId: true },
    }),
  ]);

  return montarPerfil(orders, devolucoes, agora);
}

/**
 * Perfil de todas as clientes de uma vez, em duas consultas em vez de duas por
 * cliente. E o que a rotina noturna usa para recalcular etiqueta de loja inteira.
 */
export async function perfisDeTodas(agora = new Date()): Promise<Map<string, Perfil>> {
  const [orders, devolucoes] = await Promise.all([
    prisma.order.findMany({ include: INCLUDE_ITENS }),
    prisma.return.findMany({
      select: { replacementProductId: true, order: { select: { userId: true } } },
    }),
  ]);

  const porCliente = new Map<string, OrderCru[]>();
  for (const o of orders) {
    const lista = porCliente.get(o.userId) || [];
    lista.push(o);
    porCliente.set(o.userId, lista);
  }

  const devsPorCliente = new Map<string, DevolucaoCrua[]>();
  for (const d of devolucoes) {
    const uid = d.order?.userId;
    if (!uid) continue;
    const lista = devsPorCliente.get(uid) || [];
    lista.push({ replacementProductId: d.replacementProductId });
    devsPorCliente.set(uid, lista);
  }

  const saida = new Map<string, Perfil>();
  for (const [userId, lista] of porCliente) {
    saida.set(userId, montarPerfil(lista, devsPorCliente.get(userId) || [], agora));
  }
  return saida;
}
