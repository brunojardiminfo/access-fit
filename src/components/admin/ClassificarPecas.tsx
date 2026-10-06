"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Search, CheckSquare, Square, Wand2 } from "lucide-react";
import { PAPEIS, papelCor } from "@/lib/colecoes";
import { sugerirParaPeca } from "@/lib/sugestaoColecao";

type Peca = {
  id: string;
  name: string;
  papel: string | null;
  categoria: string;
  cores: string[];
  colecaoIds: string[];
};
type Colecao = { id: string; name: string; slug: string; sazonal: boolean };

type Estado = Record<string, { colecaoIds: string[]; papel: string | null }>;

const cartao = {
  backgroundColor: "#fff",
  border: "1px solid rgba(140,100,20,0.15)",
  borderRadius: "1rem",
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

/** Mesma lista, mesma ordem? Compara sem se importar com a ordem. */
function iguais(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((x, i) => x === sb[i]);
}

export default function ClassificarPecas({
  pecas,
  colecoes,
  categorias,
}: {
  pecas: Peca[];
  colecoes: Colecao[];
  categorias: string[];
}) {
  const router = useRouter();

  const inicial: Estado = useMemo(
    () => Object.fromEntries(pecas.map(p => [p.id, { colecaoIds: p.colecaoIds, papel: p.papel }])),
    [pecas],
  );
  const [estado, setEstado] = useState<Estado>(inicial);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [soPendentes, setSoPendentes] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  /** Por que o palpite sugeriu o que sugeriu. Fica na tela para dar o que discordar. */
  const [motivos, setMotivos] = useState<Record<string, string>>({});

  const alteradas = useMemo(
    () =>
      pecas.filter(p => {
        const e = estado[p.id];
        return !iguais(e.colecaoIds, p.colecaoIds) || e.papel !== p.papel;
      }),
    [estado, pecas],
  );

  const classificadas = pecas.filter(p => estado[p.id].colecaoIds.length > 0).length;

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pecas.filter(p => {
      if (termo && !p.name.toLowerCase().includes(termo)) return false;
      if (filtroCategoria && p.categoria !== filtroCategoria) return false;
      if (soPendentes && estado[p.id].colecaoIds.length > 0) return false;
      return true;
    });
  }, [pecas, busca, filtroCategoria, soPendentes, estado]);

  const alternarColecao = (pecaId: string, colecaoId: string) => {
    setEstado(prev => {
      const atual = prev[pecaId].colecaoIds;
      const novo = atual.includes(colecaoId)
        ? atual.filter(c => c !== colecaoId)
        : [...atual, colecaoId];
      return { ...prev, [pecaId]: { ...prev[pecaId], colecaoIds: novo } };
    });
  };

  const definirPapel = (pecaId: string, papel: string) => {
    setEstado(prev => ({ ...prev, [pecaId]: { ...prev[pecaId], papel: papel || null } }));
  };

  const alternarSelecao = (id: string) => {
    setSelecionadas(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selecionarVisiveis = () => {
    const ids = visiveis.map(v => v.id);
    const todasJa = ids.every(i => selecionadas.has(i));
    setSelecionadas(todasJa ? new Set() : new Set(ids));
  };

  /** Aplica a mesma coleção a todas as selecionadas — é isso que faz 84 peças virarem minutos. */
  const aplicarColecaoNaSelecao = (colecaoId: string, remover: boolean) => {
    if (!selecionadas.size || !colecaoId) return;
    setEstado(prev => {
      const n = { ...prev };
      for (const id of selecionadas) {
        const atual = n[id].colecaoIds;
        n[id] = {
          ...n[id],
          colecaoIds: remover
            ? atual.filter(c => c !== colecaoId)
            : atual.includes(colecaoId) ? atual : [...atual, colecaoId],
        };
      }
      return n;
    });
  };

  /** LIMPAR tem valor proprio porque "" e o valor do placeholder do select:
   *  com os dois vazios, escolher "sem papel" nao dispara onChange nenhum. */
  const LIMPAR_PAPEL = "__limpar__";

  const aplicarPapelNaSelecao = (valor: string) => {
    if (!selecionadas.size || !valor) return;
    const papel = valor === LIMPAR_PAPEL ? null : valor;
    setEstado(prev => {
      const n = { ...prev };
      for (const id of selecionadas) n[id] = { ...n[id], papel };
      return n;
    });
  };

  const porSlug = useMemo(
    () => Object.fromEntries(colecoes.map(c => [c.slug, c.id])),
    [colecoes],
  );

  /**
   * Preenche o palpite SÓ nas peças que ainda não estão em coleção nenhuma.
   * Nunca por cima de curadoria já feita: trabalho manual não é sobrescrito
   * por heurística. E não grava nada — quem grava é o botão de salvar.
   */
  const sugerir = () => {
    // Calcula fora do setEstado: contar dentro do updater dava número errado,
    // porque o updater roda depois (e duas vezes em dev), enquanto a mensagem
    // era montada na hora — e saía sempre zero.
    const novoEstado: Estado = { ...estado };
    const novosMotivos: Record<string, string> = {};
    let aplicadas = 0;
    let semPalpite = 0;

    for (const p of pecas) {
      if (novoEstado[p.id].colecaoIds.length > 0) continue; // já classificada à mão
      const s = sugerirParaPeca({ name: p.name, categoria: p.categoria, cores: p.cores });
      const colecaoId = s.slug ? porSlug[s.slug] : null;
      novosMotivos[p.id] = s.motivo;
      if (!colecaoId) { semPalpite++; continue; }
      novoEstado[p.id] = { colecaoIds: [colecaoId], papel: novoEstado[p.id].papel ?? s.papel };
      aplicadas++;
    }

    setEstado(novoEstado);
    setMotivos(m => ({ ...m, ...novosMotivos }));
    setMsg(
      aplicadas
        ? `${aplicadas} palpite(s) preenchido(s)${semPalpite ? `, ${semPalpite} sem palpite possível` : ""}. Confira e salve.`
        : "Nada para palpitar — ou já está tudo classificado.",
    );
  };

  const salvar = async () => {
    if (!alteradas.length) return;
    setSalvando(true);
    setMsg("");
    const res = await fetch("/api/admin/colecoes/classificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mudancas: alteradas.map(p => ({
          productId: p.id,
          collectionIds: estado[p.id].colecaoIds,
          papel: estado[p.id].papel,
        })),
      }),
    });
    setSalvando(false);
    if (!res.ok) { setMsg((await res.json()).error || "Não deu para salvar."); return; }
    const d = await res.json();
    setMsg(`${d.pecas} peça(s) salva(s).`);
    setSelecionadas(new Set());
    setMotivos({});
    router.refresh();
  };

  const chip = (ativo: boolean, cor: string) => ({
    padding: "0.25rem 0.6rem",
    borderRadius: "999px",
    border: `1px solid ${ativo ? cor : "rgba(140,100,20,0.25)"}`,
    backgroundColor: ativo ? cor : "transparent",
    color: ativo ? "#fff" : "#7a6040",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.03em",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  });

  const selectStyle = {
    padding: "0.4rem 0.6rem",
    backgroundColor: "#fff",
    border: "1px solid rgba(140,100,20,0.2)",
    borderRadius: "0.5rem",
    color: "#1a1510",
    fontSize: "0.8rem",
    outline: "none",
  };

  return (
    <div>
      {/* Progresso */}
      <div style={{ ...cartao, padding: "1rem 1.25rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", flexWrap: "wrap" }}>
          <p style={{ color: "#1a1510", fontWeight: 800, fontSize: "1.1rem" }}>
            {classificadas} <span style={{ color: "#9a8060", fontWeight: 500, fontSize: "0.9rem" }}>de {pecas.length} peças em alguma coleção</span>
          </p>
          {alteradas.length > 0 && (
            <p style={{ color: "#b8891a", fontSize: "0.82rem", fontWeight: 700 }}>
              {alteradas.length} alteração(ões) não salva(s)
            </p>
          )}
        </div>
        <div style={{ height: 6, backgroundColor: "rgba(140,100,20,0.12)", borderRadius: 999, marginTop: "0.625rem", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pecas.length ? (classificadas / pecas.length) * 100 : 0}%`, backgroundColor: "#b8891a", borderRadius: 999, transition: "width 0.25s" }} />
        </div>
      </div>

      {/* Filtros */}
      <div style={{ ...cartao, padding: "1rem 1.25rem", marginBottom: "1rem", display: "flex", gap: "0.625rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 0 }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9a8060" }} />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar peça..."
            style={{ ...selectStyle, width: "100%", paddingLeft: "2rem", boxSizing: "border-box" }} />
        </div>
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={selectStyle}>
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#7a6040", fontSize: "0.82rem", cursor: "pointer", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={soPendentes} onChange={e => setSoPendentes(e.target.checked)} />
          Só as que faltam
        </label>
      </div>

      {/* Ações em massa */}
      <div style={{ ...cartao, padding: "1rem 1.25rem", marginBottom: "1rem", backgroundColor: selecionadas.size ? "#fffdf7" : "#fff", borderColor: selecionadas.size ? "rgba(184,137,26,0.4)" : "rgba(140,100,20,0.15)" }}>
        <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={selecionarVisiveis}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#b8891a", fontWeight: 700, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.35rem", padding: 0 }}>
            {visiveis.length > 0 && visiveis.every(v => selecionadas.has(v.id)) ? <CheckSquare size={15} /> : <Square size={15} />}
            Marcar as {visiveis.length} da lista
          </button>
          <span style={{ color: "#9a8060", fontSize: "0.82rem" }}>
            {selecionadas.size ? `${selecionadas.size} selecionada(s)` : "nenhuma selecionada"}
          </span>
          <button onClick={sugerir} title="Preenche um palpite nas peças ainda sem coleção, pela cor, categoria e nome"
            style={{ marginLeft: "auto", backgroundColor: "transparent", border: "1px solid rgba(140,100,20,0.35)", color: "#b8891a", fontWeight: 700, fontSize: "0.8rem", borderRadius: "0.5rem", padding: "0.4rem 0.75rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <Wand2 size={14} /> Dar um palpite pelas cores
          </button>
        </div>
        {selecionadas.size > 0 && (
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(140,100,20,0.12)" }}>
            <select defaultValue="" style={selectStyle}
              onChange={e => { aplicarColecaoNaSelecao(e.target.value, false); e.target.value = ""; }}>
              <option value="">+ Pôr na coleção...</option>
              {colecoes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select defaultValue="" style={selectStyle}
              onChange={e => { aplicarColecaoNaSelecao(e.target.value, true); e.target.value = ""; }}>
              <option value="">− Tirar da coleção...</option>
              {colecoes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select defaultValue="" style={selectStyle}
              onChange={e => { aplicarPapelNaSelecao(e.target.value); e.target.value = ""; }}>
              <option value="">Definir papel...</option>
              {PAPEIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              <option value={LIMPAR_PAPEL}>— tirar o papel —</option>
            </select>
          </div>
        )}
      </div>

      {/* Lista */}
      <div style={{ ...cartao, overflow: "hidden" }}>
        {visiveis.length === 0 ? (
          <p style={{ textAlign: "center", color: "#9a8060", padding: "3rem", fontSize: "0.9rem" }}>
            Nenhuma peça com esses filtros.
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {visiveis.map((p, i) => {
              const e = estado[p.id];
              const sel = selecionadas.has(p.id);
              return (
                <li key={p.id} style={{
                  padding: "0.875rem 1.25rem",
                  borderBottom: i < visiveis.length - 1 ? "1px solid rgba(140,100,20,0.08)" : "none",
                  backgroundColor: sel ? "rgba(184,137,26,0.05)" : "transparent",
                  display: "flex", gap: "0.75rem", alignItems: "flex-start",
                }}>
                  <button onClick={() => alternarSelecao(p.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: sel ? "#b8891a" : "#c0b090", padding: "2px 0 0", flexShrink: 0 }}
                    title="Selecionar">
                    {sel ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
                      <p style={{ color: "#1a1510", fontWeight: 700, fontSize: "0.9rem" }}>{p.name}</p>
                      <span style={{ color: "#9a8060", fontSize: "0.72rem" }}>{p.categoria}</span>
                      {p.cores.length > 0 && (
                        <span style={{ color: "#b8a080", fontSize: "0.72rem" }}>{p.cores.join(", ")}</span>
                      )}
                      {motivos[p.id] && (
                        <span style={{ color: "#b8891a", fontSize: "0.7rem", fontWeight: 700, backgroundColor: "rgba(184,137,26,0.1)", padding: "1px 6px", borderRadius: 999 }}>
                          palpite: {motivos[p.id]}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                      {colecoes.map(c => (
                        <button key={c.id} onClick={() => alternarColecao(p.id, c.id)}
                          style={chip(e.colecaoIds.includes(c.id), c.sazonal ? "#8a4a6a" : "#b8891a")}>
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <select value={e.papel || ""} onChange={ev => definirPapel(p.id, ev.target.value)}
                    style={{ ...selectStyle, flexShrink: 0, borderColor: e.papel ? papelCor(e.papel) : "rgba(140,100,20,0.2)", color: e.papel ? papelCor(e.papel) : "#9a8060", fontWeight: e.papel ? 700 : 400 }}>
                    <option value="">Papel...</option>
                    {PAPEIS.map(pp => <option key={pp.value} value={pp.value}>{pp.label}</option>)}
                  </select>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Barra de salvar */}
      <div style={{
        position: "sticky", bottom: 0, marginTop: "1rem",
        paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        paddingTop: "0.75rem",
        background: "linear-gradient(to top, #faf6ee 60%, rgba(250,246,238,0))",
      }}>
        {msg && (
          <p style={{ textAlign: "center", fontSize: "0.82rem", marginBottom: "0.5rem", color: msg.includes("salva") ? "#2a8a2a" : "#c04040" }}>{msg}</p>
        )}
        <button onClick={salvar} disabled={salvando || !alteradas.length}
          style={{
            width: "100%", backgroundColor: alteradas.length ? "#1a1510" : "#d8cdb8",
            color: "#fff", fontWeight: 700, border: "none", borderRadius: "0.75rem",
            padding: "0.9rem", fontSize: "0.9rem",
            cursor: alteradas.length ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
            opacity: salvando ? 0.6 : 1,
          }}>
          <Save size={16} />
          {salvando ? "Salvando..." : alteradas.length ? `Salvar ${alteradas.length} alteração(ões)` : "Nada para salvar"}
        </button>
      </div>
    </div>
  );
}
