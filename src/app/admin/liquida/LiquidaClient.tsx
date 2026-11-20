"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

export type PecaNaLista = {
  id: string; nome: string; categoria: string; foto: string | null;
  preco: number; custo: number | null; estoque: number;
  dias: number; parado: number; peso: number;
  tetoDesconto: number | null;
  emSale: boolean; descontoAtual: number | null; bloqueada: boolean;
};

const FAIXAS = [
  { rotulo: "tudo", minDias: 0 },
  { rotulo: "90+ dias", minDias: 90 },
  { rotulo: "180+ dias", minDias: 180 },
  { rotulo: "1 ano+", minDias: 365 },
];

const CAMPO: React.CSSProperties = {
  border: "1px solid rgba(140,100,20,0.25)", borderRadius: "0.45rem",
  padding: "0.45rem 0.6rem", fontSize: "0.85rem", color: "#1a1510",
  backgroundColor: "#fff", fontFamily: "inherit",
};

/**
 * Decidir a liquidação sem entrar peça por peça.
 *
 * A lista já vem na ordem da decisão — mais dinheiro parado há mais tempo
 * primeiro. O trabalho da tela é deixar marcar várias e aplicar de uma vez,
 * mostrando antes o que vai acontecer com cada uma.
 */
export default function LiquidaClient({ pecas }: { pecas: PecaNaLista[] }) {
  const router = useRouter();
  const [faixa, setFaixa] = useState(0);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [desconto, setDesconto] = useState("30");
  const [ocupado, setOcupado] = useState(false);
  const [recado, setRecado] = useState<string | null>(null);

  const visiveis = useMemo(
    () => pecas.filter(p => p.dias >= FAIXAS[faixa].minDias),
    [pecas, faixa],
  );

  const selecionadas = useMemo(
    () => visiveis.filter(p => marcadas.has(p.id)),
    [visiveis, marcadas],
  );

  const pedido = Math.round(Number(desconto)) || 0;

  /**
   * O que acontece com cada peça marcada, calculado antes de aplicar.
   * A mesma conta roda no servidor; aqui é só para você ver primeiro.
   */
  const plano = useMemo(() => {
    const cabe: PecaNaLista[] = [], apara: PecaNaLista[] = [], semCusto: PecaNaLista[] = [];
    for (const p of selecionadas) {
      if (p.tetoDesconto === null) semCusto.push(p);
      else if (pedido <= p.tetoDesconto) cabe.push(p);
      else apara.push(p);
    }
    // Quanto entra em caixa se tudo que está marcado vender.
    const entra = [...cabe, ...apara].reduce((s, p) => {
      const d = p.tetoDesconto !== null && pedido > p.tetoDesconto ? p.tetoDesconto : pedido;
      return s + p.preco * (100 - d) / 100 * p.estoque;
    }, 0);
    const paradoMarcado = selecionadas.reduce((s, p) => s + p.parado, 0);
    return { cabe, apara, semCusto, entra, paradoMarcado };
  }, [selecionadas, pedido]);

  const totalParado = visiveis.reduce((s, p) => s + p.parado, 0);

  const alterna = (id: string) => {
    const nova = new Set(marcadas);
    nova.has(id) ? nova.delete(id) : nova.add(id);
    setMarcadas(nova);
  };
  const marcarTodas = () => {
    const todasMarcadas = visiveis.every(p => marcadas.has(p.id));
    setMarcadas(todasMarcadas ? new Set() : new Set(visiveis.map(p => p.id)));
  };

  const aplicar = async () => {
    if (!selecionadas.length) return;
    const partes = [`${plano.cabe.length} peça(s) com ${pedido}%`];
    if (plano.apara.length) partes.push(`${plano.apara.length} com o máximo delas (não aguentam ${pedido}%)`);
    if (plano.semCusto.length) partes.push(`${plano.semCusto.length} ficam de fora (sem custo cadastrado)`);
    if (!confirm(`Aplicar?\n\n${partes.join("\n")}`)) return;

    setOcupado(true); setRecado(null);
    try {
      const r = await fetch("/api/admin/liquida", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...marcadas], desconto: pedido, aparar: true }),
      });
      const d = await r.json();
      if (!r.ok) { setRecado(d.error || "Não consegui aplicar."); return; }
      const fim = [`${d.aplicadas} peça(s) com ${pedido}%`];
      if (d.aparadas?.length) fim.push(`${d.aparadas.length} aparada(s) no máximo delas`);
      if (d.recusadas?.length) fim.push(`${d.recusadas.length} sem custo, deixadas de fora`);
      setRecado("✅ " + fim.join(" · "));
      setMarcadas(new Set());
      router.refresh();
    } catch {
      setRecado("Não consegui aplicar. Tente de novo.");
    } finally { setOcupado(false); }
  };

  const tirar = async () => {
    if (!selecionadas.length) return;
    if (!confirm(`Tirar ${selecionadas.length} peça(s) da liquidação, voltando ao preço cheio?`)) return;
    setOcupado(true); setRecado(null);
    try {
      const r = await fetch("/api/admin/liquida", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...marcadas] }),
      });
      if (!r.ok) { setRecado("Não consegui tirar."); return; }
      setRecado("✅ Peças de volta ao preço cheio");
      setMarcadas(new Set());
      router.refresh();
    } finally { setOcupado(false); }
  };

  return (
    <div style={{ backgroundColor: "#FAF6EE", minHeight: "100vh", padding: "2rem 1.25rem 10rem" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>

        <a href="/admin" style={{ color: "#b8891a", fontSize: "0.85rem", textDecoration: "none" }}>← Admin</a>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, color: "#1a1510", marginTop: "0.3rem" }}>
          💸 Liquidação
        </h1>
        <p style={{ color: "#9a8060", fontSize: "0.85rem", marginTop: "0.4rem", maxWidth: "62ch", lineHeight: 1.5 }}>
          Ordenado pelo dinheiro que está parado há mais tempo — não pela data.
          Marque as peças e aplique o desconto de uma vez. Nenhuma desce abaixo do custo.
        </p>

        {/* ── Resumo ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "0.75rem", margin: "1.25rem 0" }}>
          <Cartao rotulo="peças na faixa" valor={String(visiveis.length)} />
          <Cartao rotulo="dinheiro parado" valor={formatCurrency(totalParado)} destaque />
          <Cartao rotulo="já em liquidação" valor={String(visiveis.filter(p => p.emSale).length)} />
          <Cartao rotulo="sem custo cadastrado" valor={String(visiveis.filter(p => p.tetoDesconto === null).length)} />
        </div>

        {/* ── Faixas ── */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {FAIXAS.map((f, i) => (
            <button key={f.rotulo} onClick={() => { setFaixa(i); setMarcadas(new Set()); }}
              style={{
                padding: "0.4rem 0.9rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700,
                cursor: "pointer", border: i === faixa ? "none" : "1px solid rgba(140,100,20,0.25)",
                backgroundColor: i === faixa ? "#b8891a" : "#fff", color: i === faixa ? "#fff" : "#7a6030",
              }}>
              {f.rotulo}
            </button>
          ))}
          <button onClick={marcarTodas}
            style={{ padding: "0.4rem 0.9rem", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700,
                     cursor: "pointer", border: "1px solid rgba(140,100,20,0.25)", backgroundColor: "#fff", color: "#7a6030" }}>
            {visiveis.every(p => marcadas.has(p.id)) && visiveis.length > 0 ? "desmarcar todas" : "marcar todas"}
          </button>
        </div>

        {recado && (
          <p style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.75rem",
                      color: recado.startsWith("✅") ? "#1a8a2a" : "#c04040" }}>{recado}</p>
        )}

        {/* ── Lista ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {visiveis.map(p => {
            const marcada = marcadas.has(p.id);
            const naoAguenta = p.tetoDesconto !== null && pedido > p.tetoDesconto;
            return (
              <div key={p.id} onClick={() => alterna(p.id)} className="linha-liquida"
                style={{
                  backgroundColor: marcada ? "#fff8e8" : "#fff", cursor: "pointer",
                  border: `1px solid ${marcada ? "#b8891a" : "rgba(140,100,20,0.14)"}`,
                  borderRadius: "0.75rem", padding: "0.75rem 0.9rem",
                }}>
                <input type="checkbox" checked={marcada} onChange={() => alterna(p.id)}
                  onClick={e => e.stopPropagation()} aria-label={`Selecionar ${p.nome}`}
                  style={{ width: 17, height: 17, accentColor: "#b8891a", flexShrink: 0 }} />

                <div className="foto-liquida">
                  {p.foto
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
                    : <span style={{ fontSize: "0.55rem", color: "#b8a080" }}>sem foto</span>}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.9rem" }}>{p.nome}</div>
                  <div style={{ fontSize: "0.72rem", color: "#9a8060" }}>
                    {p.categoria} · {p.estoque} un.
                    {p.emSale && <span style={{ color: "#c0392b", fontWeight: 700 }}> · já com {p.descontoAtual || 20}%</span>}
                  </div>
                </div>

                <Coluna rotulo="parada há">
                  <span style={{ fontWeight: 800, color: p.dias >= 180 ? "#c0392b" : "#1a1510" }}>{p.dias}</span>
                  <span style={{ color: "#9a8060" }}> dias</span>
                </Coluna>

                <Coluna rotulo="dinheiro parado">
                  <span style={{ fontWeight: 800, color: "#1a1510" }}>{formatCurrency(p.parado)}</span>
                </Coluna>

                <Coluna rotulo="desconto máximo">
                  {p.tetoDesconto === null
                    ? <span style={{ color: "#c0392b", fontWeight: 700, fontSize: "0.78rem" }}>sem custo</span>
                    : <span style={{ fontWeight: 800, color: naoAguenta ? "#c0392b" : "#1a8a2a" }}>
                        {p.tetoDesconto}%
                      </span>}
                </Coluna>
              </div>
            );
          })}
          {visiveis.length === 0 && (
            <p style={{ textAlign: "center", padding: "3rem", color: "#9a8060" }}>
              Nenhuma peça parada nessa faixa.
            </p>
          )}
        </div>
      </div>

      {/* ── Barra de ação: só aparece com peça marcada ── */}
      {selecionadas.length > 0 && (
        <div className="barra-liquida" style={{
          backgroundColor: "#1a1510", color: "#fff", padding: "0.9rem 1.25rem",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.25)",
        }}>
          <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", gap: "1rem",
                        alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ minWidth: 150 }}>
              <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>{selecionadas.length} peça(s)</div>
              <div style={{ fontSize: "0.72rem", color: "#c8b48a" }}>
                {formatCurrency(plano.paradoMarcado)} parados
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <input style={{ ...CAMPO, width: 72 }} value={desconto} inputMode="numeric"
                onChange={e => setDesconto(e.target.value.replace(/\D/g, "").slice(0, 2))}
                aria-label="Desconto em porcentagem" />
              <span style={{ fontWeight: 800 }}>% off</span>
            </div>

            <div className="aviso-liquida" style={{ fontSize: "0.78rem", color: "#c8b48a", flex: 1, minWidth: 220, lineHeight: 1.45 }}>
              {plano.apara.length > 0 && (
                <div style={{ color: "#ffb84d" }}>
                  ⚠ {plano.apara.length} não aguenta(m) {pedido}% — vão com o máximo delas
                </div>
              )}
              {plano.semCusto.length > 0 && (
                <div style={{ color: "#ff9a8a" }}>
                  {plano.semCusto.length} sem custo cadastrado: ficam de fora
                </div>
              )}
              {plano.entra > 0 && (
                <div>entra <strong style={{ color: "#fff" }}>{formatCurrency(plano.entra)}</strong> se tudo vender</div>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={tirar} disabled={ocupado}
                style={{ padding: "0.6rem 1rem", borderRadius: "0.5rem", border: "1px solid rgba(255,255,255,0.3)",
                         backgroundColor: "transparent", color: "#fff", fontWeight: 700, fontSize: "0.82rem",
                         cursor: ocupado ? "wait" : "pointer" }}>
                Tirar da liquidação
              </button>
              <button onClick={aplicar} disabled={ocupado || pedido < 1}
                style={{ padding: "0.6rem 1.4rem", borderRadius: "0.5rem", border: "none",
                         backgroundColor: "#b8891a", color: "#fff", fontWeight: 800, fontSize: "0.85rem",
                         cursor: ocupado || pedido < 1 ? "not-allowed" : "pointer", opacity: ocupado ? 0.6 : 1 }}>
                {ocupado ? "Aplicando…" : `Aplicar ${pedido}%`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Cartao({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.14)",
                  borderRadius: "0.75rem", padding: "0.85rem 1rem" }}>
      <div style={{ fontSize: "1.25rem", fontWeight: 900, color: destaque ? "#b8891a" : "#1a1510" }}>{valor}</div>
      <div style={{ fontSize: "0.72rem", color: "#9a8060", marginTop: "0.15rem" }}>{rotulo}</div>
    </div>
  );
}

function Coluna({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: "0.65rem", color: "#b8a080", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {rotulo}
      </div>
      <div style={{ fontSize: "0.9rem", marginTop: "0.1rem" }}>{children}</div>
    </div>
  );
}
