"use client";

import { useMemo, useState } from "react";

type Nota = {
  id: string; kind: string; body: string; outcome: string | null;
  authorName: string | null; createdAt: string;
};
type Evento = { id: string; quando: string; titulo: string; texto: string; tipo: "venda" | "sistema" };

const TIPOS = [
  { kind: "nota", rotulo: "Observação" },
  { kind: "ligacao", rotulo: "Ligação" },
  { kind: "whatsapp", rotulo: "WhatsApp" },
  { kind: "visita", rotulo: "Visita" },
];

const RESULTADOS = [
  { valor: "", rotulo: "sem resultado" },
  { valor: "respondeu", rotulo: "respondeu" },
  { valor: "sem-resposta", rotulo: "sem resposta" },
  { valor: "virou-venda", rotulo: "virou venda" },
  { valor: "nao-quis", rotulo: "não quis" },
];

const COR_DO_PONTO: Record<string, string> = {
  venda: "#b8891a", sistema: "#c8b48a", whatsapp: "#25D366",
  ligacao: "#1a6a9a", visita: "#8a1ab8", nota: "#7a6030",
};

const COR_DO_RESULTADO: Record<string, { bg: string; cor: string }> = {
  respondeu: { bg: "#e8f8e8", cor: "#1a8a2a" },
  "sem-resposta": { bg: "#fff8e1", cor: "#b8891a" },
  "virou-venda": { bg: "#e8f8e8", cor: "#1a8a2a" },
  "nao-quis": { bg: "#fee8e8", cor: "#c04040" },
};

function quando(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
    + " · " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function Historico({
  userId, notasIniciais, eventos,
}: { userId: string; notasIniciais: Nota[]; eventos: Evento[] }) {
  const [notas, setNotas] = useState<Nota[]>(notasIniciais);
  const [texto, setTexto] = useState("");
  const [kind, setKind] = useState("nota");
  const [resultado, setResultado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const linha = useMemo(() => {
    const doSistema = eventos.map(e => ({
      id: e.id, quando: e.quando, titulo: e.titulo, corpo: e.texto,
      tipo: e.tipo, autor: "Sistema", resultado: null as string | null, podeApagar: false,
    }));
    const minhas = notas.map(n => ({
      id: n.id, quando: n.createdAt,
      titulo: TIPOS.find(t => t.kind === n.kind)?.rotulo || "Observação",
      corpo: n.body, tipo: n.kind, autor: n.authorName || "Você",
      resultado: n.outcome, podeApagar: true,
    }));
    return [...doSistema, ...minhas].sort(
      (a, b) => new Date(b.quando).getTime() - new Date(a.quando).getTime(),
    );
  }, [notas, eventos]);

  const salvar = async () => {
    if (!texto.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      const r = await fetch("/api/admin/crm/notas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, kind, body: texto, outcome: resultado || null }),
      });
      if (!r.ok) throw new Error();
      const nova: Nota = await r.json();
      setNotas([nova, ...notas]);
      setTexto("");
      setResultado("");
    } catch {
      setErro("Não consegui salvar a anotação. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  };

  const apagar = async (id: string) => {
    setNotas(notas.filter(n => n.id !== id));
    await fetch(`/api/admin/crm/notas?id=${id}`, { method: "DELETE" }).catch(() => null);
  };

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)", borderRadius: "1rem", overflow: "hidden" }}>
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(140,100,20,0.08)", backgroundColor: "#FAF6EE" }}>
        <h2 style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1a1510" }}>Histórico de contato</h2>
        <p style={{ fontSize: "0.72rem", color: "#9a8060", marginTop: "0.15rem" }}>
          Conversa, venda e anotação na mesma linha do tempo
        </p>
      </div>

      {/* Compositor */}
      <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(140,100,20,0.08)" }}>
        <textarea
          id="nova-anotacao"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Ex.: pediu pra avisar quando chegar legging cintura alta na cor rosé"
          style={{
            width: "100%", minHeight: 64, resize: "vertical",
            border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.625rem",
            padding: "0.6rem 0.75rem", fontSize: "0.85rem", color: "#1a1510",
            backgroundColor: "#FAF6EE", fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center", marginTop: "0.6rem" }}>
          {TIPOS.map(t => (
            <button key={t.kind} onClick={() => setKind(t.kind)}
              style={{
                backgroundColor: kind === t.kind ? "#b8891a" : "#fff",
                border: `1px solid ${kind === t.kind ? "#b8891a" : "rgba(140,100,20,0.2)"}`,
                color: kind === t.kind ? "#fff" : "#7a6030",
                fontSize: "0.72rem", fontWeight: 700, padding: "0.3rem 0.6rem",
                borderRadius: "0.45rem", cursor: "pointer",
              }}>
              {t.rotulo}
            </button>
          ))}
          <select id="resultado-anotacao" value={resultado} onChange={e => setResultado(e.target.value)}
            style={{ fontSize: "0.72rem", border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.45rem", padding: "0.3rem 0.5rem", color: "#7a6030", backgroundColor: "#fff" }}>
            {RESULTADOS.map(r => <option key={r.valor} value={r.valor}>{r.rotulo}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <button onClick={salvar} disabled={salvando || !texto.trim()}
            style={{
              backgroundColor: texto.trim() ? "#b8891a" : "rgba(184,137,26,0.35)",
              color: "#fff", border: 0, fontSize: "0.78rem", fontWeight: 700,
              padding: "0.4rem 0.9rem", borderRadius: "0.5rem",
              cursor: texto.trim() ? "pointer" : "default",
            }}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
        {erro && <p style={{ fontSize: "0.75rem", color: "#c04040", marginTop: "0.4rem" }}>{erro}</p>}
      </div>

      {/* Linha do tempo */}
      <div style={{ padding: "1.25rem", maxHeight: 560, overflowY: "auto" }}>
        {linha.length === 0 ? (
          <p style={{ color: "#b8a080", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>
            Nada registrado ainda.
          </p>
        ) : (
          <div style={{ borderLeft: "1px solid rgba(140,100,20,0.15)", paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            {linha.map(item => (
              <div key={item.id} style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: "-1.45rem", top: "0.3rem",
                  width: 9, height: 9, borderRadius: "50%",
                  backgroundColor: "#fff",
                  border: `2px solid ${COR_DO_PONTO[item.tipo] || "#c8b48a"}`,
                }} />
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0.5rem" }}>
                  <strong style={{ fontSize: "0.85rem", color: "#1a1510" }}>{item.titulo}</strong>
                  <span style={{ fontSize: "0.7rem", color: "#b8a080", fontFamily: "monospace" }}>{quando(item.quando)}</span>
                  {item.resultado && (
                    <span style={{
                      fontSize: "0.66rem", fontWeight: 700, borderRadius: 999, padding: "0.1rem 0.45rem",
                      backgroundColor: COR_DO_RESULTADO[item.resultado]?.bg || "#FAF6EE",
                      color: COR_DO_RESULTADO[item.resultado]?.cor || "#7a6030",
                    }}>
                      {RESULTADOS.find(r => r.valor === item.resultado)?.rotulo || item.resultado}
                    </span>
                  )}
                  {item.podeApagar && (
                    <button onClick={() => apagar(item.id)}
                      style={{ marginLeft: "auto", background: "none", border: 0, color: "#c8b48a", fontSize: "0.7rem", cursor: "pointer" }}>
                      apagar
                    </button>
                  )}
                </div>
                {item.corpo && (
                  <p style={{ fontSize: "0.82rem", color: "#7a6030", marginTop: "0.2rem", maxWidth: "62ch" }}>{item.corpo}</p>
                )}
                <p style={{ fontSize: "0.68rem", color: "#b8a080", marginTop: "0.15rem" }}>{item.autor}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
