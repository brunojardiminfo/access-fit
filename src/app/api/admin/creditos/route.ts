export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/crm/guard";
import {
  abaterNoCaderno, concederCredito, devolverEmDinheiro, extratoDaCliente,
  MOTIVOS_DE_ENTRADA, passivoDaLoja, usarNaCompra,
} from "@/lib/credito";

const NEGADO = NextResponse.json({ error: "Não autorizado" }, { status: 401 });

export async function GET(req: Request) {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json(await passivoDaLoja());

  return NextResponse.json({
    ...(await extratoDaCliente(userId)),
    motivos: MOTIVOS_DE_ENTRADA,
  });
}

/**
 * Um endpoint, quatro ações — porque as quatro mexem no mesmo extrato e
 * precisam das mesmas checagens de saldo.
 */
export async function POST(req: Request) {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const { acao, userId, valor, kind, note, orderId, returnId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Cliente obrigatório" }, { status: 400 });

  const numero = Number(valor);
  if (!Number.isFinite(numero)) return NextResponse.json({ error: "Valor inválido" }, { status: 400 });

  const autor = sessao.nome;
  const r =
    acao === "usar" ? await usarNaCompra(userId, orderId, numero, autor)
    : acao === "abater-caderno" ? await abaterNoCaderno(userId, numero, autor)
    : acao === "devolver-dinheiro" ? await devolverEmDinheiro(userId, numero, note || "", autor)
    : await concederCredito({ userId, valor: numero, kind, note, orderId, returnId, autor });

  if (!r.ok) return NextResponse.json({ error: r.erro }, { status: 400 });
  return NextResponse.json(r);
}
