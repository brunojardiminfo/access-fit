export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { rodarRotina } from "@/lib/crm/rotina";

/**
 * O relógio da loja.
 *
 * Aceita dois chamadores: o Cron da Vercel (`Authorization: Bearer
 * <CRON_SECRET>`), que é o caminho em uso, e uma automação externa
 * (`x-api-key: <AUTOMATION_API_KEY>`), que fica disponível caso um dia haja uma.
 *
 * No plano Hobby da Vercel o Cron roda uma vez por dia, e é o suficiente: ele
 * cuida do que depende de horário (aniversário, cobrança, pós-venda), enquanto
 * abrir a tela da fila cuida do que é urgente — ver `varrerSePrecisar` em
 * lib/crm/fila.ts.
 *
 * Sem nenhuma das duas chaves configuradas no ambiente, a rota recusa tudo — o
 * que não pode acontecer é ela ficar aberta por falta de configuração.
 */

function autorizado(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const apiKey = process.env.AUTOMATION_API_KEY;

  if (cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`) return true;
  if (apiKey && req.headers.get("x-api-key") === apiKey) return true;
  return false;
}

function tipo(req: Request): "diaria" | "semanal" | "mensal" {
  const pedido = new URL(req.url).searchParams.get("tipo");
  if (pedido === "semanal" || pedido === "mensal") return pedido;

  // Sem parâmetro, o dia decide: dia 1 fecha o mês, segunda revisa a loja.
  const agora = new Date();
  const emSaoPaulo = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  if (emSaoPaulo.getDate() === 1) return "mensal";
  if (emSaoPaulo.getDay() === 1) return "semanal";
  return "diaria";
}

async function executar(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    return NextResponse.json(await rodarRotina(tipo(req)));
  } catch (erro) {
    console.error("[rotina] falhou:", erro);
    return NextResponse.json({ error: "Falha ao rodar a rotina" }, { status: 500 });
  }
}

export const GET = executar;
export const POST = executar;
