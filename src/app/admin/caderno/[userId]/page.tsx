import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import CadernoDetalheClient from "./CadernoDetalheClient";

export const dynamic = 'force-dynamic';

export default async function CadernoDetalhePage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin") redirect("/");

  const { userId } = await params;

  const [user, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true } }),
    prisma.order.findMany({
      where: { userId, status: { not: "cancelled" } },
      include: {
        items: { include: { product: { select: { name: true } } } },
        installments: { orderBy: { number: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) redirect("/admin/caderno");

  // O cliente recebe datas como texto: Date nao atravessa a fronteira do servidor.
  const paraTela = orders.map(o => ({
    id: o.id,
    total: o.total,
    amountPaid: o.amountPaid,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    dueDate: o.dueDate ? o.dueDate.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
    notes: o.notes,
    items: o.items.map(i => ({
      id: i.id, quantity: i.quantity, price: i.price, size: i.size,
      componentName: i.componentName, product: i.product,
    })),
    installments: o.installments.map(p => ({
      id: p.id, number: p.number, amount: p.amount,
      dueDate: p.dueDate.toISOString(), status: p.status,
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    })),
  }));

  return <CadernoDetalheClient user={user} orders={paraTela} />;
}
