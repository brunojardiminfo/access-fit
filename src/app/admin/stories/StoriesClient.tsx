"use client";

import { useMemo, useState } from "react";
import { desenharStory, enviarStory } from "@/lib/storyCanvas";

type Peca = {
  id: string; nome: string; categoria: string | null; foto: string;
  preco: number; precoCheio: number; desconto: number; estoque: number;
};
type Ideia = { tipo: string; etiqueta: string; porque: string; texto: string; pecaId: string | null };

const CARTAO = { backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.12)", borderRadius: "1rem" } as const;
const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const COR_TIPO: Record<string, string> = {
  prazo: "#c04040", ultimas: "#c04040", promo: "#b8891a",
  nova: "#1a8a2a", parada: "#7a5a9a", bastidor: "#5a7a9a",
};

export default function StoriesClient({ pecas, pauta }: { pecas: Peca[]; pauta: Ideia[] }) {
  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);

  const porId = useMemo(() => new Map(pecas.map(p => [p.id, p])), [pecas]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pecas;
    return pecas.filter(p => p.nome.toLowerCase().includes(q) || (p.categoria || "").toLowerCase().includes(q));
  }, [pecas, busca]);

  const gerar = async (p: Peca) => {
    setAviso(""); setOcupado(p.id);
    try {
      const blob = await desenharStory(p);
      const onde = await enviarStory(blob, `story-${p.nome.toLowerCase().replace(/\s+/g, "-")}`);
      setAviso(onde === "compartilhado"
        ? "Story gerado — escolhe o Instagram no menu que abriu."
        : "Story baixado. No computador o compartilhamento direto não existe: o arquivo foi para a pasta de downloads.");
    } catch (e) {
      setAviso(`Não deu para gerar: ${(e as Error).message}`);
    }
    setOcupado(null);
  };

  const copiar = async (texto: string, id: string) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(id); setTimeout(() => setCopiado(null), 2000); }
    catch { prompt("Copie o texto:", texto); }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.25rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>
      <a href="/admin" style={{ color: "#b8891a", fontSize: "0.85rem", textDecoration: "none" }}>← Admin</a>
      <h1 style={{ color: "#1a1510", fontSize: "1.75rem", fontWeight: 900, margin: "0.2rem 0 0.4rem" }}>📱 Stories</h1>
      <p style={{ color: "#9a8060", fontSize: "0.88rem", maxWidth: 660, lineHeight: 1.6, marginBottom: "1.5rem" }}>
        O story sai pronto com foto, nome e preço — e vai direto para o Instagram, sem passar pela galeria.
        A pauta abaixo vem do que a loja sabe hoje: o que entrou em promoção, o que está acabando, o que chegou.
      </p>

      {aviso && (
        <div style={{ ...CARTAO, padding: "0.85rem 1.1rem", marginBottom: "1.25rem", backgroundColor: "#fff8e1", borderColor: "rgba(184,137,26,0.4)", color: "#5a4a2a", fontSize: "0.85rem" }}>
          {aviso}
        </div>
      )}

      {/* ── PAUTA ── */}
      <h2 style={{ color: "#1a1510", fontSize: "1.1rem", fontWeight: 900, margin: "0 0 0.75rem" }}>
        O que postar hoje
      </h2>
      <div style={{ display: "grid", gap: "0.75rem", marginBottom: "2.25rem" }}>
        {pauta.map((i, n) => {
          const p = i.pecaId ? porId.get(i.pecaId) : undefined;
          return (
            <div key={n} style={{ ...CARTAO, padding: "1rem 1.1rem", display: "flex", gap: "0.9rem", alignItems: "flex-start", flexWrap: "wrap" }}>
              {p && (
                <img src={p.foto} alt="" style={{ width: 62, height: 62, objectFit: "cover", borderRadius: "0.6rem", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                  <span style={{ backgroundColor: COR_TIPO[i.tipo] || "#9a8060", color: "#fff", fontSize: "0.62rem", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", padding: "0.2rem 0.6rem", borderRadius: 999 }}>
                    {i.etiqueta}
                  </span>
                  {p && <strong style={{ color: "#1a1510", fontSize: "0.9rem" }}>{p.nome}</strong>}
                </div>
                {/* O fato que sustenta a ideia, com número. Sem ele, é chute. */}
                <div style={{ color: "#9a8060", fontSize: "0.75rem", marginBottom: "0.45rem" }}>{i.porque}</div>
                <div style={{ color: "#3a2a10", fontSize: "0.85rem", lineHeight: 1.5, backgroundColor: "#FAF6EE", padding: "0.6rem 0.8rem", borderRadius: "0.6rem" }}>
                  {i.texto}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <button onClick={() => copiar(i.texto, String(n))}
                  style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.5rem 0.9rem", borderRadius: "0.6rem", border: "1px solid rgba(140,100,20,0.25)", backgroundColor: "#FAF6EE", color: "#5a4a2a", cursor: "pointer", whiteSpace: "nowrap" }}>
                  {copiado === String(n) ? "✓ copiado" : "Copiar texto"}
                </button>
                {p && (
                  <button onClick={() => gerar(p)} disabled={ocupado === p.id}
                    style={{ fontSize: "0.75rem", fontWeight: 800, padding: "0.5rem 0.9rem", borderRadius: "0.6rem", border: "none", backgroundColor: "#b8891a", color: "#fff", cursor: ocupado === p.id ? "wait" : "pointer", whiteSpace: "nowrap" }}>
                    {ocupado === p.id ? "montando…" : "Gerar story"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── TODAS AS PEÇAS ── */}
      <h2 style={{ color: "#1a1510", fontSize: "1.1rem", fontWeight: 900, margin: "0 0 0.25rem" }}>
        Postar qualquer peça
      </h2>
      <p style={{ color: "#9a8060", fontSize: "0.8rem", marginBottom: "0.9rem" }}>
        {pecas.length} peças com foto. Toca em uma e o story sai pronto.
      </p>
      <input value={busca} onChange={e => setBusca(e.target.value)}
        placeholder="🔍 Buscar peça ou categoria…"
        style={{ width: "100%", maxWidth: 420, padding: "0.6rem 0.9rem", border: "1px solid rgba(140,100,20,0.25)", borderRadius: "0.7rem", fontSize: "0.85rem", backgroundColor: "#fff", outline: "none", marginBottom: "1.1rem" }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: "0.9rem" }}>
        {lista.map(p => (
          <button key={p.id} onClick={() => gerar(p)} disabled={ocupado === p.id}
            style={{ ...CARTAO, padding: 0, overflow: "hidden", cursor: ocupado === p.id ? "wait" : "pointer", textAlign: "left", display: "block" }}>
            <div style={{ position: "relative", aspectRatio: "3/4", backgroundColor: "#f0e8d0" }}>
              <img src={p.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {p.desconto > 0 && (
                <span style={{ position: "absolute", top: 8, left: 8, backgroundColor: "#c04040", color: "#fff", fontSize: "0.62rem", fontWeight: 900, padding: "0.15rem 0.5rem", borderRadius: 999 }}>
                  -{p.desconto}%
                </span>
              )}
              {p.estoque <= 2 && (
                <span style={{ position: "absolute", top: 8, right: 8, backgroundColor: "#1a1510", color: "#e8c766", fontSize: "0.6rem", fontWeight: 900, padding: "0.15rem 0.5rem", borderRadius: 999 }}>
                  {p.estoque} un
                </span>
              )}
            </div>
            <div style={{ padding: "0.6rem 0.7rem" }}>
              <div style={{ color: "#1a1510", fontWeight: 700, fontSize: "0.8rem", lineHeight: 1.25 }}>{p.nome}</div>
              <div style={{ color: p.desconto > 0 ? "#c04040" : "#b8891a", fontWeight: 900, fontSize: "0.85rem", marginTop: "0.2rem" }}>
                {moeda(p.preco)}
                {p.desconto > 0 && (
                  <s style={{ color: "#b8a080", fontWeight: 600, fontSize: "0.72rem", marginLeft: "0.3rem" }}>{moeda(p.precoCheio)}</s>
                )}
              </div>
              <div style={{ color: "#9a8060", fontSize: "0.7rem", marginTop: "0.35rem" }}>
                {ocupado === p.id ? "montando…" : "toca para gerar o story"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
