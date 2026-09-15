"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Condicao } from "@/lib/crm/segmentos";

type Tag = { id: string; name: string; slug: string; color: string; auto: boolean; clientes: number };
type Opcoes = { produtos: string[]; categorias: string[]; etiquetas: { slug: string; name: string }[]; tamanhos: string[] };
type Cliente = {
  id: string; nome: string | null; telefone: string | null;
  etiquetas: { nome: string; cor: string }[];
  pedidos: number; totalGasto: number; ticketMedio: number;
  ultimaCompra: string | null; diasSemComprar: number | null;
};
type Resultado = { clientes: Cliente[]; quantidade: number; somaGasta: number; ticketMedio: number };
type Modelo = { id: string; kind: string; body: string; active: boolean };
type Modelos = { tipos: { kind: string; titulo: string; emoji: string }[]; padroes: Record<string, string[]>; salvos: Modelo[] };

const CARTAO: React.CSSProperties = {
  backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)", borderRadius: "1rem",
};
const CAMPO: React.CSSProperties = {
  fontSize: "0.8rem", border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.45rem",
  padding: "0.35rem 0.5rem", color: "#1a1510", backgroundColor: "#fff", fontFamily: "inherit",
};

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CAMPOS = [
  { campo: "produto", rotulo: "Comprou o produto" },
  { campo: "categoria", rotulo: "Comprou a categoria" },
  { campo: "tamanho", rotulo: "Usa o tamanho" },
  { campo: "ultimaCompra", rotulo: "Última compra" },
  { campo: "totalGasto", rotulo: "Total gasto" },
  { campo: "ticket", rotulo: "Ticket médio" },
  { campo: "pedidos", rotulo: "Número de pedidos" },
  { campo: "etiqueta", rotulo: "Etiqueta" },
  { campo: "saldoAberto", rotulo: "Saldo em aberto" },
] as const;

export default function SegmentosClient() {
  const [aba, setAba] = useState<"filtro" | "etiquetas" | "modelos">("filtro");

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem 1.25rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#1a1510" }}>Etiquetas e segmentação</h1>
      <p style={{ fontSize: "0.8rem", color: "#9a8060", marginTop: "0.2rem" }}>
        Monte o filtro, veja quem entrou, escreva as mensagens que a fila usa
      </p>

      <div style={{ display: "flex", gap: "0.4rem", margin: "1.25rem 0", flexWrap: "wrap" }}>
        {([["filtro", "Filtro"], ["etiquetas", "Etiquetas"], ["modelos", "Mensagens"]] as const).map(([k, r]) => (
          <button key={k} onClick={() => setAba(k)}
            style={{
              backgroundColor: aba === k ? "#b8891a" : "#fff",
              border: `1px solid ${aba === k ? "#b8891a" : "rgba(140,100,20,0.15)"}`,
              color: aba === k ? "#fff" : "#7a6030",
              fontSize: "0.82rem", fontWeight: 700, padding: "0.4rem 0.9rem",
              borderRadius: "0.5rem", cursor: "pointer",
            }}>
            {r}
          </button>
        ))}
      </div>

      {aba === "filtro" && <Filtro />}
      {aba === "etiquetas" && <ListaDeEtiquetas />}
      {aba === "modelos" && <ListaDeModelos />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────── Filtro

function Filtro() {
  const [opcoes, setOpcoes] = useState<Opcoes | null>(null);
  const [condicoes, setCondicoes] = useState<Condicao[]>([
    { campo: "ultimaCompra", op: "maisDe", dias: 90 },
  ]);
  // As condições aplicadas são separadas das que estão na tela: mexer num
  // campo não dispara consulta a cada tecla, só o botão Aplicar dispara.
  const [aplicadas, setAplicadas] = useState<Condicao[]>([
    { campo: "ultimaCompra", op: "maisDe", dias: 90 },
  ]);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [rodando, setRodando] = useState(false);
  // O filtro só roda quando você manda: digitar um número não dispara consulta
  // a cada tecla.
  const aplicar = useCallback(() => { setRodando(true); setAplicadas(condicoes); }, [condicoes]);

  useEffect(() => {
    let vivo = true;
    fetch("/api/admin/crm/segmentos").then(r => r.json())
      .then(d => { if (vivo) setOpcoes(d); }).catch(() => null);
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    let vivo = true;
    fetch("/api/admin/crm/segmentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ condicoes: aplicadas }),
    })
      .then(r => r.json())
      .then(d => { if (vivo) { setResultado(d); setRodando(false); } })
      .catch(() => { if (vivo) { setResultado(null); setRodando(false); } });
    return () => { vivo = false; };
  }, [aplicadas]);

  const trocar = (i: number, nova: Condicao) =>
    setCondicoes(condicoes.map((c, j) => (j === i ? nova : c)));

  const padraoDoCampo = (campo: string): Condicao => {
    switch (campo) {
      case "produto": return { campo: "produto", valor: opcoes?.produtos[0] || "" };
      case "categoria": return { campo: "categoria", valor: opcoes?.categorias[0] || "" };
      case "tamanho": return { campo: "tamanho", valor: "M" };
      case "totalGasto": return { campo: "totalGasto", op: "acimaDe", valor: 500 };
      case "ticket": return { campo: "ticket", op: "acimaDe", valor: 200 };
      case "pedidos": return { campo: "pedidos", op: "acimaDe", valor: 2 };
      case "etiqueta": return { campo: "etiqueta", op: "tem", slug: opcoes?.etiquetas[0]?.slug || "vip" };
      case "saldoAberto": return { campo: "saldoAberto", op: "sim" };
      default: return { campo: "ultimaCompra", op: "maisDe", dias: 90 };
    }
  };

  return (
    <>
      <div style={{ ...CARTAO, padding: "1rem 1.25rem", marginBottom: "1rem" }}>
        {condicoes.map((c, i) => (
          <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center", padding: "0.45rem 0", borderBottom: i < condicoes.length - 1 ? "1px solid rgba(140,100,20,0.07)" : undefined }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#9a8060", width: 28 }}>
              {i === 0 ? "ONDE" : "E"}
            </span>

            <select style={CAMPO} value={c.campo} onChange={e => trocar(i, padraoDoCampo(e.target.value))}>
              {CAMPOS.map(f => <option key={f.campo} value={f.campo}>{f.rotulo}</option>)}
            </select>

            {c.campo === "produto" && (
              <select style={CAMPO} value={c.valor} onChange={e => trocar(i, { ...c, valor: e.target.value })}>
                {(opcoes?.produtos || []).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            {c.campo === "categoria" && (
              <select style={CAMPO} value={c.valor} onChange={e => trocar(i, { ...c, valor: e.target.value })}>
                {(opcoes?.categorias || []).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            {c.campo === "tamanho" && (
              <select style={CAMPO} value={c.valor} onChange={e => trocar(i, { ...c, valor: e.target.value })}>
                {(opcoes?.tamanhos || []).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            {c.campo === "ultimaCompra" && (
              <>
                <select style={CAMPO} value={c.op} onChange={e => trocar(i, { ...c, op: e.target.value as "maisDe" | "menosDe" })}>
                  <option value="maisDe">há mais de</option>
                  <option value="menosDe">há menos de</option>
                </select>
                <input style={{ ...CAMPO, width: 70 }} type="number" min={1} value={c.dias}
                  onChange={e => trocar(i, { ...c, dias: Number(e.target.value) || 0 })} />
                <span style={{ fontSize: "0.8rem", color: "#9a8060" }}>dias</span>
              </>
            )}
            {(c.campo === "totalGasto" || c.campo === "ticket" || c.campo === "pedidos") && (
              <>
                <select style={CAMPO} value={c.op} onChange={e => trocar(i, { ...c, op: e.target.value as "acimaDe" | "abaixoDe" })}>
                  <option value="acimaDe">acima de</option>
                  <option value="abaixoDe">abaixo de</option>
                </select>
                <input style={{ ...CAMPO, width: 90 }} type="number" min={0} value={c.valor}
                  onChange={e => trocar(i, { ...c, valor: Number(e.target.value) || 0 })} />
              </>
            )}
            {c.campo === "etiqueta" && (
              <>
                <select style={CAMPO} value={c.op} onChange={e => trocar(i, { ...c, op: e.target.value as "tem" | "naoTem" })}>
                  <option value="tem">tem</option>
                  <option value="naoTem">não tem</option>
                </select>
                <select style={CAMPO} value={c.slug} onChange={e => trocar(i, { ...c, slug: e.target.value })}>
                  {(opcoes?.etiquetas || []).map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                </select>
              </>
            )}
            {c.campo === "saldoAberto" && (
              <select style={CAMPO} value={c.op} onChange={e => trocar(i, { ...c, op: e.target.value as "sim" | "nao" })}>
                <option value="sim">tem</option>
                <option value="nao">não tem</option>
              </select>
            )}

            <button onClick={() => setCondicoes(condicoes.filter((_, j) => j !== i))}
              style={{ marginLeft: "auto", background: "none", border: 0, color: "#c8b48a", cursor: "pointer", fontSize: "0.9rem" }}
              aria-label="Remover condição">×</button>
          </div>
        ))}

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
          <button onClick={() => setCondicoes([...condicoes, padraoDoCampo("ultimaCompra")])}
            style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.2)", color: "#7a6030", fontSize: "0.78rem", fontWeight: 700, padding: "0.4rem 0.8rem", borderRadius: "0.5rem", cursor: "pointer" }}>
            + condição
          </button>
          <button onClick={aplicar} disabled={rodando}
            style={{ backgroundColor: "#b8891a", border: 0, color: "#fff", fontSize: "0.78rem", fontWeight: 700, padding: "0.4rem 0.9rem", borderRadius: "0.5rem", cursor: "pointer" }}>
            {rodando ? "Filtrando…" : "Aplicar"}
          </button>
        </div>
      </div>

      {resultado && (
        <>
          <div style={{ ...CARTAO, backgroundColor: "#fff8e1", borderColor: "rgba(184,137,26,0.3)", padding: "0.9rem 1.25rem", marginBottom: "1rem", display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "0.75rem" }}>
            <strong style={{ fontSize: "1.4rem", color: "#856404" }}>{resultado.quantidade}</strong>
            <span style={{ fontSize: "0.85rem", color: "#7a6030" }}>
              cliente(s) · ticket médio {fmt(resultado.ticketMedio)} · {fmt(resultado.somaGasta)} já gastos por elas
            </span>
          </div>

          <div style={{ ...CARTAO, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: 560 }}>
                <thead>
                  <tr style={{ backgroundColor: "#FAF6EE" }}>
                    {["Cliente", "Etiquetas", "Última compra", "Pedidos", "Total"].map((h, i) => (
                      <th key={h} style={{ textAlign: i > 2 ? "right" : "left", padding: "0.6rem 0.9rem", fontSize: "0.68rem", fontWeight: 800, color: "#9a8060", letterSpacing: "0.04em" }}>
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resultado.clientes.slice(0, 60).map(c => (
                    <tr key={c.id} style={{ borderTop: "1px solid rgba(140,100,20,0.07)" }}>
                      <td style={{ padding: "0.6rem 0.9rem" }}>
                        <Link href={`/admin/clientes/${c.id}`} style={{ color: "#1a1510", fontWeight: 700, textDecoration: "none" }}>
                          {c.nome || "Cliente"}
                        </Link>
                        {c.telefone && <div style={{ fontSize: "0.7rem", color: "#b8a080" }}>{c.telefone}</div>}
                      </td>
                      <td style={{ padding: "0.6rem 0.9rem" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem" }}>
                          {c.etiquetas.slice(0, 3).map(e => (
                            <span key={e.nome} style={{ fontSize: "0.65rem", fontWeight: 700, backgroundColor: `${e.cor}1a`, color: e.cor, padding: "0.1rem 0.4rem", borderRadius: 999 }}>
                              {e.nome}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "0.6rem 0.9rem", color: "#7a6030" }}>
                        {c.ultimaCompra
                          ? `${new Date(c.ultimaCompra).toLocaleDateString("pt-BR")} · ${c.diasSemComprar}d`
                          : "—"}
                      </td>
                      <td style={{ padding: "0.6rem 0.9rem", textAlign: "right", color: "#7a6030" }}>{c.pedidos}</td>
                      <td style={{ padding: "0.6rem 0.9rem", textAlign: "right", fontWeight: 700, color: "#1a1510" }}>{fmt(c.totalGasto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {resultado.quantidade > 60 && (
              <p style={{ fontSize: "0.72rem", color: "#b8a080", padding: "0.6rem 0.9rem" }}>
                Mostrando 60 de {resultado.quantidade}
              </p>
            )}
            {resultado.quantidade === 0 && (
              <p style={{ fontSize: "0.85rem", color: "#b8a080", padding: "2rem", textAlign: "center" }}>
                Nenhuma cliente se encaixa nesse filtro.
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────── Etiquetas

function ListaDeEtiquetas() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    fetch("/api/admin/crm/tags").then(r => r.json()).then(setTags).catch(() => null);
  }, []);
  useEffect(carregar, [carregar]);

  const criar = async () => {
    if (!nome.trim()) return;
    const r = await fetch("/api/admin/crm/tags", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nome }),
    });
    if (!r.ok) { setErro((await r.json()).error || "Não consegui criar."); return; }
    setNome(""); setErro(""); carregar();
  };

  const apagar = async (t: Tag) => {
    await fetch(`/api/admin/crm/tags?id=${t.id}`, { method: "DELETE" }).catch(() => null);
    carregar();
  };

  const automaticas = tags.filter(t => t.auto);
  const minhas = tags.filter(t => !t.auto);

  return (
    <>
      <div style={{ ...CARTAO, padding: "1rem 1.25rem", marginBottom: "1rem" }}>
        <h2 style={{ fontWeight: 800, fontSize: "0.9rem", color: "#1a1510", marginBottom: "0.3rem" }}>Calculadas pelo sistema</h2>
        <p style={{ fontSize: "0.75rem", color: "#9a8060", marginBottom: "0.75rem" }}>
          Recalculadas a cada rotina. Você não precisa manter nenhuma delas.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {automaticas.map(t => (
            <span key={t.id} style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center", backgroundColor: `${t.color}1a`, color: t.color, border: `1px solid ${t.color}44`, fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: 999 }}>
              {t.name} <span style={{ opacity: 0.7 }}>{t.clientes}</span>
            </span>
          ))}
          {automaticas.length === 0 && (
            <p style={{ fontSize: "0.78rem", color: "#b8a080" }}>
              Ainda não rodaram. Elas nascem na primeira varredura da rotina.
            </p>
          )}
        </div>
      </div>

      <div style={{ ...CARTAO, padding: "1rem 1.25rem" }}>
        <h2 style={{ fontWeight: 800, fontSize: "0.9rem", color: "#1a1510", marginBottom: "0.75rem" }}>As suas</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.9rem" }}>
          {minhas.map(t => (
            <span key={t.id} style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center", backgroundColor: `${t.color}1a`, color: t.color, border: `1px solid ${t.color}44`, fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: 999 }}>
              {t.name} <span style={{ opacity: 0.7 }}>{t.clientes}</span>
              <button onClick={() => apagar(t)} aria-label={`Apagar ${t.name}`}
                style={{ background: "none", border: 0, color: t.color, cursor: "pointer", fontSize: "0.85rem", lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
          {minhas.length === 0 && <p style={{ fontSize: "0.78rem", color: "#b8a080" }}>Nenhuma ainda.</p>}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <input id="nova-etiqueta" style={{ ...CAMPO, flex: 1, minWidth: 180 }} value={nome}
            onChange={e => setNome(e.target.value)} placeholder="Ex.: Atacado, Amiga, Sem paciência pra troca" />
          <button onClick={criar}
            style={{ backgroundColor: "#b8891a", border: 0, color: "#fff", fontSize: "0.78rem", fontWeight: 700, padding: "0.4rem 0.9rem", borderRadius: "0.5rem", cursor: "pointer" }}>
            Criar
          </button>
        </div>
        {erro && <p style={{ fontSize: "0.75rem", color: "#c04040", marginTop: "0.4rem" }}>{erro}</p>}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────── Mensagens

function ListaDeModelos() {
  const [dados, setDados] = useState<Modelos | null>(null);
  const [novo, setNovo] = useState<Record<string, string>>({});

  const carregar = useCallback(() => {
    fetch("/api/admin/crm/modelos").then(r => r.json()).then(setDados).catch(() => null);
  }, []);
  useEffect(carregar, [carregar]);

  const criar = async (kind: string) => {
    const body = (novo[kind] || "").trim();
    if (!body) return;
    await fetch("/api/admin/crm/modelos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, body }),
    });
    setNovo({ ...novo, [kind]: "" });
    carregar();
  };

  const apagar = async (id: string) => {
    await fetch(`/api/admin/crm/modelos?id=${id}`, { method: "DELETE" }).catch(() => null);
    carregar();
  };

  if (!dados) return <p style={{ color: "#b8a080" }}>Carregando…</p>;

  return (
    <>
      <div style={{ ...CARTAO, padding: "0.9rem 1.25rem", marginBottom: "1rem" }}>
        <p style={{ fontSize: "0.8rem", color: "#7a6030" }}>
          Variáveis: <code>{"{nome}"}</code> <code>{"{peca}"}</code> <code>{"{valor}"}</code>{" "}
          <code>{"{pedido}"}</code> <code>{"{cupom}"}</code> <code>{"{dias}"}</code>. Vários modelos do
          mesmo tipo são sorteados, para a mensagem não sair igual para todo mundo. Sem nenhum modelo
          seu, o sistema usa os de fábrica.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {dados.tipos.map(t => {
          const meus = dados.salvos.filter(m => m.kind === t.kind);
          return (
            <div key={t.kind} style={{ ...CARTAO, padding: "0.9rem 1.25rem" }}>
              <h3 style={{ fontWeight: 800, fontSize: "0.85rem", color: "#1a1510", marginBottom: "0.5rem" }}>
                {t.emoji} {t.titulo}
              </h3>

              {meus.map(m => (
                <div key={m.id} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                  <p style={{ flex: 1, fontSize: "0.8rem", color: "#7a6030", backgroundColor: "#FAF6EE", borderRadius: "0.5rem", padding: "0.45rem 0.6rem" }}>
                    {m.body}
                  </p>
                  <button onClick={() => apagar(m.id)}
                    style={{ background: "none", border: 0, color: "#c8b48a", cursor: "pointer", fontSize: "0.72rem" }}>
                    apagar
                  </button>
                </div>
              ))}

              {meus.length === 0 && (dados.padroes[t.kind] || []).map((p, i) => (
                <p key={i} style={{ fontSize: "0.78rem", color: "#b8a080", fontStyle: "italic", marginBottom: "0.25rem" }}>
                  (de fábrica) {p}
                </p>
              ))}

              <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                <input style={{ ...CAMPO, flex: 1, minWidth: 200 }}
                  value={novo[t.kind] || ""} onChange={e => setNovo({ ...novo, [t.kind]: e.target.value })}
                  placeholder="Escreva a sua versão…" />
                <button onClick={() => criar(t.kind)}
                  style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.25)", color: "#b8891a", fontSize: "0.75rem", fontWeight: 700, padding: "0.35rem 0.8rem", borderRadius: "0.5rem", cursor: "pointer" }}>
                  Adicionar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
