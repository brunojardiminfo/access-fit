"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

export type Parcela = {
  id: string; number: number; amount: number;
  dueDate: string; status: string; paidAt: string | null;
};

const CAMPO: React.CSSProperties = {
  border: "1px solid rgba(140,100,20,0.3)", borderRadius: "0.4rem",
  padding: "0.3rem 0.45rem", fontSize: "0.78rem", color: "#1a1510",
  backgroundColor: "#fff", fontFamily: "inherit",
};
const BOTAO: React.CSSProperties = {
  border: "1px solid rgba(140,100,20,0.25)", backgroundColor: "#fff",
  color: "#7a6030", borderRadius: "0.4rem", padding: "0.3rem 0.6rem",
  fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
};

const soData = (iso: string) => iso.slice(0, 10);
const diaBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });

/**
 * Parcelas de um pedido do caderno, editáveis aqui e na aba Pedidos.
 *
 * As duas telas chamam as mesmas rotas, e as rotas recalculam o pedido a partir
 * das parcelas. É isso que faz as duas mostrarem o mesmo saldo — não há
 * sincronização entre telas, há um lugar só onde o valor é decidido.
 */
export default function Parcelas({
  orderId, total, amountPaid, parcelas,
}: { orderId: string; total: number; amountPaid: number; parcelas: Parcela[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [vence, setVence] = useState("");
  const [redividindo, setRedividindo] = useState(false);
  const [vezes, setVezes] = useState("2");
  const [primeiro, setPrimeiro] = useState(soData(new Date().toISOString()));
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");

  const hoje = new Date();
  const saldo = Math.round((total - amountPaid) * 100) / 100;
  const somaDasParcelas = Math.round(parcelas.reduce((s, p) => s + p.amount, 0) * 100) / 100;
  const desencontro = parcelas.length > 0 && Math.abs(somaDasParcelas - total) > 0.01;

  const chamar = async (url: string, body: unknown, metodo: "PUT" | "POST" = "PUT") => {
    setOcupado(true);
    setErro("");
    try {
      const r = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const alternarPaga = (p: Parcela) =>
    chamar(`/api/admin/parcelas/${p.id}`, { status: p.status === "paid" ? "pending" : "paid" });

  const salvarEdicao = async (p: Parcela) => {
    const corpo: Record<string, unknown> = {};
    if (valor) corpo.amount = parseFloat(valor);
    if (vence) corpo.dueDate = vence;
    if (!Object.keys(corpo).length) { setEditando(null); return; }
    if (await chamar(`/api/admin/parcelas/${p.id}`, corpo)) setEditando(null);
  };

  const redividir = async () => {
    const n = parseInt(vezes, 10);
    if (!n || n < 1) { setErro("Informe em quantas vezes."); return; }
    if (await chamar("/api/admin/parcelas/redividir", {
      orderId, vezes: n, primeiroVencimento: primeiro,
    }, "POST")) setRedividindo(false);
  };

  return (
    <div style={{ marginBottom: "0.875rem" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#9a8060", letterSpacing: "0.04em" }}>
          {parcelas.length ? `PARCELAS (${parcelas.length}×)` : "SEM PARCELAS"}
        </span>
        <button onClick={() => setRedividindo(!redividindo)} style={{ ...BOTAO, borderStyle: "dashed" }}>
          {parcelas.length ? "Redividir o que falta" : "Parcelar o saldo"}
        </button>
      </div>

      {desencontro && (
        <p style={{ fontSize: "0.72rem", color: "#856404", backgroundColor: "#fff8e1", border: "1px solid rgba(184,137,26,0.3)", borderRadius: "0.4rem", padding: "0.4rem 0.6rem", marginBottom: "0.4rem" }}>
          As parcelas somam {formatCurrency(somaDasParcelas)} e o pedido é {formatCurrency(total)}. Redividir o
          que falta acerta a conta.
        </p>
      )}

      {parcelas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {parcelas.map(p => {
            const paga = p.status === "paid";
            const vencida = !paga && new Date(p.dueDate) < hoje;
            const emEdicao = editando === p.id;
            return (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap",
                backgroundColor: paga ? "#f4faf4" : vencida ? "#fdf0f0" : "#FAF6EE",
                border: `1px solid ${paga ? "rgba(26,138,42,0.2)" : vencida ? "rgba(192,64,64,0.25)" : "rgba(140,100,20,0.12)"}`,
                borderRadius: "0.5rem", padding: "0.4rem 0.6rem",
              }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#9a8060", width: 26 }}>
                  {p.number}ª
                </span>

                {emEdicao ? (
                  <>
                    <input style={{ ...CAMPO, width: 90 }} type="number" step="0.01" min="0.01"
                      defaultValue={p.amount} onChange={e => setValor(e.target.value)} aria-label="Valor" />
                    <input style={{ ...CAMPO, width: 140 }} type="date"
                      defaultValue={soData(p.dueDate)} onChange={e => setVence(e.target.value)} aria-label="Vencimento" />
                    <button onClick={() => salvarEdicao(p)} disabled={ocupado}
                      style={{ ...BOTAO, backgroundColor: "#b8891a", borderColor: "#b8891a", color: "#fff" }}>
                      Salvar
                    </button>
                    <button onClick={() => { setEditando(null); setValor(""); setVence(""); }} style={BOTAO}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.85rem", minWidth: 80 }}>
                      {formatCurrency(p.amount)}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: vencida ? "#c04040" : "#7a6030" }}>
                      {paga ? `paga em ${p.paidAt ? diaBR(p.paidAt) : "—"}` : `vence ${diaBR(p.dueDate)}`}
                      {vencida && " · vencida"}
                    </span>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => alternarPaga(p)} disabled={ocupado}
                      style={{
                        ...BOTAO,
                        backgroundColor: paga ? "#fff" : "#e8f8e8",
                        borderColor: paga ? "rgba(140,100,20,0.25)" : "rgba(26,138,42,0.25)",
                        color: paga ? "#9a8060" : "#1a8a2a",
                      }}>
                      {paga ? "desfazer" : "recebi"}
                    </button>
                    <button onClick={() => { setEditando(p.id); setValor(""); setVence(""); }} style={BOTAO}>
                      editar
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {redividindo && (
        <div style={{ marginTop: "0.5rem", backgroundColor: "#fff8e1", border: "1px solid rgba(184,137,26,0.3)", borderRadius: "0.5rem", padding: "0.6rem 0.75rem" }}>
          <p style={{ fontSize: "0.75rem", color: "#7a6030", marginBottom: "0.5rem" }}>
            Dividir os <strong>{formatCurrency(saldo)}</strong> em aberto.
            {parcelas.some(p => p.status === "paid") && " As parcelas já pagas continuam como estão."}
          </p>
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
            <input style={{ ...CAMPO, width: 64 }} type="number" min="1" max="24" value={vezes}
              onChange={e => setVezes(e.target.value)} aria-label="Quantas vezes" />
            <span style={{ fontSize: "0.78rem", color: "#7a6030" }}>vezes, a partir de</span>
            <input style={{ ...CAMPO, width: 140 }} type="date" value={primeiro}
              onChange={e => setPrimeiro(e.target.value)} aria-label="Primeiro vencimento" />
            <button onClick={redividir} disabled={ocupado}
              style={{ ...BOTAO, backgroundColor: "#b8891a", borderColor: "#b8891a", color: "#fff" }}>
              {ocupado ? "Dividindo…" : "Dividir"}
            </button>
          </div>
          {parseInt(vezes, 10) > 0 && saldo > 0 && (
            <p style={{ fontSize: "0.72rem", color: "#9a8060", marginTop: "0.4rem" }}>
              Fica {vezes}× de {formatCurrency(Math.round((saldo / parseInt(vezes, 10)) * 100) / 100)}, mês a mês.
            </p>
          )}
        </div>
      )}

      {erro && <p style={{ fontSize: "0.75rem", color: "#c04040", marginTop: "0.4rem" }}>{erro}</p>}
    </div>
  );
}
