import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ColecaoManager from "@/components/admin/ColecaoManager";

export default async function ColecoesPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") redirect("/");

  const colecoes = await prisma.collection.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sazonal: "asc" }, { ordem: "asc" }, { name: "asc" }],
  });

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <a href="/admin" style={{ color: "#b8891a", fontSize: "0.875rem", textDecoration: "none" }}>← Admin</a>
        <h1 style={{ color: "#1a1510", fontSize: "1.5rem", fontWeight: 900, marginTop: "0.4rem" }}>Coleções</h1>
        <p style={{ color: "#9a8060", fontSize: "0.85rem", marginTop: "0.2rem", lineHeight: 1.5 }}>
          Coleção não substitui categoria. Uma legging continua em Leggings e ganha o universo por cima
          — e pode estar num universo e numa cápsula ao mesmo tempo.
        </p>
      </div>
      <ColecaoManager colecoes={colecoes} />
    </div>
  );
}
