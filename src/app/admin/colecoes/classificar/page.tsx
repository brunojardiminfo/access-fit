import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ClassificarPecas from "@/components/admin/ClassificarPecas";

export default async function ClassificarPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin") redirect("/");

  const [produtos, colecoes] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        papel: true,
        colors: true,
        category: { select: { name: true } },
        collections: { select: { collectionId: true } },
      },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.collection.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true, sazonal: true },
      orderBy: [{ sazonal: "asc" }, { ordem: "asc" }, { name: "asc" }],
    }),
  ]);

  // colors é texto JSON digitado no admin; peça com campo torto não pode
  // derrubar a tela inteira, então cai em lista vazia e segue.
  const lerCores = (bruto: string): string[] => {
    try {
      const v = JSON.parse(bruto);
      return Array.isArray(v) ? v.filter(x => typeof x === "string") : [];
    } catch {
      return [];
    }
  };

  const pecas = produtos.map(p => ({
    id: p.id,
    name: p.name,
    papel: p.papel,
    categoria: p.category.name,
    cores: lerCores(p.colors),
    colecaoIds: p.collections.map(c => c.collectionId),
  }));

  const categorias = [...new Set(pecas.map(p => p.categoria))].sort();

  if (!colecoes.length) {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <a href="/admin/colecoes" style={{ color: "#b8891a", fontSize: "0.875rem", textDecoration: "none" }}>← Coleções</a>
        <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.15)", borderRadius: "1rem", padding: "2.5rem", textAlign: "center", marginTop: "1rem" }}>
          <p style={{ color: "#1a1510", fontWeight: 700 }}>Nenhuma coleção criada ainda.</p>
          <p style={{ color: "#9a8060", fontSize: "0.85rem", marginTop: "0.4rem" }}>
            Crie os universos primeiro — aí você classifica as peças.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <a href="/admin/colecoes" style={{ color: "#b8891a", fontSize: "0.875rem", textDecoration: "none" }}>← Coleções</a>
        <h1 style={{ color: "#1a1510", fontSize: "1.5rem", fontWeight: 900, marginTop: "0.4rem" }}>Classificar peças</h1>
        <p style={{ color: "#9a8060", fontSize: "0.85rem", marginTop: "0.2rem", lineHeight: 1.5 }}>
          Marque várias peças, aplique a coleção de uma vez e salve tudo no fim.
          Nada é gravado até você clicar em salvar.
        </p>
      </div>
      <ClassificarPecas pecas={pecas} colecoes={colecoes} categorias={categorias} />
    </div>
  );
}
