export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { receberNasParcelas } from "@/lib/parcelas";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { orderId, valor, metodo } = await req.json();
  if (!orderId || !valor)
    return NextResponse.json({ error: "Pedido e valor são obrigatórios" }, { status: 400 });

  const r = await receberNasParcelas(orderId, Number(valor), metodo || "pix");
  if ("erro" in r) return NextResponse.json({ error: r.erro }, { status: 400 });
  return NextResponse.json(r);
}
