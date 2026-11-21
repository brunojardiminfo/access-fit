"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Cliente = { id: string; name: string | null; email: string };
type Parceira = {
  id: string; nome: string; codigo: string; telefone: string | null;
  comissao: number; ativa: boolean; token: string;
  user: { id: string; name: string | null; email: string } | null;
  pedidos: number; vendido: number; cashbackGerado: number;
  jaCreditado: number; aCreditar: number; saldoNaLoja: number;
};

const CARTAO = {
  backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.12)",
  borderRadius: "1rem", padding: "1.25rem",
} as const;

const INP = {
  padding: "0.55rem 0.8rem", border: "1px solid rgba(140,100,20,0.25)",
  borderRadius: "0.6rem", fontSize: "0.82rem", backgroundColor: "#FAF6EE", outline: "none",
} as const;

export default function ParceirasClient({ clientes }: { clientes: Cliente[] }) {
  const [lista, setLista] = useState<Parceira[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [novo, setNovo] = useState({ nome: "", codigo: "", telefone: "", comissao: "5", userId: "" });
  const [abrirNovo, setAbrirNovo] = useState(false);

  const buscar = async () => {
    const r = await fetch("/api/admin/parceiras");
    if (r.ok) setLista((await r.json()).parceiras);
    setCarregando(false);
  };
  useEffect(() => { buscar(); }, []);

  const criar = async () => {
    setErro(""); setOcupado("novo");
    const r = await fetch("/api/admin/parceiras", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(novo),
    });
    const j = await r.json();
    if (!r.ok) setErro(j.error || "Não deu para cadastrar");
    else { setNovo({ nome: "", codigo: "", telefone: "", comissao: "5", userId: "" }); setAbrirNovo(false); await buscar(); }
    setOcupado(null);
  };

  const acao = async (id: string, corpo: Record<string, unknown>) => {
    setErro(""); setOcupado(id);
    const r = await fetch("/api/admin/parceiras", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...corpo }),
    });
    const j = await r.json();
    if (!r.ok) setErro(j.error || "Não deu para salvar");
    else await buscar();
    setOcupado(null);
  };

  const linkDela = (p: Parceira) =>
    typeof window !== "undefined" ? `${window.location.origin}/parceira/${p.token}` : "";

  /**
   * A mensagem já sai escrita com os números dela.
   *
   * Mandar só o link obrigaria ela a abrir para saber se mudou alguma coisa —
   * e quem não abre, pergunta. Com os números na mensagem, a conversa começa
   * resolvida e o link fica para conferir o detalhe.
   */
  const zap = (p: Parceira) => {
    const fone = (p.telefone || "").replace(/\D/g, "");
    const texto = [
      `Oi, ${p.nome.split(" ")[0]}! Seu resumo da parceria Access Fit 💛`,
      ``,
      `Vendas pelo seu código ${p.codigo}: ${p.pedidos}`,
      `Total vendido: ${formatCurrency(p.vendido)}`,
      `Seu cashback (${p.comissao}%): ${formatCurrency(p.cashbackGerado)}`,
      `Saldo disponível para usar: ${formatCurrency(p.saldoNaLoja)}`,
      ``,
      `Acompanha quando quiser por aqui: ${linkDela(p)}`,
    ].join("\n");
    return `https://wa.me/${fone.length >= 10 ? "55" + fone.slice(-11) : ""}?text=${encodeURIComponent(texto)}`;
  };

  const copiar = async (texto: string) => {
    try { await navigator.clipboard.writeText(texto); alert("Link copiado"); }
    catch { prompt("Copie o link:", texto); }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.25rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>
      <a href="/admin" style={{ color: "#b8891a", fontSize: "0.85rem", textDecoration: "none" }}>← Admin</a>
      <h1 style={{ color: "#1a1510", fontSize: "1.75rem", fontWeight: 900, margin: "0.2rem 0 0.4rem" }}>🤝 Parceiras</h1>
      <p style={{ color: "#9a8060", fontSize: "0.88rem", maxWidth: 640, lineHeight: 1.6, marginBottom: "1.5rem" }}>
        O que cada código gerou, e quanto de cashback ela tem para gastar. Uma venda conta para a
        parceira quando o pedido está marcado com ela <strong>ou</strong> quando usou o cupom dela —
        então a venda do Black November, onde o cupom não sai, só precisa ser marcada no pedido.
      </p>

      {erro && (
        <div style={{ ...CARTAO, borderColor: "rgba(192,64,64,0.4)", backgroundColor: "#fff4f4", color: "#a03030", marginBottom: "1rem", fontSize: "0.85rem" }}>
          {erro}
        </div>
      )}

      <button onClick={() => setAbrirNovo(!abrirNovo)}
        style={{ backgroundColor: "#b8891a", color: "#fff", fontWeight: 800, fontSize: "0.85rem", padding: "0.6rem 1.2rem", borderRadius: "0.7rem", border: "none", cursor: "pointer", marginBottom: "1.25rem" }}>
        {abrirNovo ? "✕ Fechar" : "+ Nova parceira"}
      </button>

      {abrirNovo && (
        <div style={{ ...CARTAO, marginBottom: "1.5rem", display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...INP, minWidth: 180 }} placeholder="Nome" value={novo.nome}
            onChange={e => setNovo({ ...novo, nome: e.target.value })} />
          <input style={{ ...INP, width: 130 }} placeholder="Código (ISA10)" value={novo.codigo}
            onChange={e => setNovo({ ...novo, codigo: e.target.value.toUpperCase() })} />
          <input style={{ ...INP, width: 150 }} placeholder="WhatsApp" value={novo.telefone}
            onChange={e => setNovo({ ...novo, telefone: e.target.value })} />
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <input style={{ ...INP, width: 70 }} type="number" value={novo.comissao}
              onChange={e => setNovo({ ...novo, comissao: e.target.value })} />
            <span style={{ fontSize: "0.82rem", color: "#9a8060" }}>% cashback</span>
          </div>
          <select style={{ ...INP, minWidth: 220 }} value={novo.userId}
            onChange={e => setNovo({ ...novo, userId: e.target.value })}>
            <option value="">Conta dela na loja (para o crédito)</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.name || c.email}</option>)}
          </select>
          <button onClick={criar} disabled={ocupado === "novo"}
            style={{ backgroundColor: "#1a8a2a", color: "#fff", fontWeight: 800, fontSize: "0.82rem", padding: "0.55rem 1.1rem", borderRadius: "0.6rem", border: "none", cursor: "pointer" }}>
            Cadastrar
          </button>
        </div>
      )}

      {carregando ? (
        <p style={{ color: "#9a8060" }}>carregando…</p>
      ) : lista.length === 0 ? (
        <div style={{ ...CARTAO, color: "#9a8060" }}>
          Nenhuma parceira cadastrada. Cadastre com o mesmo código do cupom dela — assim as vendas
          antigas, que só têm o cupom, já entram no relatório.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {lista.map(p => (
            <div key={p.id} style={{ ...CARTAO, opacity: p.ativa ? 1 : 0.55 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <strong style={{ color: "#1a1510", fontSize: "1.05rem" }}>{p.nome}</strong>
                    <span style={{ backgroundColor: "#f0e8d0", color: "#7a5a10", fontWeight: 800, fontSize: "0.7rem", padding: "0.15rem 0.55rem", borderRadius: 999 }}>
                      {p.codigo}
                    </span>
                    <span style={{ color: "#9a8060", fontSize: "0.75rem" }}>{p.comissao}% cashback</span>
                  </div>
                  <div style={{ color: "#9a8060", fontSize: "0.75rem", marginTop: "0.2rem" }}>
                    {p.user ? `conta: ${p.user.name || p.user.email}` : "⚠ sem conta ligada — não dá para creditar"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <button onClick={() => copiar(linkDela(p))}
                    style={{ ...INP, cursor: "pointer", fontWeight: 700, color: "#5a4a2a" }}>🔗 Copiar link</button>
                  {p.telefone && (
                    <a href={zap(p)} target="_blank" rel="noopener noreferrer"
                      style={{ ...INP, cursor: "pointer", fontWeight: 700, color: "#fff", backgroundColor: "#25D366", border: "none", textDecoration: "none" }}>
                      📲 Enviar no WhatsApp
                    </a>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: "0.6rem", marginTop: "1rem" }}>
                {[
                  { r: "vendas", v: String(p.pedidos) },
                  { r: "vendeu", v: formatCurrency(p.vendido) },
                  { r: "cashback gerado", v: formatCurrency(p.cashbackGerado) },
                  { r: "já creditado", v: formatCurrency(p.jaCreditado) },
                  { r: "saldo na loja", v: formatCurrency(p.saldoNaLoja), destaque: true },
                ].map(c => (
                  <div key={c.r} style={{ backgroundColor: "#FAF6EE", borderRadius: "0.7rem", padding: "0.7rem 0.85rem" }}>
                    <div style={{ color: c.destaque ? "#b8891a" : "#1a1510", fontWeight: 900, fontSize: "1.05rem" }}>{c.v}</div>
                    <div style={{ color: "#9a8060", fontSize: "0.68rem", marginTop: "0.1rem" }}>{c.r}</div>
                  </div>
                ))}
              </div>

              {p.aCreditar > 0 && (
                <div style={{ marginTop: "0.9rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span style={{ color: "#5a4a2a", fontSize: "0.85rem" }}>
                    Falta lançar <strong>{formatCurrency(p.aCreditar)}</strong> como crédito na conta dela.
                  </span>
                  <button onClick={() => acao(p.id, { acao: "creditar" })} disabled={ocupado === p.id}
                    style={{ backgroundColor: "#b8891a", color: "#fff", fontWeight: 800, fontSize: "0.8rem", padding: "0.5rem 1rem", borderRadius: "0.6rem", border: "none", cursor: ocupado === p.id ? "wait" : "pointer" }}>
                    Creditar {formatCurrency(p.aCreditar)}
                  </button>
                </div>
              )}

              <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button onClick={() => acao(p.id, { ativa: !p.ativa })}
                  style={{ fontSize: "0.72rem", color: "#9a8060", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  {p.ativa ? "desativar" : "reativar"}
                </button>
                <button onClick={() => { if (confirm("Gerar um link novo? O link antigo para de funcionar na hora.")) acao(p.id, { novoLink: true }); }}
                  style={{ fontSize: "0.72rem", color: "#9a8060", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  gerar link novo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
