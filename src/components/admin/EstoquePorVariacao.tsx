"use client";

import { useState } from "react";
import { lerChave, totalDoEstoque, somarNaVariacao, SEM_COR } from "@/lib/variacoes";
import { bolinhaDeCor } from "@/lib/cores";

const campo: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.75rem", borderRadius: "0.5rem",
  border: "1px solid rgba(140,100,20,0.25)", fontSize: "0.9rem",
  backgroundColor: "#fff", color: "#1a1510",
};
const rotulo: React.CSSProperties = {
  display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#9a8060",
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem",
};

/**
 * Lançamento de estoque por cor e tamanho.
 *
 * A entrada de cima soma — é a chegada de mercadoria, do jeito que acontece
 * na vida real: chegaram 3 pretas P, some 3 nas pretas P. A tabela de baixo
 * mostra tudo o que existe e deixa corrigir o número final, para acertar
 * inventário sem precisar somar de cabeça.
 */
export default function EstoquePorVariacao({
  cores, tamanhos, estoque, onChange,
}: {
  cores: string[];
  tamanhos: string[];
  estoque: Record<string, number>;
  onChange: (novo: Record<string, number>) => void;
}) {
  const [qtd, setQtd] = useState("1");
  const [cor, setCor] = useState("");
  const [tam, setTam] = useState("");
  const [aviso, setAviso] = useState("");

  const semCor = cores.length === 0;
  const semTamanho = tamanhos.length === 0;
  const linhas = Object.entries(estoque)
    .map(([chave, quantidade]) => ({ chave, quantidade, ...lerChave(chave) }))
    .sort((a, b) => a.cor.localeCompare(b.cor) || a.tamanho.localeCompare(b.tamanho));

  const adicionar = () => {
    const n = parseInt(qtd, 10);
    if (!n || Number.isNaN(n)) { setAviso("Informe a quantidade."); return; }
    if (!semCor && !cor) { setAviso("Escolha a cor."); return; }
    if (!semTamanho && !tam) { setAviso("Escolha o tamanho."); return; }
    onChange(somarNaVariacao(estoque, semCor ? SEM_COR : cor, semTamanho ? "Único" : tam, n));
    setAviso("");
    setQtd("1");
  };

  const corrigir = (chave: string, valor: string) => {
    const n = parseInt(valor, 10);
    onChange({ ...estoque, [chave]: Number.isNaN(n) ? 0 : n });
  };

  const remover = (chave: string) => {
    const copia = { ...estoque };
    delete copia[chave];
    onChange(copia);
  };

  return (
    <div>
      {/* Entrada: quantidade > cor > tamanho > adicionar */}
      <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr auto", gap: "0.6rem", alignItems: "end" }}>
        <div>
          <label style={rotulo}>Quantidade</label>
          <input type="number" value={qtd} onChange={e => setQtd(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); adicionar(); } }}
            style={campo} />
        </div>
        <div>
          <label style={rotulo}>Cor</label>
          <select value={cor} onChange={e => setCor(e.target.value)} disabled={semCor} style={{ ...campo, opacity: semCor ? 0.5 : 1 }}>
            <option value="">{semCor ? "sem cor cadastrada" : "escolha"}</option>
            {cores.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={rotulo}>Tamanho</label>
          <select value={tam} onChange={e => setTam(e.target.value)} disabled={semTamanho} style={{ ...campo, opacity: semTamanho ? 0.5 : 1 }}>
            <option value="">{semTamanho ? "tamanho único" : "escolha"}</option>
            {tamanhos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button type="button" onClick={adicionar}
          style={{ padding: "0.6rem 1.1rem", borderRadius: "0.5rem", border: "none", backgroundColor: "#1a1510", color: "#FAF6EE", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap" }}>
          Adicionar
        </button>
      </div>

      {aviso && <p style={{ color: "#c04040", fontSize: "0.78rem", marginTop: "0.5rem", fontWeight: 600 }}>{aviso}</p>}

      {(semCor || semTamanho) && (
        <p style={{ fontSize: "0.72rem", color: "#9a8060", marginTop: "0.5rem" }}>
          {semCor && "Cadastre as cores acima para lançar estoque por cor. "}
          {semTamanho && "Sem tamanhos cadastrados, tudo entra como tamanho único."}
        </p>
      )}

      {/* O que já existe */}
      {linhas.length > 0 && (
        <div style={{ marginTop: "1rem", border: "1px solid rgba(140,100,20,0.15)", borderRadius: "0.625rem", overflow: "hidden" }}>
          {linhas.map(l => {
            const b = bolinhaDeCor(l.cor || "sem cor");
            return (
              <div key={l.chave} style={{ display: "grid", gridTemplateColumns: "1fr 90px 32px", gap: "0.6rem", alignItems: "center", padding: "0.5rem 0.75rem", borderTop: "1px solid rgba(140,100,20,0.08)", backgroundColor: l.quantidade < 0 ? "#fff4f4" : l.quantidade === 0 ? "#faf8f4" : "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                  {l.cor ? (
                    <span aria-hidden style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: b.fundo, border: `1px solid ${b.borda}`, flexShrink: 0 }} />
                  ) : (
                    <span aria-hidden style={{ width: 14, height: 14, borderRadius: "50%", border: "1px dashed rgba(140,100,20,0.5)", flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: "0.85rem", color: "#1a1510", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {l.cor || <em style={{ color: "#9a8060", fontWeight: 500 }}>sem cor definida</em>}
                    {l.tamanho ? ` · ${l.tamanho}` : ""}
                  </span>
                </div>
                <input type="number" value={l.quantidade} onChange={e => corrigir(l.chave, e.target.value)}
                  style={{ ...campo, padding: "0.4rem 0.5rem", textAlign: "right", color: l.quantidade < 0 ? "#c04040" : "#1a1510" }} />
                <button type="button" onClick={() => remover(l.chave)} title="Remover esta variação"
                  style={{ border: "none", background: "none", color: "#c04040", fontSize: "1.1rem", cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: "0.78rem", color: "#9a8060", marginTop: "0.625rem" }}>
        Total: <strong style={{ color: "#5a4a2a" }}>{totalDoEstoque(estoque)} un</strong>
        {linhas.some(l => l.cor === SEM_COR) && " · há estoque sem cor definida, lançado antes do controle por cor"}
      </p>
    </div>
  );
}
