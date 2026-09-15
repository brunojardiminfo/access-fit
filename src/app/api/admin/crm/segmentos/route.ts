export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/crm/guard";
import { filtrarClientes, opcoesDeFiltro, type Condicao } from "@/lib/crm/segmentos";

const NEGADO = NextResponse.json({ error: "Não autorizado" }, { status: 401 });

export async function GET() {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;
  return NextResponse.json(await opcoesDeFiltro());
}

export async function POST(req: Request) {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const { condicoes } = await req.json();
  const lista: Condicao[] = Array.isArray(condicoes) ? condicoes.slice(0, 10) : [];
  return NextResponse.json(await filtrarClientes(lista));
}
