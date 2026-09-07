import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Apaga de uma vez os pedidos cancelados, para limpar a lista.
 *
 * A trava do status mora aqui, não na tela: a consulta só alcança pedidos
 * cancelados, então nem um erro na interface nem uma chamada fabricada
 * conseguem apagar um pedido vivo.
 *
 * Pedido cancelado não segura estoque — a devolução já aconteceu quando ele
 * foi cancelado. Por isso apagar não mexe em estoque: mexer devolveria a peça
 * duas vezes e inflaria o número.
 */
export async function DELETE() {
  const session = await auth();
  if (!session || (session.user as { role?: string } | undefined)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const cancelados = await prisma.order.findMany({
    where: { status: "cancelled" },
    select: { id: true },
  });

  if (cancelados.length === 0) return NextResponse.json({ excluidos: 0, ids: [] });

  const ids = cancelados.map(o => o.id);
  // Itens, histórico e parcelas caem junto por cascata do schema
  const { count } = await prisma.order.deleteMany({
    where: { id: { in: ids }, status: "cancelled" },
  });

  return NextResponse.json({ excluidos: count, ids });
}
