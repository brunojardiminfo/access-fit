export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { redividirSaldo } from "@/lib/parcelas";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { orderId, vezes, primeiroVencimento, intervaloEmMeses } = await req.json();
  if (!orderId || !primeiroVencimento)
    return NextResponse.json({ error: "Pedido e primeiro vencimento são obrigatórios" }, { status: 400 });

  const data = new Date(primeiroVencimento);
  if (Number.isNaN(data.getTime()))
    return NextResponse.json({ error: "Data de vencimento inválida" }, { status: 400 });

  const r = await redividirSaldo({
    orderId,
    vezes: Number(vezes) || 1,
    primeiroVencimento: data,
    intervaloEmMeses: Number(intervaloEmMeses) || 1,
  });
  if ("erro" in r) return NextResponse.json({ error: r.erro }, { status: 400 });
  return NextResponse.json(r);
}
