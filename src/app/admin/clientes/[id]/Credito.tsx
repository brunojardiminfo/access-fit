"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

export type Lancamento = {
  id: string; amount: number; kind: string; rotulo: string;
  note: string | null; authorName: string | null; createdAt: string;
};
type Motivo = { kind: string; rotulo: string };

const CAMPO: React.CSSProperties = {
  border: "1px solid rgba(140,100,20,0.25)", borderRadius: "0.45rem",
  padding: "0.4rem 0.55rem", fontSize: "0.82rem", color: "#1a1510",
  backgroundColor: "#fff", fontFamily: "inherit",
};

/**
 * Crédito da cliente na ficha: o saldo, de onde veio e para onde foi.
 *
 * O extrato aparece inteiro de propósito. Daqui a seis meses, quando ela
 * perguntar "quanto eu tenho?", a resposta útil não é o número — é o número com
 * a história dele.
 */
export default function Credito({
  userId, saldo, lancamentos, motivos, dividaNoCaderno,
}: {
  userId: string; saldo: number; lancamentos: Lancamento[];
  motivos: Motivo[]; dividaNoCaderno: number;
}) {
  const router = useRouter();
  const [abrindo, setAbrindo] = useState(false);
  const [valor, setValor] = useState("");
  const [kind, setKind] = useState(motivos[0]?.kind || "cortesia");
  const [note, setNote] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  const chamar = async (corpo: Record<string, unknown>) => {
    setOcupado(true);
    setErro("");
    try {
      const r = await fetch("/api/admin/creditos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...corpo }),
      });
      if (!r.ok) {
        setErro((await r.json().catch(() => ({}))).error || "Não consegui salvar.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setErro("Não consegui salvar. Tente de novo.");
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const conceder = async () => {
    const n = parseFloat(valor.replace(",", "."));
    if (!n || n <= 0) { setErro("Informe o valor."); return; }
    if (await chamar({ valor: n, kind, note })) {
      setValor(""); setNote(""); setAbrindo(false);
    }
  };

  const abater = () => {
    const quanto = Math.min(saldo, dividaNoCaderno);
    if (!confirm(`Abater ${formatCurrency(quanto)} do caderno dela?`)) return;
    chamar({ acao: "abater-caderno", valor: quanto });
  };

  const podeAbater = saldo > 0.005 && dividaNoCaderno > 0.005;

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)", borderRadius: "1rem", padding: "1.1rem 1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
        <h3 style={{ fontWeight: 800, fontSize: "0.8rem", color: "#1a1510" }}>Crédito</h3>
        <button onClick={() => setAbrindo(!abrindo)}
          style={{ background: "none", border: 0, color: "#b8891a", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
          {abrindo ? "cancelar" : "+ dar crédito"}
        </button>
      </div>

      <div style={{ fontSize: "1.6rem", fontWeight: 900, color: saldo > 0.005 ? "#1a8a2a" : "#b8a080", margin: "0.3rem 0 0.1rem" }}>
        {formatCurrency(saldo)}
      </div>
      <p style={{ fontSize: "0.72rem", color: "#9a8060" }}>
        {saldo > 0.005 ? "disponível para usar em compras" : "sem crédito disponível"}
      </p>

      {podeAbater && (
        <div style={{ marginTop: "0.75rem", backgroundColor: "#fff8e1", border: "1px solid rgba(184,137,26,0.3)", borderRadius: "0.6rem", padding: "0.6rem 0.75rem" }}>
          <p style={{ fontSize: "0.78rem", color: "#7a6030", marginBottom: "0.5rem" }}>
            Ela tem <strong>{formatCurrency(saldo)}</strong> de crédito e deve{" "}
            <strong>{formatCurrency(dividaNoCaderno)}</strong> no caderno.
          </p>
          <button onClick={abater} disabled={ocupado}
            style={{ backgroundColor: "#b8891a", border: 0, color: "#fff", fontSize: "0.78rem", fontWeight: 700, padding: "0.4rem 0.8rem", borderRadius: "0.45rem", cursor: "pointer" }}>
            Abater {formatCurrency(Math.min(saldo, dividaNoCaderno))}
          </button>
        </div>
      )}

      {abrindo && (
        <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <input style={{ ...CAMPO, width: 110 }} value={valor} onChange={e => setValor(e.target.value)}
              placeholder="R$ 0,00" inputMode="decimal" aria-label="Valor do crédito" />
            <select style={{ ...CAMPO, flex: 1, minWidth: 150 }} value={kind} onChange={e => setKind(e.target.value)} aria-label="Motivo">
              {motivos.map(m => <option key={m.kind} value={m.kind}>{m.rotulo}</option>)}
            </select>
          </div>
          <input style={CAMPO} value={note} onChange={e => setNote(e.target.value)}
            placeholder="Observação — ex.: peça Legging Aline M que ela trouxe" aria-label="Observação" />
          <button onClick={conceder} disabled={ocupado}
            style={{ backgroundColor: "#b8891a", border: 0, color: "#fff", fontSize: "0.8rem", fontWeight: 700, padding: "0.45rem", borderRadius: "0.45rem", cursor: "pointer" }}>
            {ocupado ? "Salvando…" : "Dar crédito"}
          </button>
        </div>
      )}

      {erro && <p style={{ fontSize: "0.75rem", color: "#c04040", marginTop: "0.4rem" }}>{erro}</p>}

      {lancamentos.length > 0 && (
        <div style={{ marginTop: "0.9rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(140,100,20,0.1)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {lancamentos.map(l => {
            const entrada = l.amount > 0;
            return (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", fontSize: "0.78rem" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "#1a1510" }}>{l.rotulo}</div>
                  {l.note && <div style={{ color: "#9a8060", fontSize: "0.72rem" }}>{l.note}</div>}
                  <div style={{ color: "#b8a080", fontSize: "0.7rem" }}>
                    {new Date(l.createdAt).toLocaleDateString("pt-BR")}
                    {l.authorName ? ` · ${l.authorName}` : ""}
                  </div>
                </div>
                <div style={{ fontWeight: 700, whiteSpace: "nowrap", color: entrada ? "#1a8a2a" : "#c04040" }}>
                  {entrada ? "+" : "−"} {formatCurrency(Math.abs(l.amount))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
