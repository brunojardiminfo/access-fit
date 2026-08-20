"use client";
import { useState, useMemo } from "react";
import { formatCurrency, parseJson } from "@/lib/utils";
import BulkEditModal from "./BulkEditModal";

type Category = { id: string; name: string; slug: string };
type Product = {
  id: string; name: string; price: number; costPrice: number | null;
  stock: number; active: boolean; images: string; sizes: string; colors: string;
  category: Category;
};

export default function AdminProdutosClient({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ativo");
  const [sizeFilter, setSizeFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Todos os tamanhos únicos disponíveis
  const allSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => parseJson<string[]>(p.sizes, []).forEach(s => set.add(s)));
    return [...set].sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (catFilter && p.category.id !== catFilter) return false;
      if (statusFilter === "ativo" && !p.active) return false;
      if (statusFilter === "inativo" && p.active) return false;
      if (statusFilter === "sem_estoque" && p.stock > 0) return false;
      if (statusFilter === "estoque_baixo" && (p.stock === 0 || p.stock > 5)) return false;
      if (sizeFilter && !parseJson<string[]>(p.sizes, []).includes(sizeFilter)) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [products, catFilter, statusFilter, sizeFilter, search]);

  const totalValor = filtered.reduce((a, p) => a + p.price * p.stock, 0);
  const totalUnidades = filtered.reduce((a, p) => a + p.stock, 0);
  const semEstoque = filtered.filter(p => p.stock === 0).length;
  const estoqueBaixo = filtered.filter(p => p.stock > 0 && p.stock <= 5).length;

  const inp = { padding: "0.55rem 0.875rem", border: "1px solid rgba(140,100,20,0.25)", borderRadius: "0.625rem", fontSize: "0.8rem", backgroundColor: "#FAF6EE", outline: "none" };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <a href="/admin" style={{ color: "#b8891a", fontSize: "0.875rem", textDecoration: "none" }}>← Admin</a>
          <h1 style={{ color: "#1a1510", fontSize: "1.75rem", fontWeight: 900, marginTop: "0.2rem" }}>Produtos</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a href="/admin/produtos/novo" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", backgroundColor: "#b8891a", color: "#fff", fontWeight: 700, fontSize: "0.875rem", padding: "0.6rem 1.25rem", borderRadius: "0.75rem", textDecoration: "none" }}>
            + Novo Produto
          </a>
          <a href="/admin/produtos-sem-custo" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", backgroundColor: "#c04040", color: "#fff", fontWeight: 700, fontSize: "0.875rem", padding: "0.6rem 1.25rem", borderRadius: "0.75rem", textDecoration: "none" }}>
            ⚠️ Sem Custo
          </a>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        {[
          { emoji: "📦", label: "Produtos", value: filtered.length + (filtered.length < products.length ? ` / ${products.length}` : "") },
          { emoji: "💰", label: "Valor em Estoque", value: formatCurrency(totalValor) },
          { emoji: "🔢", label: "Unidades", value: totalUnidades },
          { emoji: "⚠️", label: "Estoque Baixo", value: estoqueBaixo, warn: estoqueBaixo > 0 },
          { emoji: "❌", label: "Sem Estoque", value: semEstoque, warn: semEstoque > 0 },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: "#fff", border: `1px solid ${(s as any).warn ? "rgba(192,64,64,0.25)" : "rgba(140,100,20,0.1)"}`, borderRadius: "0.875rem", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "1.25rem", marginBottom: "0.4rem" }}>{s.emoji}</div>
            <div style={{ color: "#1a1510", fontSize: "1.4rem", fontWeight: 900 }}>{s.value}</div>
            <div style={{ color: "#9a8060", fontSize: "0.75rem", marginTop: "0.2rem" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)", borderRadius: "1rem", padding: "1rem 1.25rem", marginBottom: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text" placeholder="🔍 Buscar produto..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inp, minWidth: 200, flex: 1 }}
        />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...inp, minWidth: 180 }}>
          <option value="">Todas as categorias</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inp, minWidth: 160 }}>
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
          <option value="sem_estoque">Sem estoque</option>
          <option value="estoque_baixo">Estoque baixo</option>
        </select>
        {products.some(p => !p.active) && (
          <button onClick={() => setStatusFilter(statusFilter === "inativo" ? "ativo" : "inativo")}
            title="Produtos inativos nao aparecem na loja, mas continuam aqui"
            style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.55rem 0.875rem", borderRadius: "0.625rem", border: "1px solid rgba(140,100,20,0.2)", cursor: "pointer", whiteSpace: "nowrap", backgroundColor: statusFilter === "inativo" ? "#b8891a" : "#FAF6EE", color: statusFilter === "inativo" ? "#fff" : "#9a8060" }}>
            🚫 Ocultos do site ({products.filter(p => !p.active).length})
          </button>
        )}
        {allSizes.length > 0 && (
          <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} style={{ ...inp, minWidth: 120 }}>
            <option value="">Todos tamanhos</option>
            {allSizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {(search || catFilter || statusFilter !== "ativo" || sizeFilter) && (
          <button onClick={() => { setSearch(""); setCatFilter(""); setStatusFilter("ativo"); setSizeFilter(""); }}
            style={{ backgroundColor: "#FAF6EE", border: "1px solid rgba(140,100,20,0.2)", color: "#9a8060", fontWeight: 700, fontSize: "0.75rem", padding: "0.55rem 0.875rem", borderRadius: "0.625rem", cursor: "pointer", whiteSpace: "nowrap" }}>
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Bulk Edit Bar */}
      {selected.size > 0 && (
        <div style={{ backgroundColor: "rgba(184,137,26,0.08)", border: "1px solid rgba(184,137,26,0.3)", borderRadius: "1rem", padding: "1rem 1.25rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <span style={{ fontWeight: 700, color: "#5a4a2a" }}>{selected.size} produto(s) selecionado(s)</span>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={() => setSelected(new Set())}
              style={{ backgroundColor: "#fff", border: "1px solid #ddd", color: "#5a4a2a", fontWeight: 700, fontSize: "0.85rem", padding: "0.6rem 1.2rem", borderRadius: "0.625rem", cursor: "pointer" }}>
              Desselecionar
            </button>
            <button onClick={() => setShowBulkEdit(true)}
              style={{ backgroundColor: "#b8891a", border: "none", color: "#fff", fontWeight: 700, fontSize: "0.85rem", padding: "0.6rem 1.2rem", borderRadius: "0.625rem", cursor: "pointer" }}>
              ⚙️ Editar em Massa
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)", borderRadius: "1rem", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#FAF6EE" }}>
                <th style={{ width: 40, padding: "0.875rem 0.75rem", borderBottom: "1px solid rgba(140,100,20,0.1)" }}>
                  <input type="checkbox" onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(filtered.map(p => p.id)));
                    else setSelected(new Set());
                  }} checked={selected.size === filtered.length && filtered.length > 0}
                    style={{ cursor: "pointer" }} />
                </th>
                {["Produto", "Categoria", "Tamanhos", "Cor", "Custo", "Preço", "Estoque", "Valor Est.", "Status", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "0.875rem 1rem", color: "#9a8060", fontWeight: 700, fontSize: "0.75rem", borderBottom: "1px solid rgba(140,100,20,0.1)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const images = parseJson<string[]>(p.images, []);
                const estoqueColor = p.stock === 0 ? "#c04040" : p.stock <= 5 ? "#b8891a" : "#2a8a2a";
                const estoqueBg = p.stock === 0 ? "#fee8e8" : p.stock <= 5 ? "#fff8e1" : "#e8f8e8";
                const isSelected = selected.has(p.id);
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid rgba(140,100,20,0.06)", backgroundColor: isSelected ? "rgba(184,137,26,0.05)" : "transparent" }}>
                    <td style={{ padding: "0.875rem 0.75rem" }}>
                      <input type="checkbox" onChange={(e) => {
                        const newSet = new Set(selected);
                        if (e.target.checked) newSet.add(p.id);
                        else newSet.delete(p.id);
                        setSelected(newSet);
                      }} checked={isSelected}
                        style={{ cursor: "pointer" }} />
                    </td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <a href={`/admin/produtos/${p.id}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ width: 40, height: 40, backgroundColor: "#F0E8D0", borderRadius: "0.5rem", overflow: "hidden", flexShrink: 0 }}>
                          {images[0] && <img src={images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                        </div>
                        <span style={{ color: "#b8891a", fontWeight: 600, fontSize: "0.875rem", textDecoration: "underline", textUnderlineOffset: "2px" }}>{p.name}</span>
                      </a>
                    </td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <span style={{ fontSize: "0.75rem", backgroundColor: "#f0e8d0", color: "#7a5a10", padding: "0.2rem 0.5rem", borderRadius: 999, whiteSpace: "nowrap" }}>
                        {p.category.name}
                      </span>
                    </td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", maxWidth: 140 }}>
                        {parseJson<string[]>(p.sizes, []).length > 0
                          ? parseJson<string[]>(p.sizes, []).map(s => (
                              <span key={s} style={{ fontSize: "0.68rem", backgroundColor: sizeFilter === s ? "#b8891a" : "#EDE4CC", color: sizeFilter === s ? "#fff" : "#6a4a10", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: 999, whiteSpace: "nowrap", border: "1px solid rgba(140,100,20,0.2)" }}>{s}</span>
                            ))
                          : <span style={{ color: "#b8a080", fontSize: "0.75rem" }}>—</span>
                        }
                      </div>
                    </td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", maxWidth: 140 }}>
                        {parseJson<string[]>(p.colors, []).length > 0
                          ? parseJson<string[]>(p.colors, []).map(c => (
                              <span key={c} style={{ fontSize: "0.68rem", backgroundColor: "#fff", color: "#5a4a2a", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: 999, whiteSpace: "nowrap", border: "1px solid rgba(140,100,20,0.2)" }}>{c}</span>
                            ))
                          : <span style={{ color: "#b8a080", fontSize: "0.75rem" }}>—</span>
                        }
                      </div>
                    </td>
                    <td style={{ padding: "0.875rem 1rem", color: "#9a8060", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                      {p.costPrice ? formatCurrency(p.costPrice) : "—"}
                    </td>
                    <td style={{ padding: "0.875rem 1rem", color: "#1a1510", fontWeight: 700, whiteSpace: "nowrap" }}>{formatCurrency(p.price)}</td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <span style={{ backgroundColor: estoqueBg, color: estoqueColor, fontWeight: 700, fontSize: "0.8rem", padding: "0.2rem 0.6rem", borderRadius: "999px" }}>
                        {p.stock} un
                      </span>
                    </td>
                    <td style={{ padding: "0.875rem 1rem", color: "#5a4a2a", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                      {formatCurrency(p.price * p.stock)}
                    </td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <span style={{ backgroundColor: p.active ? "#e8f8e8" : "#f0f0f0", color: p.active ? "#2a8a2a" : "#888", fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.625rem", borderRadius: "999px" }}>
                        {p.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <a href={`/admin/produtos/${p.id}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", backgroundColor: "#FAF6EE", border: "1px solid rgba(184,137,26,0.3)", color: "#b8891a", fontSize: "0.75rem", fontWeight: 700, padding: "0.35rem 0.75rem", borderRadius: "0.5rem", textDecoration: "none", whiteSpace: "nowrap" }}>
                        ✏️ Editar
                      </a>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: "3rem", color: "#b8a080" }}>
                    {products.length === 0
                      ? <><span>Nenhum produto cadastrado. </span><a href="/admin/importar" style={{ color: "#b8891a", fontWeight: 700 }}>Importar Excel</a></>
                      : "Nenhum produto encontrado com esses filtros."
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showBulkEdit && (
        <BulkEditModal
          selected={Array.from(selected)}
          products={filtered}
          onClose={() => setShowBulkEdit(false)}
          onSuccess={() => {
            setSelected(new Set());
            setShowBulkEdit(false);
            setRefreshKey(k => k + 1);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
