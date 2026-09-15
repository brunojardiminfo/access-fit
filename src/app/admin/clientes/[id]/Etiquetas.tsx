"use client";

import { useState } from "react";

type Tag = { id: string; nome: string; cor: string; auto: boolean };

/**
 * Etiquetas da cliente. As automaticas aparecem com um ponto e nao tem botao de
 * tirar: elas voltam sozinhas na proxima varredura, e um "x" que nao funciona e
 * pior do que nenhum "x".
 */
export default function Etiquetas({
  userId, coladas, todas,
}: { userId: string; coladas: Tag[]; todas: Tag[] }) {
  const [minhas, setMinhas] = useState<Tag[]>(coladas);
  const [abrindo, setAbrindo] = useState(false);
  const [erro, setErro] = useState("");

  const disponiveis = todas.filter(t => !t.auto && !minhas.some(m => m.id === t.id));

  const mexer = async (tag: Tag, colar: boolean) => {
    const antes = minhas;
    setMinhas(colar ? [...minhas, tag] : minhas.filter(m => m.id !== tag.id));
    setErro("");
    try {
      const r = await fetch("/api/admin/crm/tags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tagId: tag.id, colar }),
      });
      if (!r.ok) throw new Error();
    } catch {
      setMinhas(antes);
      setErro("Não consegui salvar a etiqueta.");
    }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center", marginTop: "0.7rem" }}>
      {minhas.map(t => (
        <span key={t.id} style={{
          display: "inline-flex", alignItems: "center", gap: "0.3rem",
          backgroundColor: `${t.cor}1a`, color: t.cor,
          border: `1px solid ${t.cor}44`,
          fontSize: "0.72rem", fontWeight: 700,
          padding: "0.2rem 0.55rem", borderRadius: 999,
        }}>
          {t.auto && <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: t.cor }} title="calculada pelo sistema" />}
          {t.nome}
          {!t.auto && (
            <button onClick={() => mexer(t, false)} aria-label={`Tirar etiqueta ${t.nome}`}
              style={{ background: "none", border: 0, color: t.cor, cursor: "pointer", fontSize: "0.8rem", lineHeight: 1, padding: 0 }}>
              ×
            </button>
          )}
        </span>
      ))}

      {disponiveis.length > 0 && (
        <div style={{ position: "relative" }}>
          <button onClick={() => setAbrindo(!abrindo)}
            style={{ backgroundColor: "#fff", border: "1px dashed rgba(140,100,20,0.35)", color: "#9a8060", fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 999, cursor: "pointer" }}>
            + etiqueta
          </button>
          {abrindo && (
            <div style={{
              position: "absolute", top: "calc(100% + 0.3rem)", left: 0, zIndex: 20,
              backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.2)",
              borderRadius: "0.625rem", padding: "0.4rem", minWidth: 180,
              boxShadow: "0 6px 20px rgba(140,100,20,0.15)",
              maxHeight: 220, overflowY: "auto",
            }}>
              {disponiveis.map(t => (
                <button key={t.id} onClick={() => { mexer(t, true); setAbrindo(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: 0, padding: "0.35rem 0.5rem", fontSize: "0.78rem", color: "#7a6030", cursor: "pointer", borderRadius: "0.35rem" }}>
                  {t.nome}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <a href="/admin/segmentos" style={{ fontSize: "0.7rem", color: "#b8891a", textDecoration: "none" }}>
        gerenciar →
      </a>

      {erro && <span style={{ fontSize: "0.72rem", color: "#c04040" }}>{erro}</span>}
    </div>
  );
}
