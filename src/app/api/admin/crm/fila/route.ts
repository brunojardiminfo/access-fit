export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/crm/guard";
import { filaDoDia, concluirTarefa, adiarTarefa } from "@/lib/crm/fila";
import { prisma } from "@/lib/prisma";
import { varrer } from "@/lib/crm/tarefas";

const NEGADO = NextResponse.json({ error: "Não autorizado" }, { status: 401 });

export async function GET(req: Request) {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const filtro = new URL(req.url).searchParams.get("tipo") || undefined;
  return NextResponse.json(await filaDoDia(new Date(), filtro));
}

/** Varredura sob demanda, para quando voce nao quer esperar a rotina da manha. */
export async function POST() {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const resultado = await varrer();
  await prisma.crmRun.create({
    data: { kind: "manual", criadas: resultado.criadas, fechadas: resultado.fechadas },
  });
  return NextResponse.json(resultado);
}

export async function PUT(req: Request) {
  const sessao = await exigirAdmin();
  if (!sessao.ok) return NEGADO;

  const { id, acao, anotacao, resultado, dias } = await req.json();
  if (!id) return NextResponse.json({ error: "Tarefa não informada" }, { status: 400 });

  if (acao === "adiar") {
    return NextResponse.json(await adiarTarefa(id, Number(dias) || 3));
  }
  if (acao === "descartar") {
    return NextResponse.json(
      await prisma.crmTask.update({ where: { id }, data: { status: "descartada", doneAt: new Date() } }),
    );
  }

  const feita = await concluirTarefa(id, { anotacao, resultado, autor: sessao.nome });
  if (!feita) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });
  return NextResponse.json(feita);
}
