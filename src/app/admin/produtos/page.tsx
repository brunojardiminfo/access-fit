import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminProdutosClient from "./AdminProdutosClient";

export const dynamic = 'force-dynamic';

export default async function AdminProdutosPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") redirect("/");

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      // Inclui inativos: sem isso um produto oculto do site some tambem do admin
      where: { NOT: { slug: "venda-manual" } },
      include: { category: true }, orderBy: { name: "asc" }
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return <AdminProdutosClient products={products as any} categories={categories} />;
}
