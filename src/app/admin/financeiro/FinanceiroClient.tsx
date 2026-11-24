"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import DespesasClient from "./DespesasClient";

type Resumo = {
  vendido: number; pedidos: number; ticket: number;
  entrou: number; porForma: { forma: string; rotulo: string; valor: number }[];
  naoEntrou: { forma: string; rotulo: string; valor: number }[];
  saiu: number; aReceber: number; emAberto: number; atrasados: number;
};
type Venda = { id: string; cliente: string; valor: number; data: string; forma: string; pago: boolean; emAberto: number };
type Recebimento = { id: string; cliente: string; valor: number; data: string; forma: string; dinheiro: boolean };
type Despesa = { id: string; descricao: string; valor: number; data: string; categoria: string; forma: string; vencimento: string | null; parcela: string | null };

const CARTAO = { backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.12)", borderRadius: "1rem" } as const;
const dia = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export default function FinanceiroClient({
  mesAtual, nomeMes, mesFuturo, meses, resumo, vendas, recebimentos, despesas,
}: {
  mesAtual: string; nomeMes: string; mesFuturo?: boolean;
  meses: { valor: string; rotulo: string }[];
  resumo: Resumo; vendas: Venda[]; recebimentos: Recebimento[]; despesas: Despesa[];
}) {
  const router = useRouter();
  const [aba, setAba] = useState<"vendas" | "saidas" | "cartao">("vendas");

  /**
   * Recebimentos gravados na data da venda, de link e cartão.
   *
   * O aviso só aparece quando há o que corrigir e some sozinho depois —
   * botão de manutenção parado para sempre numa tela vira ruído.
   */
  type Desalinhado = { cliente: string; valor: number; forma: string; de: string; para: string };
  const [desalinhados, setDesalinhados] = useState<{ quantos: number; total: number; exemplos: Desalinhado[] } | null>(null);
  const [alinhando, setAlinhando] = useState(false);

  useEffect(() => {
    fetch("/api/admin/financeiro/alinhar-recebimentos")
      .then(r => r.ok ? r.json() : null)
      .then(d => setDesalinhados(d && d.quantos > 0 ? d : null))
      .catch(() => {});
  }, []);

  const alinhar = async () => {
    setAlinhando(true);
    const r = await fetch("/api/admin/financeiro/alinhar-recebimentos", { method: "POST" });
    if (r.ok) {
      const { corrigidos } = await r.json();
      alert(`${corrigidos} recebimento(s) movido(s) para o mês em que o dinheiro cai. Nenhum valor foi alterado.`);
      setDesalinhados(null);
      router.refresh();
    }
    setAlinhando(false);
  };

  const cartao = despesas.filter(d => d.forma === "cartao_credito");

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.75rem 1.1rem 6rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>
      <a href="/admin" style={{ color: "#b8891a", fontSize: "0.85rem", textDecoration: "none" }}>← Admin</a>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", margin: "0.2rem 0 1.2rem" }}>
        <h1 style={{ color: "#1a1510", fontSize: "1.6rem", fontWeight: 900, margin: 0, textTransform: "capitalize" }}>
          💳 {nomeMes}
        </h1>
        <select value={mesAtual} onChange={e => router.push(`/admin/financeiro?mes=${e.target.value}`)}
          style={{ padding: "0.5rem 0.8rem", border: "1px solid rgba(140,100,20,0.25)", borderRadius: "0.6rem", fontSize: "0.82rem", backgroundColor: "#fff", textTransform: "capitalize" }}>
          {meses.map(m => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
        </select>
      </div>

      {desalinhados && (
        <div style={{ ...CARTAO, padding: "1rem 1.1rem", marginBottom: "1.1rem", backgroundColor: "#fff8e1", borderColor: "rgba(184,137,26,0.45)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ color: "#5a4a2a", fontSize: "0.84rem", lineHeight: 1.55, maxWidth: 660 }}>
            <strong>{desalinhados.quantos} recebimento(s)</strong> de link/cartão estão somados no mês da
            venda, e não no mês em que o dinheiro cai — {formatCurrency(desalinhados.total)} no total.
            {/* As linhas, nomeadas: ele confere antes de clicar. */}
            <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.15rem" }}>
              {(desalinhados.exemplos || []).map((e, i) => (
                <div key={i} style={{ color: "#9a8060", fontSize: "0.77rem" }}>
                  {e.cliente} · {formatCurrency(e.valor)} · {e.forma} · {dia(e.de)} → <strong style={{ color: "#5a4a2a" }}>{dia(e.para)}</strong>
                </div>
              ))}
              {desalinhados.quantos > (desalinhados.exemplos || []).length && (
                <div style={{ color: "#9a8060", fontSize: "0.77rem" }}>
                  e mais {desalinhados.quantos - (desalinhados.exemplos || []).length}.
                </div>
              )}
            </div>
            <span style={{ color: "#9a8060", fontSize: "0.77rem" }}>Só a data muda. Nenhum valor é alterado.</span>
          </div>
          <button onClick={alinhar} disabled={alinhando}
            style={{ backgroundColor: "#b8891a", color: "#fff", fontWeight: 800, fontSize: "0.82rem", padding: "0.6rem 1.1rem", borderRadius: "0.7rem", border: "none", cursor: alinhando ? "wait" : "pointer", whiteSpace: "nowrap" }}>
            {alinhando ? "corrigindo…" : "Corrigir os meses"}
          </button>
        </div>
      )}

      {/* ── Os números do mês, acima das abas: eles não mudam de aba ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.8rem", marginBottom: "1.2rem" }}>
        {[
          { r: "Vendido", v: resumo.vendido, cor: "#1a1510", sub: `${resumo.pedidos} pedidos · ticket ${formatCurrency(resumo.ticket)}` },
          { r: "Entrou", v: resumo.entrou, cor: "#1a8a2a", sub: resumo.aReceber > 0 ? `a cair: ${formatCurrency(resumo.aReceber)}` : "nada agendado para frente" },
          { r: "Saiu", v: resumo.saiu, cor: "#c04040", sub: `sobrou ${formatCurrency(resumo.entrou - resumo.saiu)}` },
          { r: "Em aberto", v: resumo.emAberto, cor: "#b8891a", sub: resumo.atrasados > 0 ? `${resumo.atrasados} em atraso` : "nenhum atrasado" },
        ].map(k => (
          <div key={k.r} style={{ ...CARTAO, padding: "0.95rem 1.1rem" }}>
            <div style={{ color: "#9a8060", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{k.r}</div>
            <div style={{ color: k.cor, fontSize: "1.5rem", fontWeight: 900, margin: "0.2rem 0 0.1rem" }}>{formatCurrency(k.v)}</div>
            <div style={{ color: "#9a8060", fontSize: "0.72rem" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Três abas, e só três ── */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.1rem", borderBottom: "2px solid rgba(140,100,20,0.12)" }}>
        {([["vendas", "📈 Vendas"], ["saidas", "📉 Saídas"], ["cartao", "💳 Cartão"]] as const).map(([k, r]) => (
          <button key={k} onClick={() => setAba(k)}
            style={{ padding: "0.6rem 1rem", border: "none", background: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: 800,
                     color: aba === k ? "#b8891a" : "#9a8060",
                     borderBottom: aba === k ? "2px solid #b8891a" : "2px solid transparent", marginBottom: -2 }}>
            {r}
          </button>
        ))}
      </div>

      {aba === "vendas" && (
        <div style={{ display: "grid", gap: "1rem" }}>
          {resumo.porForma.length > 0 && (
            <div style={{ ...CARTAO, padding: "1rem 1.1rem" }}>
              <div style={{ color: "#9a8060", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
                Como o dinheiro entrou
              </div>
              {resumo.porForma.map(f => {
                const pct = resumo.entrou > 0 ? (f.valor / resumo.entrou) * 100 : 0;
                return (
                  <div key={f.forma} style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
                    <span style={{ color: "#5a4a2a", fontSize: "0.8rem", minWidth: 120 }}>{f.rotulo}</span>
                    <div style={{ flex: 1, height: 8, backgroundColor: "#f0e8d0", borderRadius: 999, overflow: "hidden", minWidth: 30 }}>
                      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", backgroundColor: "#b8891a" }} />
                    </div>
                    <strong style={{ color: "#1a1510", fontSize: "0.82rem", minWidth: 88, textAlign: "right" }}>{formatCurrency(f.valor)}</strong>
                  </div>
                );
              })}
              {/*
                Crédito usado sai das barras e vira nota. Ele estava entre as
                linhas sem entrar no total, e aí a soma das barras não fechava
                com o "Entrou" — o que faz desconfiar do número certo.
              */}
              {resumo.naoEntrou.map(f => (
                <div key={f.forma} style={{ color: "#9a8060", fontSize: "0.75rem", marginTop: "0.6rem", lineHeight: 1.5 }}>
                  Fora disso, <strong>{formatCurrency(f.valor)}</strong> em {f.rotulo.toLowerCase()} — abatido
                  na compra (cashback, devolução), não é dinheiro que caiu na conta.
                </div>
              ))}
            </div>
          )}

          <Lista titulo={`Vendas do mês (${vendas.length})`} vazio="Nenhuma venda neste mês.">
            {vendas.map(v => (
              <Linha key={v.id} esquerda={v.cliente} meio={`${dia(v.data)} · ${v.forma}`}
                direita={formatCurrency(v.valor)}
                aviso={v.emAberto > 0 ? `${formatCurrency(v.emAberto)} em aberto` : undefined} />
            ))}
          </Lista>

          <Lista titulo={`${mesFuturo ? "Dinheiro agendado para o mês" : "Dinheiro que caiu no mês"} (${recebimentos.filter(r => r.dinheiro).length})`}
            vazio="Nenhum recebimento neste mês."
            nota={mesFuturo
              ? "Mês que ainda não chegou: são recebimentos agendados, de venda no link e cartão, não dinheiro confirmado."
              : "Inclui venda de meses anteriores cujo dinheiro caiu agora. Venda no link cai 31 dias depois, então aparece no mês seguinte."}>
            {recebimentos.map(r => (
              <Linha key={r.id} esquerda={r.cliente} meio={`${dia(r.data)} · ${r.forma}`}
                direita={formatCurrency(r.valor)} verde={r.dinheiro}
                aviso={r.dinheiro ? undefined : "não é dinheiro novo"} avisoNeutro />
            ))}
          </Lista>
        </div>
      )}

      {aba === "saidas" && <DespesasClient />}

      {aba === "cartao" && (
        <Lista titulo={`Faturas e parcelas no cartão (${cartao.length})`}
          vazio="Nada lançado no cartão neste mês."
          nota="Cada linha aparece no mês em que é cobrada, não no da compra.">
          {cartao.map(d => (
            <Linha key={d.id} esquerda={d.descricao}
              meio={`${d.vencimento ? `vence ${dia(d.vencimento)}` : dia(d.data)}${d.parcela ? ` · parcela ${d.parcela}` : ""}`}
              direita={formatCurrency(d.valor)} />
          ))}
        </Lista>
      )}
    </div>
  );
}

function Lista({ titulo, vazio, nota, children }: { titulo: string; vazio: string; nota?: string; children: React.ReactNode }) {
  const temItens = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div style={{ ...CARTAO, overflow: "hidden" }}>
      <div style={{ padding: "0.9rem 1.1rem 0.6rem" }}>
        <div style={{ color: "#1a1510", fontSize: "0.9rem", fontWeight: 800 }}>{titulo}</div>
        {nota && <div style={{ color: "#9a8060", fontSize: "0.72rem", marginTop: "0.15rem" }}>{nota}</div>}
      </div>
      {temItens
        ? <div>{children}</div>
        : <div style={{ padding: "0 1.1rem 1rem", color: "#9a8060", fontSize: "0.82rem" }}>{vazio}</div>}
    </div>
  );
}

function Linha({ esquerda, meio, direita, aviso, verde, avisoNeutro }: {
  esquerda: string; meio: string; direita: string; aviso?: string; verde?: boolean;
  // aviso em vermelho quer dizer problema (atraso, pendência). "Não é dinheiro
  // novo" é só um esclarecimento, e vermelho ali assustaria sem motivo.
  avisoNeutro?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.6rem 1.1rem", borderTop: "1px solid rgba(140,100,20,0.08)", flexWrap: "wrap" }}>
      <span style={{ color: "#1a1510", fontSize: "0.85rem", fontWeight: 600, flex: 1, minWidth: 110 }}>{esquerda}</span>
      <span style={{ color: "#9a8060", fontSize: "0.74rem", whiteSpace: "nowrap" }}>{meio}</span>
      {aviso && <span style={{ color: avisoNeutro ? "#9a8060" : "#c04040", fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>{aviso}</span>}
      <strong style={{ color: verde ? "#1a8a2a" : "#1a1510", fontSize: "0.86rem", whiteSpace: "nowrap", minWidth: 82, textAlign: "right" }}>{direita}</strong>
    </div>
  );
}
