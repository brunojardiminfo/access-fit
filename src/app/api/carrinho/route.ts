export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_ITENS = 40;

function texto(v: unknown, max = 120): string | undefined {
  if (typeof v !== "string") return undefined;
  const limpo = v.trim().slice(0, max);
  return limpo || undefined;
}

/**
 * Registra a sacola de uma visita. Público, porque quem chama é a loja.
 *
 * Nunca derruba a compra: qualquer problema aqui responde ok e segue. Uma
 * sacola não registrada custa um contato perdido; um erro no caminho da
 * compra custa a venda.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId = texto(body?.sessionId, 80);
    if (!sessionId) return NextResponse.json({ ok: true });

    const itens = Array.isArray(body?.itens) ? body.itens.slice(0, MAX_ITENS) : [];
    const pecas = itens.reduce((s: number, i: { quantidade?: number }) => s + Math.max(1, Number(i?.quantidade) || 1), 0);
    const total = Number(body?.total) || 0;

    // Sacola esvaziada sem nunca ter tido contato: apaga em vez de guardar
    // uma linha vazia que não serve para nada
    if (itens.length === 0) {
      const existente = await prisma.cartLead.findUnique({ where: { sessionId }, select: { name: true, phone: true } });
      if (existente && !existente.name && !existente.phone) {
        await prisma.cartLead.delete({ where: { sessionId } }).catch(() => {});
        return NextResponse.json({ ok: true });
      }
    }

    const contato = {
      ...(texto(body?.nome) ? { name: texto(body?.nome) } : {}),
      ...(texto(body?.telefone, 40) ? { phone: texto(body?.telefone, 40) } : {}),
      ...(texto(body?.email) ? { email: texto(body?.email) } : {}),
    };

    await prisma.cartLead.upsert({
      where: { sessionId },
      update: { items: JSON.stringify(itens), total, pecas, ...contato },
      create: { sessionId, items: JSON.stringify(itens), total, pecas, ...contato },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
