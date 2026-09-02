import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PedidosClient from "./PedidosClient";

export const dynamic = 'force-dynamic';

export default async function PedidosPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") redirect("/");

  const [orders, customers] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        address: true,
        items: { include: { product: { select: { id: true, name: true, costPrice: true } } } },
        installments: { orderBy: { number: "asc" } },
        statusHistory: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.user.findMany({
      where: { role: "customer" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <PedidosClient orders={orders as any} customers={customers} />;
}
