"use client";

import { useState } from "react";
import { DIAS_PARA_SALE } from "@/lib/saleHelper";

interface Product {
  id: string;
  name: string;
  price: number;
  saleDiscount: number | null;
  onSale: boolean;
  saleBlocked?: boolean;
  createdAt: string | Date;
  stock: number;
  category: { name: string };
  images?: string;
  colors?: string;
  sizes?: string;
  sizeStock?: string | null;
}

interface Props {
  upcomingSaleProducts: Product[];
  activeSaleProducts: Product[];
}

export default function SaleManagerClient({
  upcomingSaleProducts,
  activeSaleProducts,
}: Props) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "active">("upcoming");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customDiscount, setCustomDiscount] = useState(20);

  /** Tira a peça do SALE, ou devolve. É o único jeito de uma peça com os dias
      de cadastro ficar de fora: a regra por data entra sozinha. */
  const handleToggleBloqueio = async (productId: string, bloqueadaAgora: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/produtos/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleBlocked: !bloqueadaAgora, onSale: false }),
      });
      if (res.ok) {
        setMessage(bloqueadaAgora ? "✅ Peça voltou para o SALE" : "✅ Peça tirada do SALE");
        setTimeout(() => window.location.reload(), 700);
      } else {
        setMessage("❌ Não deu para salvar");
      }
    } catch {
      setMessage("❌ Não deu para salvar");
    } finally {
      setLoading(false);
    }
  };

  const primeiraFoto = (p: Product): string | null => {
    try {
      const fotos = JSON.parse(p.images || "[]");
      return Array.isArray(fotos) && fotos.length ? String(fotos[0]) : null;
    } catch { return null; }
  };
  const listaDe = (json?: string | null): string[] => {
    try {
      const v = JSON.parse(json || "[]");
      return Array.isArray(v) ? v.map(String) : [];
    } catch { return []; }
  };

  const formatDate = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("pt-BR");
  };

  // Peca entra em SALE automatico de 20% ao completar DIAS_PARA_SALE dias de cadastro
  const daysInStock = (createdAt: string | Date) => {
    const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
    const today = new Date();
    return Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  };

  const calculateSalePrice = (price: number, discount: number) => {
    return (price * (100 - discount) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      console.log("Buscando:", query);
      const res = await fetch(`/api/admin/products/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      console.log("Status:", res.status, "Resposta:", data);
      if (res.ok) {
        setSearchResults(data.products || []);
      } else {
        console.error("Erro na API (Status", res.status + "):", data.error, data.details);
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Erro ao buscar:", err);
      setSearchResults([]);
    }
  };

  const handleQuickAuthorize = async (product: Product) => {
    setLoading(true);
    setMessage("");
    try {
      console.log("Autorizando:", product.id, { onSale: true, saleDiscount: customDiscount });

      const res = await fetch(`/api/admin/produtos/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onSale: true,
          saleDiscount: customDiscount,
        }),
      });

      const data = await res.json();
      console.log("Resposta PUT:", res.status, data);

      if (res.ok) {
        setMessage(`✅ "${product.name}" autorizado ao SALE com ${customDiscount}% de desconto!`);
        setSelectedProduct(null);
        setSearchQuery("");
        setSearchResults([]);
        setCustomDiscount(20);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        console.error("Erro na API:", data);
        setMessage(`❌ Erro ao autorizar: ${data.error || "Erro desconhecido"}`);
      }
    } catch (err) {
      console.error("Erro na requisição:", err);
      setMessage(`❌ Erro ao autorizar: ${(err as any).message}`);
    }
    setLoading(false);
  };

  const handleToggleSale = async (productId: string, currentOnSale: boolean) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/produtos/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onSale: !currentOnSale }),
      });
      if (res.ok) {
        setMessage(currentOnSale ? "❌ Removido de SALE" : "✅ Autorizado para SALE");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage("❌ Erro ao atualizar");
      }
    } catch (err) {
      setMessage("❌ Erro ao atualizar");
    }
    setLoading(false);
  };

  const handleUpdateDiscount = async (
    productId: string,
    discount: number
  ) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/produtos/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleDiscount: discount || null }),
      });
      if (res.ok) {
        setMessage("✅ Desconto atualizado");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage("❌ Erro ao atualizar");
      }
    } catch (err) {
      setMessage("❌ Erro ao atualizar");
    }
    setLoading(false);
  };

  const renderProducts = (products: Product[]) => {
    if (products.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9a8060" }}>
          <p style={{ fontSize: "1rem", fontWeight: 600 }}>
            {activeTab === "upcoming"
              ? `Nenhuma peça com ${DIAS_PARA_SALE} dias ou mais de cadastro`
              : "Nenhuma peça com desconto personalizado"}
          </p>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {products.map((product) => {
          const discount = product.saleDiscount || 20;
          const diasEstoque =
            activeTab === "upcoming"
              ? daysInStock(product.createdAt)
              : undefined;
          return (
            <div
              key={product.id}
              className="linha-sale"
              style={{
                backgroundColor: "#fff",
                border: "1px solid rgba(140,100,20,0.15)",
                borderRadius: "0.875rem",
                padding: "1.25rem",
              }}
            >
              {/* A foto: é por ela que se reconhece a peça. Só pelo nome,
                  "Top Aline" e "Top Aline 2" são a mesma coisa na cabeça. */}
              <div className="sale-foto" style={{
                width: 84, height: 108, borderRadius: "0.625rem", overflow: "hidden",
                backgroundColor: "#f4efe4", border: "1px solid rgba(140,100,20,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {primeiraFoto(product)
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={primeiraFoto(product)!} alt={product.name}
                         style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
                  : <span style={{ fontSize: "0.6rem", color: "#9a8060", textAlign: "center", padding: "0 4px" }}>sem foto</span>}
              </div>

              {/* Produto */}
              <div className="sale-peca" style={{ minWidth: 0 }}>
                {product.saleBlocked && (
                  <span style={{
                    display: "inline-block", fontSize: "0.6rem", fontWeight: 800,
                    letterSpacing: "0.08em", color: "#7a6040", backgroundColor: "#f0e8d0",
                    border: "1px solid rgba(140,100,20,0.3)", borderRadius: "999px",
                    padding: "1px 8px", marginBottom: "0.3rem",
                  }}>FORA DO SALE</span>
                )}
                <p style={{ fontWeight: 700, color: "#1a1510", marginBottom: "0.2rem" }}>
                  {product.name}
                </p>
                <p style={{ fontSize: "0.75rem", color: "#9a8060", marginBottom: "0.35rem" }}>
                  {product.category.name} • Estoque: {product.stock}
                </p>
                {/* Cores e tamanhos: o que distingue uma peça da irmã dela */}
                {listaDe(product.colors).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginBottom: "0.3rem" }}>
                    {listaDe(product.colors).slice(0, 6).map(c => (
                      <span key={c} style={{
                        fontSize: "0.65rem", fontWeight: 600, color: "#5a4a2a",
                        backgroundColor: "#f4efe4", border: "1px solid rgba(140,100,20,0.18)",
                        borderRadius: "999px", padding: "1px 7px",
                      }}>{c}</span>
                    ))}
                    {listaDe(product.colors).length > 6 && (
                      <span style={{ fontSize: "0.65rem", color: "#9a8060", fontWeight: 700 }}>
                        +{listaDe(product.colors).length - 6}
                      </span>
                    )}
                  </div>
                )}
                {listaDe(product.sizes).length > 0 && (
                  <p style={{ fontSize: "0.68rem", color: "#9a8060" }}>
                    Tamanhos: {listaDe(product.sizes).join(" · ")}
                  </p>
                )}
              </div>

              {/* Datas */}
              <div className="sale-data">
                <p style={{ fontSize: "0.75rem", color: "#9a8060", marginBottom: "0.2rem" }}>
                  Criado em
                </p>
                <p style={{ fontWeight: 600, color: "#1a1510" }}>
                  {formatDate(product.createdAt)}
                </p>
                {diasEstoque !== undefined && (
                  <p style={{
                    fontSize: "0.75rem", fontWeight: 700,
                    color: product.saleBlocked ? "#7a6040" : "#e74c3c",
                  }}>
                    {product.saleBlocked
                      ? `${diasEstoque} dias no estoque · fora do SALE por escolha sua`
                      : `🔥 ${diasEstoque} dias no estoque · em SALE automático`}
                  </p>
                )}
              </div>

              {/* Preço Original */}
              <div className="sale-preco">
                <p style={{ fontSize: "0.75rem", color: "#9a8060", marginBottom: "0.2rem" }}>
                  Preço Original
                </p>
                <p style={{ fontWeight: 700, color: "#b8891a", fontSize: "1rem" }}>
                  R$ {product.price.toFixed(2)}
                </p>
              </div>

              {/* Desconto + Preço com Desconto */}
              <div className="sale-desconto">
                <p style={{ fontSize: "0.75rem", color: "#9a8060", marginBottom: "0.2rem" }}>
                  Desconto & Preço
                </p>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discount}
                    onChange={(e) => {
                      const newDiscount = Math.max(
                        0,
                        Math.min(100, parseInt(e.target.value) || 0)
                      );
                      handleUpdateDiscount(product.id, newDiscount);
                    }}
                    disabled={loading}
                    style={{
                      // 64px: com 50 o "20" ficava cortado pela setinha do campo.
                      width: "64px",
                      padding: "0.4rem",
                      border: "1px solid rgba(140,100,20,0.2)",
                      borderRadius: "0.4rem",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                    }}
                  />
                  <span
                    style={{
                      fontWeight: 700,
                      color: "#e74c3c",
                      fontSize: "0.9rem",
                    }}
                  >
                    %
                  </span>
                </div>
                <p style={{ fontSize: "0.8rem", color: "#e74c3c", fontWeight: 700 }}>
                  {calculateSalePrice(product.price, discount)}
                </p>
              </div>

              {/* As duas ações na mesma célula: sem isto a segunda vira um
                  sétimo item da grade e cai numa linha sozinha. */}
              <div className="sale-acoes" style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <button
                onClick={() => handleToggleSale(product.id, product.onSale)}
                // Peça fora do SALE ignora qualquer desconto: autorizar aqui
                // não faria nada, e um botão que não faz nada é uma mentira.
                disabled={loading || product.saleBlocked}
                title={product.saleBlocked ? "Devolva a peça ao SALE primeiro." : undefined}
                style={{
                  padding: "0.6rem 1rem",
                  backgroundColor: product.onSale ? "#fee8e8" : "#e8f5e9",
                  color: product.onSale ? "#c04040" : "#2e7d32",
                  border: `1px solid ${
                    product.onSale
                      ? "rgba(192,64,64,0.3)"
                      : "rgba(46,125,50,0.3)"
                  }`,
                  borderRadius: "0.625rem",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: loading || product.saleBlocked ? "not-allowed" : "pointer",
                  opacity: loading || product.saleBlocked ? 0.45 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {product.onSale ? "🗑️ Remover" : "✅ Autorizar"}
              </button>
                <button
                  onClick={() => handleToggleBloqueio(product.id, !!product.saleBlocked)}
                  disabled={loading}
                  title={product.saleBlocked
                    ? "A peça está fora do SALE. Clique para devolver."
                    : "Tira a peça do SALE mesmo tendo os dias de cadastro."}
                  style={{
                    padding: "0.6rem 1rem",
                    backgroundColor: product.saleBlocked ? "#e8f5e9" : "#f4efe4",
                    color: product.saleBlocked ? "#2e7d32" : "#5a4a2a",
                    border: `1px solid ${product.saleBlocked ? "rgba(46,125,50,0.3)" : "rgba(140,100,20,0.25)"}`,
                    borderRadius: "0.625rem", fontWeight: 700, fontSize: "0.8rem",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1, whiteSpace: "nowrap",
                  }}
                >
                  {product.saleBlocked ? "↩️ Devolver ao SALE" : "🚫 Tirar do SALE"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {message && (
        <div
          style={{
            backgroundColor: message.includes("✅") ? "#e8f5e9" : "#fee8e8",
            color: message.includes("✅") ? "#2e7d32" : "#c04040",
            padding: "1rem",
            borderRadius: "0.75rem",
            marginBottom: "1.5rem",
            textAlign: "center",
            fontWeight: 600,
            border: `1px solid ${
              message.includes("✅")
                ? "rgba(46,125,50,0.2)"
                : "rgba(192,64,64,0.2)"
            }`,
          }}
        >
          {message}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid rgba(140,100,20,0.1)" }}>
        <button
          onClick={() => setActiveTab("upcoming")}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: activeTab === "upcoming" ? "transparent" : "transparent",
            color: activeTab === "upcoming" ? "#b8891a" : "#9a8060",
            border: "none",
            borderBottom: activeTab === "upcoming" ? "3px solid #b8891a" : "none",
            fontWeight: activeTab === "upcoming" ? 700 : 600,
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          🕒 Em SALE automático — 20% ({upcomingSaleProducts.filter(p => !p.saleBlocked).length})
        </button>
        <button
          onClick={() => setActiveTab("active")}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: activeTab === "active" ? "transparent" : "transparent",
            color: activeTab === "active" ? "#b8891a" : "#9a8060",
            border: "none",
            borderBottom: activeTab === "active" ? "3px solid #b8891a" : "none",
            fontWeight: activeTab === "active" ? 700 : 600,
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          🔥 Desconto personalizado ({activeSaleProducts.length})
        </button>
      </div>

      {/* Formulário de busca rápida - apenas na aba "Em SALE Agora" */}
      {activeTab === "active" && (
        <div
          style={{
            backgroundColor: "#fff",
            border: "2px solid rgba(231,76,60,0.2)",
            borderRadius: "0.875rem",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}
        >
          <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1a1510", marginBottom: "1rem" }}>
            🔥 Adicionar Peça ao SALE Manualmente
          </h3>

          {/* Busca */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#5a4a2a", marginBottom: "0.5rem" }}>
              Buscar Peça por Nome
            </label>
            <input
              type="text"
              placeholder="Digite o nome da peça..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid rgba(140,100,20,0.2)",
                borderRadius: "0.625rem",
                fontSize: "0.875rem",
              }}
            />
          </div>

          {/* Resultados da busca */}
          {searchQuery.length >= 2 && (
            <div style={{ marginBottom: "1rem" }}>
              {searchResults.length > 0 ? (
                <>
                  <p style={{ fontSize: "0.75rem", color: "#9a8060", marginBottom: "0.5rem" }}>
                    ✅ {searchResults.length} resultado{searchResults.length > 1 ? "s" : ""}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {searchResults.slice(0, 5).map((product) => (
                      <button
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        style={{
                          padding: "0.75rem",
                          backgroundColor: "#FAF6EE",
                          border: "1px solid rgba(140,100,20,0.2)",
                          borderRadius: "0.625rem",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "#1a1510",
                          textAlign: "left",
                        }}
                      >
                        {product.name} - R$ {product.price.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: "0.8rem", color: "#c04040", padding: "0.75rem", backgroundColor: "#fee8e8", borderRadius: "0.625rem" }}>
                  ❌ Nenhuma peça encontrada com "{searchQuery}"
                </p>
              )}
            </div>
          )}

          {/* Produto selecionado */}
          {selectedProduct && (
            <div style={{ backgroundColor: "#FAF6EE", padding: "1rem", borderRadius: "0.625rem", marginBottom: "1rem" }}>
              <div style={{ marginBottom: "1rem" }}>
                <p style={{ fontWeight: 700, color: "#1a1510", marginBottom: "0.2rem" }}>
                  ✅ Selecionado: {selectedProduct.name}
                </p>
                <p style={{ fontSize: "0.8rem", color: "#9a8060" }}>
                  Preço: R$ {selectedProduct.price.toFixed(2)}
                </p>
              </div>

              {/* Desconto customizado */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#5a4a2a", marginBottom: "0.5rem" }}>
                  Desconto (%)
                </label>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={customDiscount}
                    onChange={(e) => setCustomDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                    style={{
                      width: "80px",
                      padding: "0.5rem",
                      border: "1px solid rgba(140,100,20,0.2)",
                      borderRadius: "0.4rem",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                    }}
                  />
                  <span style={{ fontWeight: 700, color: "#e74c3c" }}>%</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#e74c3c", marginLeft: "auto" }}>
                    {calculateSalePrice(selectedProduct.price, customDiscount)}
                  </span>
                </div>
              </div>

              {/* Botões */}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => handleQuickAuthorize(selectedProduct)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    backgroundColor: loading ? "#e0b030" : "#e74c3c",
                    color: "#fff",
                    border: "none",
                    borderRadius: "0.625rem",
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "Autorizando..." : "✅ Autorizar ao SALE"}
                </button>
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#fff",
                    border: "1px solid rgba(140,100,20,0.2)",
                    borderRadius: "0.625rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "#9a8060",
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Produtos */}
      {activeTab === "upcoming"
        ? renderProducts(upcomingSaleProducts)
        : renderProducts(activeSaleProducts)}
    </div>
  );
}
