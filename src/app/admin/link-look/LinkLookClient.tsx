"use client";

import { useState } from "react";
import { montarLook, type ItemDoLook } from "@/lib/look";
import { parseEstoque, coresDoEstoque, tamanhosDaCor, temCorNoEstoque, SEM_COR } from "@/lib/variacoes";

type Produto = {
  id: string; name: string; slug: string; price: number;
  images: string; sizes: string; colors: string; sizeStock?: string;
};
// Guarda o que a peça oferece junto do item: a busca some depois de escolher,
// e sem isso as sugestões de cor e tamanho ficariam vazias
type Escolhido = ItemDoLook & {
  nome: string; preco: number; cores: string[]; tamanhos: string[]; estoque: Record<string, number>;
};

const campo: React.CSSProperties = {
  width: "100%", padding: "0.7rem 0.875rem", borderRadius: "0.5rem",
  border: "1px solid rgba(140,100,20,0.25)", fontSize: "0.9rem", backgroundColor: "#fff", color: "#1a1510",
};
const card: React.CSSProperties = {
  backgroundColor: "#fff", borderRadius: "0.875rem", padding: "1.25rem",
  border: "1px solid rgba(140,100,20,0.15)", marginBottom: "1.25rem",
};

export default function LinkLookClient() {
  const [busca, setBusca] = useState("");
  const [achados, setAchados] = useState<Produto[]>([]);
  const [itens, setItens] = useState<Escolhido[]>([]);
  const [copiado, setCopiado] = useState(false);

  const procurar = async (q: string) => {
    setBusca(q);
    if (!q.trim()) { setAchados([]); return; }
    const res = await fetch(`/api/admin/produtos?q=${encodeURIComponent(q)}`);
    if (res.ok) setAchados(await res.json());
  };

  const adicionar = (p: Produto) => {
    const estoque = parseEstoque(p.sizeStock);
    let cores: string[] = [];
    let tamanhos: string[] = [];
    try { cores = JSON.parse(p.colors || "[]"); } catch { cores = []; }
    try { tamanhos = JSON.parse(p.sizes || "[]"); } catch { tamanhos = []; }
    if (temCorNoEstoque(estoque)) cores = coresDoEstoque(estoque, cores).filter(c => c !== SEM_COR);

    setItens(atual => [...atual, {
      slug: p.slug, nome: p.name, preco: p.price, quantidade: 1,
      cores, tamanhos, estoque,
    }]);
    setBusca("");
    setAchados([]);
  };

  const mudar = (i: number, campo: keyof Escolhido, valor: string | number) =>
    setItens(atual => atual.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it));

  const remover = (i: number) => setItens(atual => atual.filter((_, idx) => idx !== i));

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const link = itens.length > 0 ? `${base}/look?p=${encodeURIComponent(montarLook(itens))}` : "";
  const total = itens.reduce((s, i) => s + i.preco * (i.quantidade || 1), 0);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem permissão de área de transferência: o campo abaixo continua
      // selecionável, então o link nunca fica inacessível
      setCopiado(false);
    }
  };

  return (
    <>
      <div style={card}>
        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9a8060", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "0.4rem" }}>
          Buscar peça
        </label>
        <input value={busca} onChange={e => procurar(e.target.value)} placeholder="Digite o nome da peça..." style={campo} />
        {achados.length > 0 && (
          <div style={{ marginTop: "0.5rem", border: "1px solid rgba(140,100,20,0.15)", borderRadius: "0.5rem", overflow: "hidden" }}>
            {achados.slice(0, 6).map(p => (
              <button key={p.id} type="button" onClick={() => adicionar(p)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "0.65rem 0.875rem", border: "none", borderTop: "1px solid rgba(140,100,20,0.08)", backgroundColor: "#fff", cursor: "pointer", fontSize: "0.875rem", color: "#1a1510" }}>
                {p.name} <span style={{ color: "#9a8060" }}>· R$ {p.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {itens.length > 0 && (
        <div style={card}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1a1510", marginBottom: "1rem" }}>
            Peças do look ({itens.length})
          </h2>
          {itens.map((item, i) => {
            const cores = item.cores;
            // Com a cor escolhida, só os tamanhos que existem naquela cor
            const daCor = item.cor ? tamanhosDaCor(item.estoque, item.cor, item.tamanhos) : [];
            const tamanhos = daCor.length > 0 ? daCor : item.tamanhos;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 130px 110px 70px 32px", gap: "0.5rem", alignItems: "center", padding: "0.6rem 0", borderTop: i > 0 ? "1px solid rgba(140,100,20,0.08)" : "none" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1a1510", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nome}</span>
                <input value={item.cor || ""} onChange={e => mudar(i, "cor", e.target.value)}
                  placeholder="Cor (opcional)" list={`cores-${i}`} style={{ ...campo, padding: "0.45rem 0.6rem", fontSize: "0.82rem" }} />
                <datalist id={`cores-${i}`}>{cores.map(c => <option key={c} value={c} />)}</datalist>
                <input value={item.tamanho || ""} onChange={e => mudar(i, "tamanho", e.target.value)}
                  placeholder="Tam." list={`tams-${i}`} style={{ ...campo, padding: "0.45rem 0.6rem", fontSize: "0.82rem" }} />
                <datalist id={`tams-${i}`}>{tamanhos.map(t => <option key={t} value={t} />)}</datalist>
                <input type="number" min="1" value={item.quantidade}
                  onChange={e => mudar(i, "quantidade", Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ ...campo, padding: "0.45rem 0.5rem", fontSize: "0.82rem", textAlign: "right" }} />
                <button type="button" onClick={() => remover(i)} title="Tirar do look"
                  style={{ border: "none", background: "none", color: "#c04040", fontSize: "1.15rem", cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
            );
          })}
          <p style={{ fontSize: "0.8rem", color: "#9a8060", marginTop: "0.875rem" }}>
            Total do look: <strong style={{ color: "#5a4a2a" }}>R$ {total.toFixed(2)}</strong>
            {" · "}cor e tamanho são opcionais — em branco, a cliente escolhe
          </p>
        </div>
      )}

      {link && (
        <div style={{ ...card, borderColor: "rgba(184,137,26,0.4)", backgroundColor: "#fffdf7" }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#1a1510", marginBottom: "0.75rem" }}>
            Link para o story
          </h2>
          <input readOnly value={link} onFocus={e => e.currentTarget.select()}
            style={{ ...campo, fontSize: "0.8rem", color: "#5a4a2a", marginBottom: "0.75rem" }} />
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="button" onClick={copiar}
              style={{ padding: "0.75rem 1.5rem", backgroundColor: copiado ? "#2a6a2a" : "#1a1510", color: "#FAF6EE", border: "none", borderRadius: "0.625rem", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer" }}>
              {copiado ? "✓ Copiado!" : "📋 Copiar link"}
            </button>
            <a href={link} target="_blank" rel="noopener noreferrer"
              style={{ padding: "0.75rem 1.5rem", backgroundColor: "#fff", color: "#b8891a", border: "1px solid rgba(184,137,26,0.4)", borderRadius: "0.625rem", fontWeight: 800, fontSize: "0.9rem", textDecoration: "none" }}>
              👁️ Ver como a cliente vê
            </a>
          </div>
          <p style={{ fontSize: "0.78rem", color: "#9a8060", marginTop: "0.875rem", marginBottom: 0 }}>
            O link não cria pedido nenhum e não expira. Peça que sair do ar
            simplesmente some da lista quando alguém abrir.
          </p>
        </div>
      )}
    </>
  );
}
