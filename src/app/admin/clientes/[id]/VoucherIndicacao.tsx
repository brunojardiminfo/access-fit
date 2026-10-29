"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

type Indicada = { id: string; nome: string };

const CAMPO: React.CSSProperties = {
  border: "1px solid rgba(140,100,20,0.25)", borderRadius: "0.45rem",
  padding: "0.4rem 0.55rem", fontSize: "0.82rem", color: "#1a1510",
  backgroundColor: "#fff", fontFamily: "inherit",
};

/** Primeiro nome, que é como se fala com alguém no WhatsApp. */
const primeiroNome = (nome: string | null) => (nome || "").trim().split(/\s+/)[0] || "";

/** O telefone como o WhatsApp quer: só dígitos, com o 55 na frente. */
export function numeroDoWhats(telefone: string | null): string | null {
  const so = (telefone || "").replace(/\D/g, "");
  if (so.length < 10) return null;
  return so.startsWith("55") ? so : `55${so}`;
}

export function mensagemDeAgradecimento(
  nomeDela: string | null, valor: number, nomeDaIndicada?: string | null,
): string {
  const voce = primeiroNome(nomeDela);
  const quem = primeiroNome(nomeDaIndicada || null);
  return [
    `Oi${voce ? `, ${voce}` : ""}! 💛`,
    "",
    quem
      ? `A ${quem} comprou com a gente por sua indicação — obrigada de verdade!`
      : "Alguém que você indicou comprou com a gente — obrigada de verdade!",
    "",
    `Você ganhou ${formatCurrency(valor)} de voucher, já creditado no seu nome aqui na Access Fit.`,
    "É só me avisar na sua próxima compra que eu abato. 🌟",
  ].join("\n");
}

/**
 * Voucher por indicação: agradecer e creditar no mesmo clique.
 *
 * O crédito é lançado ANTES da mensagem abrir, e de propósito. Se fosse o
 * contrário, uma falha ao salvar deixaria a cliente com a promessa no celular
 * e nada no sistema — e quem descobre isso é ela, na hora de usar.
 *
 * O WhatsApp abre em aba nova. Navegador bloqueia abrir aba depois de uma
 * espera, então, quando ele bloquear, o link fica aqui para você clicar. O
 * crédito já está lançado nos dois casos.
 */
export default function VoucherIndicacao({
  userId, nome, telefone, indicadas,
}: {
  userId: string; nome: string | null; telefone: string | null; indicadas: Indicada[];
}) {
  const router = useRouter();
  const [valor, setValor] = useState("");
  const [quem, setQuem] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [linkPendente, setLinkPendente] = useState<string | null>(null);

  const zap = numeroDoWhats(telefone);

  const enviar = async () => {
    const n = parseFloat(valor.replace(",", "."));
    if (!n || n <= 0) { setErro("Informe o valor do voucher."); return; }

    setOcupado(true);
    setErro("");
    setLinkPendente(null);
    try {
      const nomeDaIndicada = indicadas.find(i => i.id === quem)?.nome || null;
      const r = await fetch("/api/admin/creditos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          valor: n,
          kind: "indicacao",
          note: nomeDaIndicada ? `Indicou ${nomeDaIndicada}` : "Voucher por indicação",
        }),
      });
      if (!r.ok) {
        setErro((await r.json().catch(() => ({}))).error || "Não consegui lançar o crédito.");
        return;
      }

      setValor("");
      setQuem("");
      router.refresh();

      if (!zap) {
        setErro("Crédito lançado. A cliente não tem telefone cadastrado, então não dá para abrir o WhatsApp.");
        return;
      }
      const link = `https://wa.me/${zap}?text=${encodeURIComponent(
        mensagemDeAgradecimento(nome, n, nomeDaIndicada),
      )}`;
      if (!window.open(link, "_blank")) setLinkPendente(link);
    } catch {
      setErro("Não consegui lançar o crédito. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)", borderRadius: "1rem", padding: "1.1rem 1.25rem" }}>
      <h3 style={{ fontWeight: 800, fontSize: "0.8rem", color: "#1a1510" }}>Voucher por indicação</h3>
      <p style={{ fontSize: "0.72rem", color: "#9a8060", marginTop: "0.2rem", marginBottom: "0.7rem" }}>
        Lança o crédito no nome dela e abre o WhatsApp com o agradecimento.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <input style={{ ...CAMPO, width: 110 }} value={valor} onChange={e => setValor(e.target.value)}
            placeholder="R$ 0,00" inputMode="decimal" aria-label="Valor do voucher" />
          {indicadas.length > 0 && (
            <select style={{ ...CAMPO, flex: 1, minWidth: 150 }} value={quem}
              onChange={e => setQuem(e.target.value)} aria-label="Quem ela indicou">
              <option value="">Quem ela indicou (opcional)</option>
              {indicadas.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
            </select>
          )}
        </div>

        <button onClick={enviar} disabled={ocupado}
          style={{
            backgroundColor: "#25D366", border: 0, color: "#fff", fontSize: "0.8rem",
            fontWeight: 700, padding: "0.5rem", borderRadius: "0.45rem",
            cursor: ocupado ? "wait" : "pointer", opacity: ocupado ? 0.7 : 1,
          }}>
          {ocupado ? "Lançando…" : "💚 Dar voucher e agradecer no WhatsApp"}
        </button>

        {!zap && (
          <p style={{ fontSize: "0.72rem", color: "#9a8060" }}>
            Sem telefone na ficha: o crédito é lançado, mas a mensagem não abre.
          </p>
        )}
      </div>

      {linkPendente && (
        <a href={linkPendente} target="_blank" rel="noreferrer"
          style={{ display: "block", marginTop: "0.5rem", fontSize: "0.8rem", fontWeight: 700, color: "#1a8a2a" }}>
          Crédito lançado. O navegador bloqueou a aba — clique aqui para abrir o WhatsApp →
        </a>
      )}

      {erro && <p style={{ fontSize: "0.75rem", color: "#c04040", marginTop: "0.4rem" }}>{erro}</p>}
    </div>
  );
}
