"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Tambem = { id: string; kind: string; title: string; detail: string };
type Linha = {
  id: string; key: string; kind: string; userId: string | null;
  title: string; detail: string; valueAtStake: number;
  nome: string | null; telefone: string | null;
  mensagem: string; whatsapp: string | null; link: string | null;
  atrasadaHa: number; tambem: Tambem[];
};
type Fila = {
  linhas: Linha[]; porTipo: Record<string, number>;
  abertas: number; mostradas: number; esperando: number;
  feitasHoje: number; ultimaVarredura: string | null;
};

const ROTULO: Record<string, { nome: string; emoji: string; tom: "urgente" | "morna" | "boa" | "neutra" }> = {
  cobranca:            { nome: "Cobrança",          emoji: "💰", tom: "urgente" },
  carrinho:            { nome: "Carrinho",          emoji: "🛒", tom: "boa" },
  espera:              { nome: "Lista de espera",   emoji: "🔔", tom: "boa" },
  "troca-parada":      { nome: "Troca parada",      emoji: "🔄", tom: "urgente" },
  aniversario:         { nome: "Aniversário",       emoji: "🎂", tom: "boa" },
  "aniversario-breve": { nome: "Aniversário perto", emoji: "🎁", tom: "neutra" },
  entrega3d:           { nome: "Chegou?",           emoji: "📦", tom: "neutra" },
  pos24h:              { nome: "Agradecer",         emoji: "💌", tom: "neutra" },
  feedback7d:          { nome: "Feedback",          emoji: "⭐", tom: "neutra" },
  reengaja30d:         { nome: "Reengajar",         emoji: "🔁", tom: "neutra" },
  inativa:             { nome: "Sumiu",             emoji: "🌙", tom: "morna" },
  "vip-frio":          { nome: "VIP esfriando",     emoji: "👑", tom: "morna" },
  "revisao-sale":      { nome: "Revisar SALE",      emoji: "🏷️", tom: "morna" },
  repor:               { nome: "Repor estoque",     emoji: "📥", tom: "morna" },
  pauta:               { nome: "Pauta",             emoji: "📸", tom: "neutra" },
  fechamento:          { nome: "Fechamento",        emoji: "📊", tom: "neutra" },
};

const COR_DA_FAIXA = { urgente: "#c04040", morna: "#b8891a", boa: "#1a8a2a", neutra: "#c8b48a" };

const CARTAO: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid rgba(140,100,20,0.1)",
  borderRadius: "1rem",
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FilaClient() {
  const [fila, setFila] = useState<Fila | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tipo, setTipo] = useState<string>("");
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  // Recarrega a fila depois de cada ação, sem precisar de um efeito que chama a si mesmo.
  const [versao, setVersao] = useState(0);
  const recarregar = useCallback(() => setVersao(v => v + 1), []);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/admin/crm/fila${tipo ? `?tipo=${tipo}` : ""}`)
      .then(r => r.json())
      .then(d => { if (!vivo) return; setFila(d); setErro(""); setCarregando(false); })
      .catch(() => { if (!vivo) return; setErro("Não consegui carregar a fila. Tente de novo."); setCarregando(false); });
    return () => { vivo = false; };
  }, [tipo, versao]);

  const agir = async (id: string, acao: "feita" | "adiar" | "descartar", dias?: number) => {
    setOcupada(id);
    try {
      await fetch("/api/admin/crm/fila", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, acao, dias }),
      });
      recarregar();
    } catch {
      setErro("Não consegui salvar. Tente de novo.");
    } finally {
      setOcupada(null);
    }
  };

  const varrer = async () => {
    setCarregando(true);
    await fetch("/api/admin/crm/fila", { method: "POST" }).catch(() => null);
    recarregar();
  };

  const chamar = (l: Linha) => {
    if (!l.whatsapp) return;
    window.open(l.whatsapp, "_blank");
  };

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1.25rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#1a1510" }}>Fila de hoje</h1>
          <p style={{ fontSize: "0.8rem", color: "#9a8060", marginTop: "0.2rem", textTransform: "capitalize" }}>
            {hoje}
            {fila ? ` · ${fila.mostradas} para agora · ${fila.feitasHoje} já feitos` : ""}
            {fila && fila.esperando > 0 ? ` · ${fila.esperando} ficam para amanhã` : ""}
          </p>
        </div>
        <button onClick={varrer} disabled={carregando}
          style={{ backgroundColor: "#fff", border: "1px solid rgba(184,137,26,0.3)", color: "#b8891a", fontWeight: 700, fontSize: "0.8rem", padding: "0.5rem 0.9rem", borderRadius: "0.625rem", cursor: carregando ? "wait" : "pointer" }}>
          {carregando ? "Procurando…" : "Procurar agora"}
        </button>
      </div>

      {erro && (
        <div style={{ ...CARTAO, borderColor: "rgba(192,64,64,0.3)", backgroundColor: "#fee8e8", color: "#c04040", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.85rem" }}>
          {erro}
        </div>
      )}

      {/* Filtros por tipo */}
      {fila && Object.keys(fila.porTipo).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.25rem" }}>
          <Chip ativo={tipo === ""} onClick={() => setTipo("")} label="Tudo" valor={fila.abertas} />
          {Object.entries(fila.porTipo).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
            <Chip key={k} ativo={tipo === k} onClick={() => setTipo(tipo === k ? "" : k)}
              label={`${ROTULO[k]?.emoji || ""} ${ROTULO[k]?.nome || k}`} valor={n} />
          ))}
        </div>
      )}

      {carregando && !fila ? (
        <p style={{ color: "#b8a080", textAlign: "center", padding: "3rem" }}>Carregando…</p>
      ) : !fila || fila.linhas.length === 0 ? (
        <div style={{ ...CARTAO, padding: "3rem 1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>☀️</div>
          <p style={{ fontWeight: 800, color: "#1a1510" }}>Hoje está limpo</p>
          <p style={{ fontSize: "0.85rem", color: "#9a8060", marginTop: "0.3rem" }}>
            Nada urgente na fila. A próxima varredura roda de manhã.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {fila.linhas.map(l => {
            const r = ROTULO[l.kind] || { nome: l.kind, emoji: "•", tom: "neutra" as const };
            return (
              <article key={l.id} style={{ ...CARTAO, display: "flex", overflow: "hidden", opacity: ocupada === l.id ? 0.5 : 1 }}>
                <div style={{ width: 4, backgroundColor: COR_DA_FAIXA[r.tom], flex: "none" }} />
                <div style={{ flex: 1, padding: "0.9rem 1.1rem", minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
                    <strong style={{ fontSize: "0.95rem", color: "#1a1510" }}>{l.title}</strong>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, backgroundColor: "#FAF6EE", color: "#9a8060", padding: "0.15rem 0.5rem", borderRadius: 999 }}>
                      {r.emoji} {r.nome}
                    </span>
                    {l.atrasadaHa > 0 && (
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, backgroundColor: "#fee8e8", color: "#c04040", padding: "0.15rem 0.5rem", borderRadius: 999 }}>
                        atrasada há {l.atrasadaHa}d
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: "0.85rem", color: "#7a6030", marginTop: "0.35rem" }}>{l.detail}</p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.15rem 1rem", marginTop: "0.45rem", fontSize: "0.72rem", color: "#9a8060" }}>
                    {l.telefone && <span>{l.telefone}</span>}
                    {l.valueAtStake > 0 && <span>{fmt(l.valueAtStake)} em jogo</span>}
                    {l.userId && <Link href={`/admin/clientes/${l.userId}`} style={{ color: "#b8891a", textDecoration: "none" }}>ver ficha →</Link>}
                  </div>

                  {l.tambem.length > 0 && (
                    <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px dashed rgba(140,100,20,0.15)" }}>
                      <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#9a8060", marginBottom: "0.2rem" }}>
                        TAMBÉM PENDENTE COM ELA
                      </p>
                      {l.tambem.map(t => (
                        <p key={t.id} style={{ fontSize: "0.75rem", color: "#9a8060" }}>
                          {ROTULO[t.kind]?.emoji || "•"} {t.title}
                        </p>
                      ))}
                    </div>
                  )}

                  {l.mensagem && (
                    <p style={{ marginTop: "0.6rem", fontSize: "0.78rem", color: "#7a6030", backgroundColor: "#FAF6EE", borderRadius: "0.5rem", padding: "0.5rem 0.65rem", fontStyle: "italic" }}>
                      &ldquo;{l.mensagem}&rdquo;
                    </p>
                  )}
                </div>

                <div style={{ padding: "0.9rem 1rem", display: "flex", flexDirection: "column", gap: "0.35rem", justifyContent: "center", borderLeft: "1px solid rgba(140,100,20,0.08)", flex: "none" }}>
                  {l.whatsapp && (
                    <button onClick={() => chamar(l)}
                      style={{ backgroundColor: "#25D366", color: "#fff", border: 0, fontWeight: 700, fontSize: "0.78rem", padding: "0.45rem 0.8rem", borderRadius: "0.5rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                      Chamar
                    </button>
                  )}
                  {!l.whatsapp && l.link && (
                    <Link href={l.link}
                      style={{ backgroundColor: "#b8891a", color: "#fff", fontWeight: 700, fontSize: "0.78rem", padding: "0.45rem 0.8rem", borderRadius: "0.5rem", textDecoration: "none", whiteSpace: "nowrap", textAlign: "center" }}>
                      Abrir
                    </Link>
                  )}
                  {!l.whatsapp && !l.link && l.telefone === null && l.userId === null && (
                    <span style={{ fontSize: "0.7rem", color: "#b8a080", whiteSpace: "nowrap" }}>sem telefone</span>
                  )}
                  <button onClick={() => agir(l.id, "feita")} disabled={ocupada === l.id}
                    style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.2)", color: "#7a6030", fontWeight: 700, fontSize: "0.78rem", padding: "0.45rem 0.8rem", borderRadius: "0.5rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                    {l.whatsapp || !l.link ? "Já falei" : "Resolvido"}
                  </button>
                  <button onClick={() => agir(l.id, "adiar", 3)} disabled={ocupada === l.id}
                    style={{ backgroundColor: "transparent", border: 0, color: "#9a8060", fontSize: "0.72rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                    adiar 3d
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {fila?.ultimaVarredura && (
        <p style={{ fontSize: "0.72rem", color: "#b8a080", textAlign: "center", marginTop: "1.5rem" }}>
          Última varredura: {new Date(fila.ultimaVarredura).toLocaleString("pt-BR")}
        </p>
      )}
    </div>
  );
}

function Chip({ ativo, onClick, label, valor }: { ativo: boolean; onClick: () => void; label: string; valor: number }) {
  return (
    <button onClick={onClick}
      style={{
        backgroundColor: ativo ? "#b8891a" : "#fff",
        border: `1px solid ${ativo ? "#b8891a" : "rgba(140,100,20,0.15)"}`,
        color: ativo ? "#fff" : "#7a6030",
        fontSize: "0.75rem", fontWeight: 700,
        padding: "0.35rem 0.7rem", borderRadius: "0.5rem", cursor: "pointer",
      }}>
      {label} <span style={{ opacity: 0.7 }}>{valor}</span>
    </button>
  );
}
