"use client";

import { useMemo, useState } from "react";
import { desenharStory, desenharEnquete, enviarStory } from "@/lib/storyCanvas";

type Peca = {
  id: string; nome: string; categoria: string | null; foto: string;
  preco: number; precoCheio: number; desconto: number; estoque: number;
};
type Momento = "manha" | "tarde" | "noite";
type Ideia = { tipo: string; momento: Momento; etiqueta: string; porque: string; texto: string; pecaId: string | null; dueloIds?: [string, string] | null };

const CARTAO = { backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.12)", borderRadius: "1rem" } as const;
const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Os três stories do dia, cada um com um trabalho.
 *
 * A tela antiga listava dez ideias boas de uma vez, e escolher entre dez é
 * trabalho — era preciso procurar. Aqui são três decisões, uma por momento,
 * com as outras guardadas atrás do "trocar".
 */
const MOMENTOS: { chave: Momento; emoji: string; titulo: string; papel: string }[] = [
  { chave: "manha", emoji: "☀️", titulo: "Manhã", papel: "a peça — é o story que vende" },
  { chave: "tarde", emoji: "💬", titulo: "Tarde", papel: "a conversa — faz o Instagram entregar mais" },
  { chave: "noite", emoji: "🌙", titulo: "Noite", papel: "o movimento — prova que a loja está viva" },
];

const COR_TIPO: Record<string, string> = {
  prazo: "#c04040", ultimas: "#c04040", promo: "#b8891a",
  nova: "#1a8a2a", parada: "#7a5a9a", interacao: "#5a7a9a", movimento: "#5a7a9a",
};

export default function StoriesClient({ pecas, pauta }: { pecas: Peca[]; pauta: Ideia[] }) {
  const [indice, setIndice] = useState<Record<Momento, number>>({ manha: 0, tarde: 0, noite: 0 });
  const [verTodas, setVerTodas] = useState(false);
  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);

  const porId = useMemo(() => new Map(pecas.map(p => [p.id, p])), [pecas]);
  const porMomento = useMemo(() => ({
    manha: pauta.filter(i => i.momento === "manha"),
    tarde: pauta.filter(i => i.momento === "tarde"),
    noite: pauta.filter(i => i.momento === "noite"),
  }), [pauta]);

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
        : "Story baixado. No computador o compartilhamento direto não existe: o arquivo foi para os downloads.");
    } catch (e) {
      setAviso(`Não deu para gerar: ${(e as Error).message}`);
    }
    setOcupado(null);
  };

  /**
   * A imagem da enquete, com as duas peças já montadas.
   *
   * Era o buraco da ideia boa: "qual dessas duas você levaria" dependia dele
   * caçar duas fotos na galeria e montar à mão — exatamente o trabalho que
   * esta tela existe para tirar do caminho.
   */
  const gerarEnquete = async (a: Peca, b: Peca) => {
    setAviso(""); setOcupado(`enquete-${a.id}`);
    try {
      const blob = await desenharEnquete(a, b);
      const onde = await enviarStory(blob, "enquete-access-fit");
      setAviso(onde === "compartilhado"
        ? "Enquete gerada — escolhe o Instagram e põe a enquete do Instagram por cima, com as opções 1 e 2."
        : "Enquete baixada. Posta no story e põe a enquete do Instagram por cima, com as opções 1 e 2.");
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
    <div style={{ maxWidth: 820, margin: "0 auto", /* A folga embaixo é o dobro da altura do menu fixo do admin: sem ela o
         menu cobre o último botão da página, e no celular ele fica
         inalcançável — o mesmo defeito que a tela de liquidação já teve. */
      padding: "1.75rem 1.1rem 7rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>
      <a href="/admin" style={{ color: "#b8891a", fontSize: "0.85rem", textDecoration: "none" }}>← Admin</a>
      <h1 style={{ color: "#1a1510", fontSize: "1.6rem", fontWeight: 900, margin: "0.2rem 0 0.3rem" }}>📱 Stories de hoje</h1>
      <p style={{ color: "#9a8060", fontSize: "0.85rem", lineHeight: 1.55, marginBottom: "1.4rem" }}>
        Três stories, um por momento do dia. Toca em gerar, copia o texto, posta.
      </p>

      {aviso && (
        <div style={{ ...CARTAO, padding: "0.8rem 1rem", marginBottom: "1.1rem", backgroundColor: "#fff8e1", borderColor: "rgba(184,137,26,0.4)", color: "#5a4a2a", fontSize: "0.83rem" }}>
          {aviso}
        </div>
      )}

      <div style={{ display: "grid", gap: "0.9rem" }}>
        {MOMENTOS.map(m => {
          const opcoes = porMomento[m.chave];
          if (opcoes.length === 0) return null;
          const i = opcoes[indice[m.chave] % opcoes.length];
          const p = i.pecaId ? porId.get(i.pecaId) : undefined;
          const duo = i.dueloIds
            ? [porId.get(i.dueloIds[0]), porId.get(i.dueloIds[1])].filter(Boolean) as Peca[]
            : [];
          const temDuo = duo.length === 2;
          const id = `${m.chave}-${indice[m.chave]}`;
          return (
            <div key={m.chave} style={{ ...CARTAO, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", padding: "0.8rem 1rem 0", flexWrap: "wrap" }}>
                <strong style={{ color: "#1a1510", fontSize: "0.95rem" }}>{m.emoji} {m.titulo}</strong>
                <span style={{ color: "#9a8060", fontSize: "0.75rem" }}>{m.papel}</span>
              </div>

              <div style={{ display: "flex", gap: "0.85rem", padding: "0.75rem 1rem 1rem", alignItems: "flex-start" }}>
                {p && (
                  <img src={p.foto} alt="" style={{ width: 76, height: 101, objectFit: "cover", borderRadius: "0.6rem", flexShrink: 0 }} />
                )}
                {temDuo && (
                  // as duas, com o número do lado que elas vão ocupar na imagem
                  <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                    {duo.map((d, n) => (
                      <div key={d.id} style={{ position: "relative" }}>
                        <img src={d.foto} alt="" style={{ width: 54, height: 101, objectFit: "cover", borderRadius: n === 0 ? "0.6rem 0 0 0.6rem" : "0 0.6rem 0.6rem 0" }} />
                        <span style={{ position: "absolute", top: 3, left: "50%", transform: "translateX(-50%)", backgroundColor: "#e8c766", color: "#07060a", fontSize: "0.58rem", fontWeight: 900, width: 16, height: 16, borderRadius: 999, display: "grid", placeItems: "center" }}>
                          {n + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                    <span style={{ backgroundColor: COR_TIPO[i.tipo] || "#9a8060", color: "#fff", fontSize: "0.6rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase", padding: "0.18rem 0.55rem", borderRadius: 999 }}>
                      {i.etiqueta}
                    </span>
                    {p && <strong style={{ color: "#1a1510", fontSize: "0.88rem" }}>{p.nome}</strong>}
                    {temDuo && (
                      <strong style={{ color: "#1a1510", fontSize: "0.82rem" }}>
                        {duo[0].nome} <span style={{ color: "#9a8060", fontWeight: 600 }}>ou</span> {duo[1].nome}
                      </strong>
                    )}
                  </div>
                  {/* O fato com número. Sem ele, a sugestão é chute. */}
                  <div style={{ color: "#9a8060", fontSize: "0.73rem", lineHeight: 1.45, marginBottom: "0.5rem" }}>{i.porque}</div>
                  <div style={{ color: "#3a2a10", fontSize: "0.84rem", lineHeight: 1.5, backgroundColor: "#FAF6EE", padding: "0.6rem 0.75rem", borderRadius: "0.6rem" }}>
                    {i.texto}
                  </div>

                  <div style={{ display: "flex", gap: "0.45rem", marginTop: "0.65rem", flexWrap: "wrap" }}>
                    <button onClick={() => copiar(i.texto, id)}
                      style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.5rem 0.85rem", borderRadius: "0.6rem", border: "1px solid rgba(140,100,20,0.25)", backgroundColor: "#FAF6EE", color: "#5a4a2a", cursor: "pointer" }}>
                      {copiado === id ? "✓ copiado" : "Copiar texto"}
                    </button>
                    {p && (
                      <button onClick={() => gerar(p)} disabled={ocupado === p.id}
                        style={{ fontSize: "0.75rem", fontWeight: 800, padding: "0.5rem 0.9rem", borderRadius: "0.6rem", border: "none", backgroundColor: "#b8891a", color: "#fff", cursor: ocupado === p.id ? "wait" : "pointer" }}>
                        {ocupado === p.id ? "montando…" : "Gerar story"}
                      </button>
                    )}
                    {temDuo && (
                      <button onClick={() => gerarEnquete(duo[0], duo[1])} disabled={ocupado === `enquete-${duo[0].id}`}
                        style={{ fontSize: "0.75rem", fontWeight: 800, padding: "0.5rem 0.9rem", borderRadius: "0.6rem", border: "none", backgroundColor: "#b8891a", color: "#fff", cursor: ocupado === `enquete-${duo[0].id}` ? "wait" : "pointer" }}>
                        {ocupado === `enquete-${duo[0].id}` ? "montando…" : "Gerar imagem da enquete"}
                      </button>
                    )}
                    {opcoes.length > 1 && (
                      <button onClick={() => setIndice(s => ({ ...s, [m.chave]: s[m.chave] + 1 }))}
                        title={`${opcoes.length} opções para este horário`}
                        style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.5rem 0.85rem", borderRadius: "0.6rem", border: "none", background: "none", color: "#9a8060", cursor: "pointer", textDecoration: "underline" }}>
                        trocar ({(indice[m.chave] % opcoes.length) + 1}/{opcoes.length})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── A grade das 73 peças fica guardada: ela é a exceção, não o caminho ── */}
      <button onClick={() => setVerTodas(!verTodas)}
        style={{ width: "100%", marginTop: "1.25rem", padding: "0.8rem", borderRadius: "0.8rem", border: "1px dashed rgba(140,100,20,0.35)", backgroundColor: "transparent", color: "#9a8060", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
        {verTodas ? "▲ fechar" : `▼ Postar outra peça (${pecas.length} com foto)`}
      </button>

      {verTodas && (
        <div style={{ marginTop: "1rem" }}>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="🔍 Buscar peça ou categoria…"
            style={{ width: "100%", padding: "0.6rem 0.9rem", border: "1px solid rgba(140,100,20,0.25)", borderRadius: "0.7rem", fontSize: "0.85rem", backgroundColor: "#fff", outline: "none", marginBottom: "0.9rem" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "0.8rem" }}>
            {lista.map(p => (
              <button key={p.id} onClick={() => gerar(p)} disabled={ocupado === p.id}
                style={{ ...CARTAO, padding: 0, overflow: "hidden", cursor: ocupado === p.id ? "wait" : "pointer", textAlign: "left", display: "block" }}>
                <div style={{ position: "relative", aspectRatio: "3/4", backgroundColor: "#f0e8d0" }}>
                  <img src={p.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {p.desconto > 0 && (
                    <span style={{ position: "absolute", top: 7, left: 7, backgroundColor: "#c04040", color: "#fff", fontSize: "0.6rem", fontWeight: 900, padding: "0.12rem 0.45rem", borderRadius: 999 }}>
                      -{p.desconto}%
                    </span>
                  )}
                  {p.estoque <= 2 && (
                    <span style={{ position: "absolute", top: 7, right: 7, backgroundColor: "#1a1510", color: "#e8c766", fontSize: "0.58rem", fontWeight: 900, padding: "0.12rem 0.45rem", borderRadius: 999 }}>
                      {p.estoque} un
                    </span>
                  )}
                </div>
                <div style={{ padding: "0.55rem 0.65rem" }}>
                  <div style={{ color: "#1a1510", fontWeight: 700, fontSize: "0.78rem", lineHeight: 1.25 }}>{p.nome}</div>
                  <div style={{ color: p.desconto > 0 ? "#c04040" : "#b8891a", fontWeight: 900, fontSize: "0.82rem", marginTop: "0.18rem" }}>
                    {moeda(p.preco)}
                    {p.desconto > 0 && (
                      <s style={{ color: "#b8a080", fontWeight: 600, fontSize: "0.7rem", marginLeft: "0.3rem" }}>{moeda(p.precoCheio)}</s>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
