"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type Mes = { rotulo: string; vendido: number; entrou: number; saiu: number };
type Pendencia = { id: string; cliente: string; valor: number; dias: number };
type Peca = { id: string; nome: string; estoque: number };

export type DadosDoPainel = {
  hoje: { vendido: number; pedidos: number };
  mes: {
    vendido: number; pedidos: number; ticket: number;
    entrou: number; saiu: number; aReceber: number;
    porForma: { forma: string; rotulo: string; valor: number }[];
  };
  mesPassado: { vendido: number };
  grafico: Mes[];
  atrasados: Pendencia[];
  semEstoque: number;
  estoqueBaixo: Peca[];
  semFoto: number;
  valorEmEstoque: number;
};

const CARTAO = {
  backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.12)",
  borderRadius: "1rem", padding: "1.1rem 1.25rem",
} as const;

export default function PainelInicial({ d }: { d: DadosDoPainel }) {
  const variacao = d.mesPassado.vendido > 0
    ? ((d.mes.vendido - d.mesPassado.vendido) / d.mesPassado.vendido) * 100
    : null;

  // A escala do gráfico vem do maior valor de qualquer barra: fixá-la achataria
  // os meses fracos e exageraria os fortes.
  const teto = Math.max(1, ...d.grafico.flatMap(m => [m.vendido, m.entrou, m.saiu]));

  return (
    <div style={{ display: "grid", gap: "1rem" }}>

      {/* ── O que exige ação. Vem primeiro porque é o que estraga o dia ── */}
      {(d.atrasados.length > 0 || d.semEstoque > 0) && (
        <div style={{ ...CARTAO, borderColor: "rgba(192,64,64,0.35)", backgroundColor: "#fff6f6" }}>
          <div style={{ color: "#a03030", fontSize: "0.72rem", fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
            Precisa de você
          </div>
          <div style={{ display: "grid", gap: "0.4rem" }}>
            {d.atrasados.slice(0, 4).map(a => (
              <Link key={a.id} href={`/admin/pedidos?busca=${encodeURIComponent(a.cliente)}`}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", textDecoration: "none", padding: "0.4rem 0", borderBottom: "1px solid rgba(192,64,64,0.12)" }}>
                <span style={{ color: "#5a2a2a", fontSize: "0.85rem", fontWeight: 600 }}>{a.cliente}</span>
                <span style={{ color: "#9a6060", fontSize: "0.73rem", whiteSpace: "nowrap" }}>
                  {a.dias} {a.dias === 1 ? "dia" : "dias"} em atraso
                </span>
                <strong style={{ color: "#c04040", fontSize: "0.88rem", whiteSpace: "nowrap" }}>{formatCurrency(a.valor)}</strong>
              </Link>
            ))}
            {d.atrasados.length > 4 && (
              <Link href="/admin/caderno" style={{ color: "#a03030", fontSize: "0.78rem", fontWeight: 700, textDecoration: "underline", marginTop: "0.2rem" }}>
                e mais {d.atrasados.length - 4} em atraso →
              </Link>
            )}
            {d.semEstoque > 0 && (
              <Link href="/admin/produtos?status=sem_estoque"
                style={{ color: "#a03030", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none", paddingTop: "0.3rem" }}>
                📦 {d.semEstoque} peça{d.semEstoque === 1 ? "" : "s"} sem estoque na vitrine →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Vendido e Entrou, lado a lado. São números diferentes ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "1rem" }}>
        <div style={CARTAO}>
          <div style={{ color: "#9a8060", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Vendido no mês
          </div>
          <div style={{ color: "#1a1510", fontSize: "1.85rem", fontWeight: 900, margin: "0.25rem 0 0.1rem" }}>
            {formatCurrency(d.mes.vendido)}
          </div>
          <div style={{ color: "#9a8060", fontSize: "0.76rem" }}>
            {d.mes.pedidos} pedido{d.mes.pedidos === 1 ? "" : "s"} · ticket {formatCurrency(d.mes.ticket)}
            {variacao !== null && (
              <span style={{ color: variacao >= 0 ? "#1a8a2a" : "#c04040", fontWeight: 700, marginLeft: "0.4rem" }}>
                {variacao >= 0 ? "▲" : "▼"} {Math.abs(variacao).toFixed(0)}% vs mês passado
              </span>
            )}
          </div>
        </div>

        <div style={{ ...CARTAO, borderColor: "rgba(26,138,42,0.3)" }}>
          <div style={{ color: "#9a8060", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Entrou de verdade
          </div>
          <div style={{ color: "#1a8a2a", fontSize: "1.85rem", fontWeight: 900, margin: "0.25rem 0 0.1rem" }}>
            {formatCurrency(d.mes.entrou)}
          </div>
          {/*
            Só afirma o que o número sustenta.
            A primeira versão dizia "tudo que foi vendido já caiu" quando não
            havia recebimento futuro — e isso era falso: os dois números também
            diferem por venda no caderno ainda não paga, e por dinheiro de mês
            passado caindo agora. Dizer de menos é melhor que dizer errado.
          */}
          <div style={{ color: "#9a8060", fontSize: "0.76rem" }}>
            {d.mes.aReceber > 0
              ? <>ainda a cair: <strong>{formatCurrency(d.mes.aReceber)}</strong> em link/cartão</>
              : "nenhum recebimento agendado para frente"}
          </div>
        </div>

        <div style={CARTAO}>
          <div style={{ color: "#9a8060", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Saiu no mês
          </div>
          <div style={{ color: "#c04040", fontSize: "1.85rem", fontWeight: 900, margin: "0.25rem 0 0.1rem" }}>
            {formatCurrency(d.mes.saiu)}
          </div>
          <div style={{ color: "#9a8060", fontSize: "0.76rem" }}>
            sobrou {formatCurrency(d.mes.entrou - d.mes.saiu)} do que entrou
          </div>
        </div>
      </div>

      {/* ── Por onde o dinheiro entrou ── */}
      {d.mes.porForma.length > 0 && (
        <div style={CARTAO}>
          <div style={{ color: "#9a8060", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.7rem" }}>
            Como entrou este mês
          </div>
          <div style={{ display: "grid", gap: "0.45rem" }}>
            {d.mes.porForma.map(f => {
              const pct = d.mes.entrou > 0 ? (f.valor / d.mes.entrou) * 100 : 0;
              return (
                <div key={f.forma} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ color: "#5a4a2a", fontSize: "0.8rem", minWidth: 118 }}>{f.rotulo}</span>
                  <div style={{ flex: 1, height: 8, backgroundColor: "#f0e8d0", borderRadius: 999, overflow: "hidden", minWidth: 40 }}>
                    <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", backgroundColor: "#b8891a" }} />
                  </div>
                  <strong style={{ color: "#1a1510", fontSize: "0.82rem", minWidth: 86, textAlign: "right" }}>
                    {formatCurrency(f.valor)}
                  </strong>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Seis meses, três barras cada ── */}
      <div style={CARTAO}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.9rem" }}>
          <span style={{ color: "#9a8060", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Últimos 6 meses
          </span>
          <span style={{ display: "flex", gap: "0.7rem", fontSize: "0.7rem", color: "#9a8060" }}>
            <span>▪ <span style={{ color: "#1a1510" }}>vendido</span></span>
            <span style={{ color: "#1a8a2a" }}>▪ entrou</span>
            <span style={{ color: "#c04040" }}>▪ saiu</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height: 150 }}>
          {d.grafico.map(m => (
            <div key={m.rotulo} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 120, width: "100%", justifyContent: "center" }}>
                {([["#1a1510", m.vendido], ["#1a8a2a", m.entrou], ["#c04040", m.saiu]] as const).map(([cor, v], i) => (
                  <div key={i} title={formatCurrency(v)}
                    style={{ width: "28%", maxWidth: 18, height: `${Math.max(2, (v / teto) * 120)}px`, backgroundColor: cor, borderRadius: "3px 3px 0 0" }} />
                ))}
              </div>
              <span style={{ color: "#9a8060", fontSize: "0.68rem", whiteSpace: "nowrap" }}>{m.rotulo}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Saúde do estoque ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "1rem" }}>
        <div style={CARTAO}>
          <div style={{ color: "#9a8060", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Estoque
          </div>
          <div style={{ color: "#1a1510", fontSize: "1.4rem", fontWeight: 900 }}>{formatCurrency(d.valorEmEstoque)}</div>
          <div style={{ color: "#9a8060", fontSize: "0.76rem", marginTop: "0.15rem" }}>parado na arara, a preço de venda</div>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.7rem", flexWrap: "wrap" }}>
            <Link href="/admin/produtos?status=sem_estoque" style={{ color: d.semEstoque ? "#c04040" : "#9a8060", fontSize: "0.78rem", fontWeight: 700, textDecoration: "none" }}>
              {d.semEstoque} sem estoque
            </Link>
            <Link href="/admin/produtos" style={{ color: d.semFoto ? "#b8891a" : "#9a8060", fontSize: "0.78rem", fontWeight: 700, textDecoration: "none" }}>
              📷 {d.semFoto} sem foto
            </Link>
          </div>
        </div>

        <div style={CARTAO}>
          <div style={{ color: "#9a8060", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Acabando
          </div>
          {d.estoqueBaixo.length === 0 ? (
            <div style={{ color: "#9a8060", fontSize: "0.84rem" }}>Nenhuma peça na reserva. ✓</div>
          ) : (
            <div style={{ display: "grid", gap: "0.3rem" }}>
              {d.estoqueBaixo.slice(0, 5).map(p => (
                <Link key={p.id} href={`/admin/produtos/${p.id}`}
                  style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", textDecoration: "none", fontSize: "0.82rem" }}>
                  <span style={{ color: "#3a2a10", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</span>
                  <strong style={{ color: p.estoque <= 1 ? "#c04040" : "#b8891a", whiteSpace: "nowrap" }}>{p.estoque} un</strong>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Atalhos do dia ── */}
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        {[
          { href: "/admin/pedidos/novo", rotulo: "+ Nova venda", destaque: true },
          { href: "/admin/stories", rotulo: "📱 Stories de hoje" },
          { href: "/admin/financeiro/completo", rotulo: "💳 Financeiro" },
          { href: "/admin/liquida", rotulo: "💸 Liquidação" },
        ].map(a => (
          <Link key={a.href} href={a.href}
            style={{ padding: "0.7rem 1.1rem", borderRadius: "0.75rem", textDecoration: "none", fontWeight: 800, fontSize: "0.85rem",
                     backgroundColor: a.destaque ? "#b8891a" : "#fff", color: a.destaque ? "#fff" : "#5a4a2a",
                     border: a.destaque ? "none" : "1px solid rgba(140,100,20,0.2)" }}>
            {a.rotulo}
          </Link>
        ))}
      </div>
    </div>
  );
}
