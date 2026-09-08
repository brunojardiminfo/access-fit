import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LinkLookClient from "./LinkLookClient";

export const dynamic = "force-dynamic";

export default async function LinkLookPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "admin") redirect("/");

  return (
    <div style={{ backgroundColor: "#FAF6EE", minHeight: "100vh", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <a href="/admin" style={{ color: "#b8891a", fontSize: "0.875rem", textDecoration: "none" }}>← Admin</a>
        <h1 style={{ color: "#1a1510", fontSize: "2rem", fontWeight: 900, marginTop: "0.3rem" }}>🔗 Link do Look</h1>
        <p style={{ color: "#9a8060", fontSize: "0.875rem", marginTop: "0.5rem", marginBottom: "1.75rem" }}>
          Monte a sacola com as peças que a modelo está usando e gere um link só,
          para o story. Quem abrir vê o look pronto e leva tudo de uma vez.
        </p>
        <LinkLookClient />
      </div>
    </div>
  );
}
