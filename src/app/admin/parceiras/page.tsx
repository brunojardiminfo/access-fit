import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ParceirasClient from "./ParceirasClient";

export const dynamic = "force-dynamic";

export default async function ParceirasPage() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin") redirect("/");

  // Só quem pode receber crédito: a conta dela na loja é onde o cashback vira
  // saldo gastável.
  const clientes = await prisma.user.findMany({
    where: { role: "customer" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return <ParceirasClient clientes={clientes} />;
}
