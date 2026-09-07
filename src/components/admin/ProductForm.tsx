"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";
import EstoquePorVariacao from "@/components/admin/EstoquePorVariacao";
import { parseEstoque, totalDoEstoque } from "@/lib/variacoes";

type Category = { id: string; name: string };
type Product = {
  id: string; name: string; slug: string; description: string | null;
  price: number; costPrice: number | null; compareAt: number | null; images: string;
  sizes: string; colors: string; stock: number; sizeStock: string;
  featuredHero: boolean; featured: boolean; isConjunto: boolean; sellComponentsSeparately: boolean; active: boolean; categoryId: string;
};
type ConjuntoItemForm = { name: string; price: number; quantity: number; stock: number };

const field: React.CSSProperties = {
  width: "100%", padding: "0.7rem 0.875rem",
  backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.25)",
  borderRadius: "0.625rem", color: "#1a1510", fontSize: "0.875rem",
  outline: "none", boxSizing: "border-box",
};
const label: React.CSSProperties = {
  display: "block", color: "#7a5a20", fontSize: "0.78rem",
  fontWeight: 700, marginBottom: "0.35rem", letterSpacing: "0.02em",
};
const card: React.CSSProperties = {
  backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.12)",
  borderRadius: "1rem", padding: "1.25rem 1.5rem",
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

interface ProductFormProps {
  categories: Category[];
  product?: Product;
  kitItems?: Array<{ name: string; price: number; quantity: number }>;
}

export default function ProductForm({ categories, product, kitItems: initialKitItems = [] }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const [conjuntoItems, setConjuntoItems] = useState<ConjuntoItemForm[]>(
    initialKitItems.map(item => ({ name: (item as any).name, price: (item as any).price, quantity: item.quantity, stock: (item as any).stock || 0 }))
  );
  const [newConjuntoName, setNewConjuntoName] = useState("");
  const [newConjuntoPrice, setNewConjuntoPrice] = useState("");
  const [newConjuntoStock, setNewConjuntoStock] = useState("0");

  // Estoque por variação (cor + tamanho). Chave sem cor é lançamento antigo,
  // preservado como está para nenhum número sumir.
  const [sizeStockMap, setSizeStockMap] = useState<Record<string, number>>(
    parseEstoque(product?.sizeStock)
  );

  const [form, setForm] = useState({
    name: product?.name || "",
    slug: product?.slug || "",
    description: product?.description || "",
    price: product?.price?.toString() || "",
    costPrice: product?.costPrice?.toString() || "",
    compareAt: product?.compareAt?.toString() || "",
    images: product?.images ? JSON.parse(product.images).join("\n") : "",
    sizes: product?.sizes ? JSON.parse(product.sizes).join(", ") : "PP, P, M, G, GG",
    colors: product?.colors ? JSON.parse(product.colors).join(", ") : "",
    stock: product?.stock?.toString() || "0",
    featuredHero: product?.featuredHero || false,
    featured: product?.featured || false,
    isConjunto: product?.isConjunto || false,
    sellComponentsSeparately: product?.sellComponentsSeparately || false,
    active: product?.active ?? true,
    categoryId: product?.categoryId || categories[0]?.id || "",
  });

  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = "#b8891a";
    e.target.style.boxShadow = "0 0 0 3px rgba(184,137,26,0.12)";
  };
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = "rgba(140,100,20,0.25)";
    e.target.style.boxShadow = "none";
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImg(true);
    const newPaths: string[] = [];

    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        newPaths.push(data.url || data.path);
      }
    }

    setUploadingImg(false);
    if (newPaths.length > 0) {
      const existing = form.images.trim();
      setForm({ ...form, images: existing ? existing + "\n" + newPaths.join("\n") : newPaths.join("\n") });
    }
  };

  const handleAddConjuntoItem = () => {
    if (!newConjuntoName || !newConjuntoPrice) {
      setError("Preencha nome e preço do componente");
      return;
    }
    const price = parseFloat(newConjuntoPrice);
    const stock = Math.max(0, parseInt(newConjuntoStock) || 0);
    if (isNaN(price) || price <= 0) {
      setError("Preço deve ser um número maior que 0");
      return;
    }
    setConjuntoItems([...conjuntoItems, { name: newConjuntoName, price, quantity: 1, stock }]);
    setNewConjuntoName("");
    setNewConjuntoPrice("");
    setNewConjuntoStock("0");
    setError("");
  };

  const handleRemoveConjuntoItem = (index: number) => {
    setConjuntoItems(conjuntoItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const sizesArr = form.sizes.split(",").map((s: string) => s.trim()).filter(Boolean);
    const temVariacao = Object.keys(sizeStockMap).length > 0;

    const body = {
      ...form,
      price: parseFloat(form.price),
      costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
      compareAt: form.compareAt ? parseFloat(form.compareAt) : null,
      // O estoque por variação manda no total quando existe; sem ele, vale o
      // número digitado no campo simples
      stock: temVariacao ? totalDoEstoque(sizeStockMap) : parseInt(form.stock),
      sizeStock: temVariacao ? JSON.stringify(sizeStockMap) : "{}",
      images: JSON.stringify(form.images.split("\n").map((s: string) => s.trim()).filter(Boolean)),
      sizes: JSON.stringify(sizesArr),
      colors: JSON.stringify(form.colors.split(",").map((s: string) => s.trim()).filter(Boolean)),
      ...(form.isConjunto && { conjuntoItems: conjuntoItems.map(k => ({ name: k.name, price: k.price, quantity: k.quantity, stock: k.stock })) }),
    };

    const res = await fetch(
      product ? `/api/admin/produtos/${product.id}` : "/api/admin/produtos",
      { method: product ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );

    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Erro ao salvar."); return; }
    router.push("/admin/produtos");
    router.refresh();
  };

  const imageList = form.images.split("\n").map((s: string) => s.trim()).filter(Boolean);
  const sizesList = form.sizes.split(",").map((s: string) => s.trim()).filter(Boolean);
  const coresList = form.colors.split(",").map((c: string) => c.trim()).filter(Boolean);
  const temVariacaoLancada = Object.keys(sizeStockMap).length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{ backgroundColor: "#fee8e8", border: "1px solid rgba(192,64,64,0.3)", color: "#c04040", fontSize: "0.875rem", padding: "0.875rem 1rem", borderRadius: "0.75rem" }}>
          {error}
        </div>
      )}

      {/* Informações básicas */}
      <div style={card}>
        <h2 style={{ color: "#1a1510", fontWeight: 800, fontSize: "0.95rem", marginBottom: "1rem" }}>Informações Básicas</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={label}>Nome do Produto *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: product ? form.slug : slugify(e.target.value) })} required placeholder="Ex: Legging Sculpt Cintura Alta" style={field} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={label}>Categoria *</label>
            <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} style={field} onFocus={focus} onBlur={blur}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Slug (URL)</label>
            <input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} style={{ ...field, fontFamily: "monospace", fontSize: "0.8rem" }} onFocus={focus} onBlur={blur} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={label}>Descrição</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...field, resize: "vertical" }} onFocus={focus} onBlur={blur} />
          </div>
        </div>
      </div>

      {/* Preço e estoque */}
      <div style={card}>
        <h2 style={{ color: "#1a1510", fontWeight: 800, fontSize: "0.95rem", marginBottom: "1rem" }}>Preço e Estoque</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={label}>Preço de Venda (R$) *</label>
            <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required placeholder="149.90" style={field} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={label}>Preço de Custo (R$)</label>
            <input type="number" step="0.01" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} placeholder="60.00" style={field} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={label}>Preço Original (desconto)</label>
            <input type="number" step="0.01" value={form.compareAt} onChange={e => setForm({ ...form, compareAt: e.target.value })} placeholder="189.90" style={field} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={label}>Qtd em Estoque{temVariacaoLancada && " (soma das variações)"}</label>
            <input type="number" value={temVariacaoLancada ? totalDoEstoque(sizeStockMap) : form.stock}
              onChange={e => setForm({ ...form, stock: e.target.value })}
              readOnly={temVariacaoLancada}
              style={{ ...field, ...(temVariacaoLancada && { backgroundColor: "#F0E8D0", color: "#7a5a20", fontWeight: 700, cursor: "default" }) }}
              onFocus={focus} onBlur={blur} />
          </div>
        </div>
      </div>

      {/* Variações */}
      <div style={card}>
        <h2 style={{ color: "#1a1510", fontWeight: 800, fontSize: "0.95rem", marginBottom: "1rem" }}>Variações</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={label}>Tamanhos (separados por vírgula)</label>
            <input type="text" value={form.sizes} onChange={e => setForm({ ...form, sizes: e.target.value })} placeholder="PP, P, M, G, GG" style={field} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={label}>Cores (separadas por vírgula)</label>
            <input type="text" value={form.colors} onChange={e => setForm({ ...form, colors: e.target.value })} placeholder="Preto, Rosa, Branco" style={field} onFocus={focus} onBlur={blur} />
          </div>
        </div>

        {(sizesList.length > 0 || coresList.length > 0) && (
          <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid rgba(140,100,20,0.1)" }}>
            <label style={label}>Estoque por Cor e Tamanho</label>
            <EstoquePorVariacao
              cores={coresList}
              tamanhos={sizesList}
              estoque={sizeStockMap}
              onChange={setSizeStockMap}
            />
          </div>
        )}
      </div>

      {/* Fotos */}
      <div style={card}>
        <h2 style={{ color: "#1a1510", fontWeight: 800, fontSize: "0.95rem", marginBottom: "1rem" }}>Fotos do Produto</h2>

        {/* Upload */}
        <div
          onClick={() => imgInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleImageUpload(e.dataTransfer.files); }}
          style={{ border: "2px dashed rgba(184,137,26,0.35)", borderRadius: "0.875rem", padding: "2rem", textAlign: "center", cursor: "pointer", backgroundColor: "#FAF6EE", marginBottom: "1rem" }}>
          {uploadingImg ? (
            <p style={{ color: "#b8891a", fontWeight: 700 }}>Enviando fotos...</p>
          ) : (
            <>
              <p style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>📸</p>
              <p style={{ color: "#5a4a2a", fontWeight: 600, fontSize: "0.9rem" }}>Clique ou arraste as fotos aqui</p>
              <p style={{ color: "#9a8060", fontSize: "0.78rem", marginTop: "0.25rem" }}>JPG, PNG, WEBP · Várias fotos de uma vez</p>
            </>
          )}
          <input ref={imgInputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={e => handleImageUpload(e.target.files)} />
        </div>

        {/* Preview */}
        {imageList.length > 0 && (
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {imageList.map((src: string, i: number) => (
              <div key={i} style={{ position: "relative" }}>
                <img src={src} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "0.5rem", border: "1px solid rgba(140,100,20,0.15)" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <button type="button" onClick={() => {
                  const list = form.images.split("\n").map((s: string) => s.trim()).filter(Boolean);
                  list.splice(i, 1);
                  setForm({ ...form, images: list.join("\n") });
                }} style={{ position: "absolute", top: -6, right: -6, backgroundColor: "#c04040", color: "#fff", border: "none", borderRadius: "999px", width: 18, height: 18, fontSize: "0.65rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <label style={label}>URLs das fotos (uma por linha)</label>
        <textarea value={form.images} onChange={e => setForm({ ...form, images: e.target.value })} rows={3}
          placeholder="/produtos/nome-da-foto.jpg" style={{ ...field, resize: "vertical", fontFamily: "monospace", fontSize: "0.78rem" }} onFocus={focus} onBlur={blur} />
      </div>

      {/* Visibilidade */}
      <div style={card}>
        <h2 style={{ color: "#1a1510", fontWeight: 800, fontSize: "0.95rem", marginBottom: "1rem" }}>Visibilidade</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[
            { key: "featuredHero", label: "Destaque no Hero (primeiros 4 da home)", emoji: "🎯" },
            { key: "featured", label: "Destaque na seção Destaques", emoji: "⭐" },
            { key: "isConjunto", label: "É um Conjunto (pode ter várias peças)", emoji: "📦" },
            { key: "active", label: "Produto ativo (visível na loja)", emoji: "👁️" },
          ].map(({ key, label: lbl, emoji }) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" }}>
              <input type="checkbox" checked={form[key as "featuredHero" | "featured" | "isConjunto" | "active"]}
                onChange={e => setForm({ ...form, [key]: e.target.checked })}
                style={{ width: "1.1rem", height: "1.1rem", accentColor: "#b8891a" }} />
              <span style={{ color: "#3a2a10", fontSize: "0.875rem", fontWeight: 600 }}>{emoji} {lbl}</span>
            </label>
          ))}
          {form.isConjunto && (
            <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" }}>
              <input type="checkbox" checked={form.sellComponentsSeparately}
                onChange={e => setForm({ ...form, sellComponentsSeparately: e.target.checked })}
                style={{ width: "1.1rem", height: "1.1rem", accentColor: "#b8891a" }} />
              <span style={{ color: "#3a2a10", fontSize: "0.875rem", fontWeight: 600 }}>💰 Vender componentes separados</span>
            </label>
          )}
        </div>
      </div>

      {/* Componentes do Conjunto */}
      {form.isConjunto && (
        <div style={card}>
          <h2 style={{ color: "#1a1510", fontWeight: 800, fontSize: "0.95rem", marginBottom: "1rem" }}>📦 Componentes do Conjunto</h2>

          {/* Lista de componentes */}
          {conjuntoItems.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#5a4a2a", marginBottom: "0.75rem", textTransform: "uppercase" }}>
                Componentes ({conjuntoItems.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {conjuntoItems.map((item, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", backgroundColor: "#FAF6EE", borderRadius: "0.5rem", border: "1px solid rgba(140,100,20,0.1)" }}>
                    <div>
                      <p style={{ fontWeight: 600, color: "#1a1510", fontSize: "0.9rem" }}>
                        {item.name}
                      </p>
                      <p style={{ fontSize: "0.8rem", color: "#9a8060" }}>R$ {item.price.toFixed(2)} · Estoque: {item.stock}</p>
                    </div>
                    <button type="button" onClick={() => handleRemoveConjuntoItem(idx)} style={{ padding: "0.5rem 1rem", backgroundColor: "#fee8e8", color: "#c04040", border: "1px solid rgba(192,64,64,0.2)", borderRadius: "0.4rem", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}>
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adicionar componente */}
          <div style={{ borderTop: conjuntoItems.length > 0 ? "1px solid rgba(140,100,20,0.1)" : "none", paddingTop: conjuntoItems.length > 0 ? "1.5rem" : "0" }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#5a4a2a", marginBottom: "0.75rem", textTransform: "uppercase" }}>Adicionar Componente</h3>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: "150px" }}>
                <label style={label}>Nome (ex: Short, Top)</label>
                <input type="text" value={newConjuntoName} onChange={e => setNewConjuntoName(e.target.value)} placeholder="Short, Top, Calça..." style={field} onFocus={focus} onBlur={blur} />
              </div>
              <div style={{ width: "110px" }}>
                <label style={label}>Preço (R$)</label>
                <input type="number" step="0.01" value={newConjuntoPrice} onChange={e => setNewConjuntoPrice(e.target.value)} placeholder="69.90" style={field} onFocus={focus} onBlur={blur} />
              </div>
              <div style={{ width: "80px" }}>
                <label style={label}>Estoque</label>
                <input type="number" min="0" value={newConjuntoStock} onChange={e => setNewConjuntoStock(e.target.value)} style={field} onFocus={focus} onBlur={blur} />
              </div>
              <button type="button" onClick={handleAddConjuntoItem} style={{ padding: "0.75rem 1.5rem", backgroundColor: "#b8891a", color: "#fff", border: "none", borderRadius: "0.5rem", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}>
                ✅ Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botões */}
      <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap", alignItems: "center" }}>
        <button type="submit" form="product-form" disabled={loading} onClick={handleSubmit as any}
          style={{ padding: "0.875rem 2.5rem", backgroundColor: loading ? "#9a7030" : "#b8891a", color: "#fff", fontWeight: 900, border: "none", borderRadius: "0.75rem", cursor: loading ? "not-allowed" : "pointer", fontSize: "0.95rem" }}>
          {loading ? "Salvando..." : product ? "💾 Salvar Alterações" : "✓ Criar Produto"}
        </button>
        <a href="/admin/produtos" style={{ padding: "0.875rem 1.5rem", border: "1px solid rgba(140,100,20,0.25)", color: "#7a5a20", borderRadius: "0.75rem", textDecoration: "none", fontSize: "0.875rem", display: "inline-flex", alignItems: "center", fontWeight: 600 }}>
          Cancelar
        </a>
        {product && (
          <button type="button" disabled={deleting}
            onClick={async () => {
              if (!confirm(`Excluir "${product.name}"? Esta ação não pode ser desfeita.`)) return;
              setDeleting(true);
              const res = await fetch(`/api/admin/produtos/${product.id}`, { method: "DELETE" });
              if (res.ok) { router.push("/admin/produtos"); }
              else { setError("Erro ao excluir produto."); setDeleting(false); }
            }}
            style={{ marginLeft: "auto", padding: "0.875rem 1.5rem", backgroundColor: deleting ? "#f0d0d0" : "#fee8e8", color: "#c04040", border: "1px solid rgba(192,64,64,0.25)", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.875rem", cursor: deleting ? "not-allowed" : "pointer" }}>
            {deleting ? "Excluindo..." : "🗑️ Excluir Produto"}
          </button>
        )}
      </div>
    </div>
  );
}
