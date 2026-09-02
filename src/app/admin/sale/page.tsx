import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SaleManagerClient from "./SaleManagerClient";
import { DIAS_PARA_SALE } from "@/lib/saleHelper";

export const dynamic = "force-dynamic";

export default async function SaleManagerPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") redirect("/");

  const today = new Date();
  const corteSale = new Date(today.getTime() - DIAS_PARA_SALE * 24 * 60 * 60 * 1000);

  let upcomingSaleProducts: any[] = [];
  let activeSaleProducts: any[] = [];

  try {
    const [upcoming, active] = await Promise.all([
      prisma.product.findMany({
        where: {
          active: true,
          createdAt: { lte: corteSale },
        },
        include: { category: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.findMany({
        where: {
          active: true,
          onSale: true,
        },
        include: { category: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    upcomingSaleProducts = upcoming;
    activeSaleProducts = active;
  } catch (err) {
    console.error("Erro ao carregar produtos:", err);
  }

  return (
    <div style={{ backgroundColor: "#FAF6EE", minHeight: "100vh", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <a href="/admin" style={{ color: "#b8891a", fontSize: "0.875rem", textDecoration: "none" }}>← Admin</a>
          <h1 style={{ color: "#1a1510", fontSize: "2rem", fontWeight: 900, marginTop: "0.3rem" }}>🔥 Gerenciador de SALE</h1>
          <p style={{ color: "#9a8060", fontSize: "0.875rem", marginTop: "0.5rem" }}>
            Toda peça com {DIAS_PARA_SALE} dias ou mais de cadastro entra em SALE de 20% na loja automaticamente.
            Use &quot;Autorizar&quot; para aplicar um desconto diferente de 20% em uma peça.
          </p>
        </div>

        <SaleManagerClient
          upcomingSaleProducts={upcomingSaleProducts}
          activeSaleProducts={activeSaleProducts}
        />
      </div>
    </div>
  );
}
