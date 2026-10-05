"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit2, Check, X, Sparkles } from "lucide-react";

type Colecao = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  ordem: number;
  sazonal: boolean;
  active: boolean;
  _count: { products: number };
};

const inp = {
  padding: "0.6rem 0.875rem",
  backgroundColor: "#fff",
  border: "1px solid rgba(140,100,20,0.2)",
  borderRadius: "0.625rem",
  color: "#1a1510",
  fontSize: "0.9rem",
  outline: "none",
  width: "100%",
  boxSizing: "border-box" as const,
};

const cartao = {
  backgroundColor: "#fff",
  border: "1px solid rgba(140,100,20,0.15)",
  borderRadius: "1rem",
  padding: "1.25rem",
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

/**
 * A lista de coleções vem do servidor a cada render e NÃO é copiada para
 * useState: com uma cópia local, router.refresh() trazia dados novos e a tela
 * continuava desenhando os antigos — o botão de criar os universos ficava na
 * tela depois de já ter criado.
 */
export default function ColecaoManager({ colecoes }: { colecoes: Colecao[] }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [tagline, setTagline] = useState("");
  const [sazonal, setSazonal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editTagline, setEditTagline] = useState("");
  const [erro, setErro] = useState("");

  const faltamUniversos = !["essence", "power", "flow", "unlock", "access-everyday"].every(s =>
    colecoes.some(c => c.slug === s),
  );

  const criarPadrao = async () => {
    setLoading(true);
    setErro("");
    const res = await fetch("/api/admin/colecoes/padrao", { method: "POST" });
    setLoading(false);
    if (!res.ok) { setErro((await res.json()).error || "Não deu."); return; }
    router.refresh();
  };

  const criar = async () => {
    if (!nome.trim()) return;
    setLoading(true);
    setErro("");
    const res = await fetch("/api/admin/colecoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nome.trim(), tagline: tagline.trim(), sazonal }),
    });
    setLoading(false);
    if (!res.ok) { setErro((await res.json()).error); return; }
    setNome(""); setTagline(""); setSazonal(false);
    router.refresh();
  };

  const salvarEdicao = async (id: string) => {
    if (!editNome.trim()) return;
    const res = await fetch(`/api/admin/colecoes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editNome.trim(), tagline: editTagline.trim() }),
    });
    if (!res.ok) { setErro((await res.json()).error); return; }
    setEditId(null);
    router.refresh();
  };

  const excluir = async (c: Colecao) => {
    if (c._count.products > 0) {
      setErro(`"${c.name}" tem ${c._count.products} peça(s). Tire as peças antes de excluir.`);
      return;
    }
    if (!confirm(`Excluir a coleção ${c.name}?`)) return;
    const res = await fetch(`/api/admin/colecoes/${c.id}`, { method: "DELETE" });
    if (!res.ok) { setErro((await res.json()).error); return; }
    router.refresh();
  };

  const universos = colecoes.filter(c => !c.sazonal);
  const capsulas = colecoes.filter(c => c.sazonal);

  const lista = (itens: Colecao[]) => (
    <div style={{ ...cartao, padding: 0, overflow: "hidden" }}>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {itens.map((c, i) => (
          <li key={c.id} style={{
            display: "flex", alignItems: "flex-start", gap: "0.75rem",
            padding: "0.875rem 1.25rem",
            borderBottom: i < itens.length - 1 ? "1px solid rgba(140,100,20,0.08)" : "none",
          }}>
            {editId === c.id ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <input value={editNome} onChange={e => setEditNome(e.target.value)} autoFocus style={inp} placeholder="Nome" />
                <input value={editTagline} onChange={e => setEditTagline(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") salvarEdicao(c.id); if (e.key === "Escape") setEditId(null); }}
                  style={inp} placeholder="Mensagem da coleção" />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => salvarEdicao(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#2a8a2a", padding: 6 }}><Check size={16} /></button>
                  <button onClick={() => setEditId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9a8060", padding: 6 }}><X size={16} /></button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#1a1510", fontWeight: 800, fontSize: "0.95rem", letterSpacing: "0.02em" }}>{c.name}</p>
                  {c.tagline && (
                    <p style={{ color: "#7a6040", fontSize: "0.82rem", fontStyle: "italic", marginTop: "2px" }}>{c.tagline}</p>
                  )}
                  <p style={{ color: "#9a8060", fontSize: "0.75rem", marginTop: "3px" }}>
                    /{c.slug} · {c._count.products} peça{c._count.products !== 1 ? "s" : ""}
                  </p>
                </div>
                <button onClick={() => { setEditId(c.id); setEditNome(c.name); setEditTagline(c.tagline || ""); setErro(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#9a8060", padding: 6 }} title="Editar">
                  <Edit2 size={15} />
                </button>
                <button onClick={() => excluir(c)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#c08080", padding: 6 }} title="Excluir">
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div>
      {erro && (
        <p style={{ color: "#c04040", fontSize: "0.82rem", marginBottom: "1rem", backgroundColor: "#fff0f0", padding: "0.625rem 0.875rem", borderRadius: "0.5rem" }}>{erro}</p>
      )}

      {faltamUniversos && (
        <div style={{ ...cartao, marginBottom: "1.5rem", borderColor: "rgba(184,137,26,0.4)", backgroundColor: "#fffdf7" }}>
          <h2 style={{ color: "#1a1510", fontWeight: 800, fontSize: "0.95rem", marginBottom: "0.4rem" }}>
            Criar os cinco universos
          </h2>
          <p style={{ color: "#7a6040", fontSize: "0.84rem", marginBottom: "0.875rem", lineHeight: 1.5 }}>
            ESSENCE, POWER, FLOW, UNLOCK e ACCESS EVERYDAY, já com as mensagens da proposta.
            Se alguma já existir, ela fica como está.
          </p>
          <button onClick={criarPadrao} disabled={loading}
            style={{ backgroundColor: "#b8891a", color: "#fff", fontWeight: 700, border: "none", borderRadius: "0.625rem", padding: "0.6rem 1.25rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.45rem", fontSize: "0.875rem", opacity: loading ? 0.6 : 1 }}>
            <Sparkles size={16} /> Criar os cinco
          </button>
        </div>
      )}

      <div style={{ ...cartao, marginBottom: "1.5rem" }}>
        <h2 style={{ color: "#1a1510", fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.875rem" }}>Nova coleção</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: SOL DE FLORIPA" style={inp} />
          <input value={tagline} onChange={e => setTagline(e.target.value)}
            onKeyDown={e => e.key === "Enter" && criar()}
            placeholder="Mensagem — ex: Sol na pele. Energia que acompanha você." style={inp} />
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#7a6040", fontSize: "0.84rem", cursor: "pointer" }}>
            <input type="checkbox" checked={sazonal} onChange={e => setSazonal(e.target.checked)} />
            É cápsula de temporada (não universo permanente)
          </label>
          <button onClick={criar} disabled={loading || !nome.trim()}
            style={{ backgroundColor: "#b8891a", color: "#fff", fontWeight: 700, border: "none", borderRadius: "0.625rem", padding: "0.6rem 1.25rem", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", fontSize: "0.875rem", alignSelf: "flex-start", opacity: loading || !nome.trim() ? 0.6 : 1 }}>
            <Plus size={16} /> Criar
          </button>
        </div>
      </div>

      {universos.length > 0 && (
        <>
          <h2 style={{ color: "#9a8060", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.625rem" }}>
            Universos permanentes
          </h2>
          <div style={{ marginBottom: "1.5rem" }}>{lista(universos)}</div>
        </>
      )}

      {capsulas.length > 0 && (
        <>
          <h2 style={{ color: "#9a8060", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.625rem" }}>
            Cápsulas de temporada
          </h2>
          <div style={{ marginBottom: "1.5rem" }}>{lista(capsulas)}</div>
        </>
      )}

      {colecoes.length === 0 && !faltamUniversos && (
        <div style={{ ...cartao, textAlign: "center", color: "#9a8060", padding: "3rem" }}>
          <p>Nenhuma coleção ainda.</p>
        </div>
      )}

      {colecoes.length > 0 && (
        <a href="/admin/colecoes/classificar"
          style={{ display: "block", textAlign: "center", backgroundColor: "#1a1510", color: "#fff", fontWeight: 700, borderRadius: "0.75rem", padding: "0.875rem", textDecoration: "none", fontSize: "0.9rem" }}>
          Classificar as peças →
        </a>
      )}
    </div>
  );
}
