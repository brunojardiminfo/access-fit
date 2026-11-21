import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ParceirasClient from "./ParceirasClient";

export const dynamic = "force-dynamic";

export default async function ParceirasPage() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin") redirect("/");

  /**
   * Cliente e cupom vêm prontos do banco, para a tela não pedir de novo o que
   * a loja já sabe.
   *
   * O telefone vem junto: digitar o WhatsApp à mão é onde um dígito errado
   * manda o resumo da parceria para um desconhecido.
   */
  const [clientes, cupons, jaUsados] = await Promise.all([
    prisma.user.findMany({
      where: { role: "customer" },
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { name: "asc" },
    }),
    prisma.coupon.findMany({
      where: { active: true },
      select: { code: true, discount: true, type: true },
      orderBy: { code: "asc" },
    }),
    prisma.parceira.findMany({ select: { codigo: true } }),
  ]);

  // Cupom que já é de outra parceira não aparece na lista: dois crachás com o
  // mesmo código fariam as vendas de uma contar para as duas.
  const tomados = new Set(jaUsados.map(p => p.codigo));

  return (
    <ParceirasClient
      clientes={clientes}
      cupons={cupons.filter(c => !tomados.has(c.code))}
    />
  );
}
