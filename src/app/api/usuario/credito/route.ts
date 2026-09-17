export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saldoDaCliente } from "@/lib/credito";

/**
 * Saldo de crédito de quem está logada.
 *
 * O dono do saldo vem SEMPRE da sessão, nunca de nome ou telefone digitado. No
 * checkout sem login a loja casa a cliente pelo telefone, e isso é bom para
 * reaproveitar cadastro — mas seria péssimo para dinheiro: quem soubesse o
 * telefone de alguém gastaria o crédito dela.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ saldo: 0, logada: false });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ saldo: 0, logada: false });

  return NextResponse.json({ saldo: await saldoDaCliente(user.id), logada: true });
}
