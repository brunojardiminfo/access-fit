"use client";
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/store/admin";

const CATEGORIES = [
  { value: "estoque", label: "🛍️ Reposição de Estoque" },
  { value: "marketing", label: "📣 Marketing" },
  { value: "embalagem", label: "📦 Embalagem" },
  { value: "frete", label: "🚚 Frete" },
  { value: "cartao", label: "💳 Cartão / Taxa" },
  { value: "outros", label: "📋 Outros" },
];
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

function fmt(n: number) { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function today() { return new Date().toISOString().split("T")[0]; }
function firstOfMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; }
function lastOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0]; }
function mesLabel(key: string) {
  const [y, m] = key.split("-");
  return `${["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(m) - 1]}/${y.slice(2)}`;
}

type Expense = {
  id: string; date: string; description: string; amount: number;
  category: string; supplier?: { id: string; name: string } | null;
};

const inp = {
  padding: "0.55rem 0.875rem", border: "1px solid rgba(140,100,20,0.25)",
  borderRadius: "0.625rem", fontSize: "0.85rem", backgroundColor: "#FAF6EE", outline: "none",
};
const card = {
  backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)",
  borderRadius: "1rem", padding: "1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

export default function FinanceiroPage() {
  const { hideProfit } = useAdmin();

  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(lastOfMonth());

  const [caixa, setCaixa] = useState(0);
  const [aReceber, setAReceber] = useState(0);
  const [vendas, setVendas] = useState(0);
  const [qtdPedidos, setQtdPedidos] = useState(0);
  const [vendasPorMes, setVendasPorMes] = useState<Record<string, number>>({});
  const [despesasTotal, setDespesasTotal] = useState(0);
  const [despesas, setDespesas] = useState<Expense[]>([]);
  const [lucro, setLucro] = useState<{ lucro: number; margem: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: today(), description: "", amount: "", category: "outros" });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [saldoRes, vendasRes, despRes, lucroRes] = await Promise.all([
      fetch("/api/admin/caixa/saldo"),
      fetch(`/api/admin/vendas?from=${from}&to=${to}`),
      fetch(`/api/admin/despesas?from=${from}&to=${to}`),
      fetch(`/api/admin/analytics?from=${from}&to=${to}`),
    ]);
    if (saldoRes.ok) { const d = await saldoRes.json(); setCaixa(d.caixa || 0); setAReceber(d.aReceber || 0); }
    if (vendasRes.ok) {
      const d = await vendasRes.json();
      setVendas(d.total || 0);
      setQtdPedidos(d.quantidade || 0);
      setVendasPorMes(d.vendidosPorMes || {});
    }
    if (despRes.ok) { const d = await despRes.json(); setDespesasTotal(d.total || 0); setDespesas(d.expenses || []); }
    if (lucroRes.ok) {
      const d = await lucroRes.json();
      if (d.lucroReal) setLucro({ lucro: parseFloat(d.lucroReal.lucro), margem: parseFloat(d.lucroReal.margem) });
    }
    setLoading(false);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const salvarDespesa = async () => {
    if (!form.description.trim()) { setErro("Descreva a despesa."); return; }
    const valor = parseFloat(form.amount.replace(",", "."));
    if (!valor || valor <= 0) { setErro("Informe um valor válido."); return; }
    setErro("");
    setSaving(true);
    const res = await fetch("/api/admin/despesas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: valor, paymentMethod: "pix" }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErro(d.error || "Não foi possível salvar.");
      return;
    }
    setForm({ date: today(), description: "", amount: "", category: "outros" });
    setShowForm(false);
    load();
  };

  const saldoPeriodo = vendas - despesasTotal;
  // Ultimos 6 meses com venda, do mais antigo para o mais novo
  const meses = Object.keys(vendasPorMes).sort().slice(-6);
  const maiorMes = Math.max(...meses.map(m => vendasPorMes[m] || 0), 1);

  const periodos = [
    { label: "Este mês", from: firstOfMonth(), to: lastOfMonth() },
    { label: "Mês passado", ...(() => { const d = new Date(); const y = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear(); const m = (d.getMonth() + 11) % 12; return { from: `${y}-${String(m + 1).padStart(2, "0")}-01`, to: new Date(y, m + 1, 0).toISOString().split("T")[0] }; })() },
    { label: "Este ano", from: `${new Date().getFullYear()}-01-01`, to: today() },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <a href="/admin" style={{ color: "#b8891a", fontSize: "0.875rem", textDecoration: "none" }}>← Admin</a>
          <h1 style={{ color: "#1a1510", fontSize: "1.75rem", fontWeight: 900, marginTop: "0.2rem" }}>Financeiro</h1>
        </div>
        <a href="/admin/financeiro/completo" style={{ fontSize: "0.75rem", color: "#9a8060", textDecoration: "none", padding: "0.4rem 0.75rem", border: "1px solid rgba(140,100,20,0.2)", borderRadius: "999px" }}>
          Painel completo →
        </a>
      </div>

      {/* Situação de hoje */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        {[
          { emoji: "💵", label: "Em caixa hoje", value: caixa, cor: caixa >= 0 ? "#1a8a2a" : "#c04040", hint: "Tudo que entrou menos tudo que saiu" },
          { emoji: "📒", label: "A receber", value: aReceber, cor: "#b8891a", hint: "Pedidos ainda não quitados" },
        ].map(k => (
          <div key={k.label} style={{ ...card, padding: "1.25rem 1.5rem" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.3rem" }}>{k.emoji}</div>
            <div style={{ color: k.cor, fontSize: "1.75rem", fontWeight: 900 }}>{loading ? "—" : fmt(k.value)}</div>
            <div style={{ color: "#1a1510", fontSize: "0.85rem", fontWeight: 700, marginTop: "0.2rem" }}>{k.label}</div>
            <div style={{ color: "#9a8060", fontSize: "0.72rem", marginTop: "0.15rem" }}>{k.hint}</div>
          </div>
        ))}
      </div>

      {/* Período */}
      <div style={{ ...card, marginBottom: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", padding: "0.875rem 1.25rem" }}>
        <span style={{ fontSize: "0.8rem", color: "#9a8060", fontWeight: 700 }}>Período:</span>
        {periodos.map(p => {
          const ativo = from === p.from && to === p.to;
          return (
            <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to); }}
              style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.4rem 0.8rem", borderRadius: "999px", border: "none", cursor: "pointer", backgroundColor: ativo ? "#b8891a" : "#FAF6EE", color: ativo ? "#fff" : "#9a8060" }}>
              {p.label}
            </button>
          );
        })}
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...inp, width: 145 }} />
        <span style={{ fontSize: "0.75rem", color: "#9a8060" }}>até</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...inp, width: 145 }} />
      </div>

      {/* Vendas x gastos no período */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        {[
          { emoji: "🛍️", label: "Vendeu", value: fmt(vendas), sub: `${qtdPedidos} pedido${qtdPedidos === 1 ? "" : "s"}`, cor: "#1a8a2a" },
          { emoji: "📤", label: "Gastou", value: fmt(despesasTotal), sub: "Despesas lançadas", cor: "#c04040" },
          { emoji: "⚖️", label: "Sobrou", value: fmt(saldoPeriodo), sub: "Vendas menos gastos", cor: saldoPeriodo >= 0 ? "#1a8a2a" : "#c04040" },
          {
            emoji: "📈", label: "Lucro nas peças",
            value: hideProfit ? "•••" : lucro ? fmt(lucro.lucro) : "—",
            sub: hideProfit ? "Modo apresentação" : lucro ? `Margem de ${lucro.margem.toFixed(0)}%` : "Sem custo cadastrado",
            cor: "#b8891a",
          },
        ].map(k => (
          <div key={k.label} style={card}>
            <div style={{ fontSize: "1.1rem", marginBottom: "0.3rem" }}>{k.emoji}</div>
            <div style={{ color: k.cor, fontSize: "1.35rem", fontWeight: 900 }}>{loading ? "—" : k.value}</div>
            <div style={{ color: "#1a1510", fontSize: "0.8rem", fontWeight: 700, marginTop: "0.2rem" }}>{k.label}</div>
            <div style={{ color: "#9a8060", fontSize: "0.7rem" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Vendas por mês */}
      {meses.length > 0 && (
        <div style={{ ...card, marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1a1510", marginBottom: "1rem" }}>Vendas por mês</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {meses.map(m => (
              <div key={m} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "0.75rem", color: "#9a8060", fontWeight: 700, width: 55, flexShrink: 0 }}>{mesLabel(m)}</span>
                <div style={{ flex: 1, height: 22, backgroundColor: "#FAF6EE", borderRadius: "0.375rem", overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(2, ((vendasPorMes[m] || 0) / maiorMes) * 100)}%`, height: "100%", backgroundColor: "#b8891a", borderRadius: "0.375rem" }} />
                </div>
                <span style={{ fontSize: "0.8rem", color: "#1a1510", fontWeight: 700, width: 110, textAlign: "right", flexShrink: 0 }}>{fmt(vendasPorMes[m] || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Despesas do período */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1a1510", margin: 0 }}>
            Despesas do período <span style={{ color: "#9a8060", fontWeight: 600 }}>({despesas.length})</span>
          </h2>
          <button onClick={() => { setShowForm(!showForm); setErro(""); }}
            style={{ backgroundColor: showForm ? "#FAF6EE" : "#b8891a", color: showForm ? "#9a8060" : "#fff", border: "none", padding: "0.5rem 1rem", borderRadius: "0.625rem", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }}>
            {showForm ? "Cancelar" : "+ Lançar despesa"}
          </button>
        </div>

        {showForm && (
          <div style={{ backgroundColor: "#FAF6EE", borderRadius: "0.75rem", padding: "1rem", marginBottom: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.6rem", alignItems: "end" }}>
            <div>
              <label style={{ fontSize: "0.7rem", color: "#9a8060", fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>Data</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ ...inp, backgroundColor: "#fff", width: "100%", boxSizing: "border-box" as const }} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: "0.7rem", color: "#9a8060", fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>O que foi</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex: sacolas, anúncio, frete" style={{ ...inp, backgroundColor: "#fff", width: "100%", boxSizing: "border-box" as const }} />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "#9a8060", fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>Valor</label>
              <input value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0,00" inputMode="decimal" style={{ ...inp, backgroundColor: "#fff", width: "100%", boxSizing: "border-box" as const }} />
            </div>
            <div>
              <label style={{ fontSize: "0.7rem", color: "#9a8060", fontWeight: 700, display: "block", marginBottom: "0.2rem" }}>Categoria</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ ...inp, backgroundColor: "#fff", width: "100%", boxSizing: "border-box" as const }}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <button onClick={salvarDespesa} disabled={saving}
              style={{ backgroundColor: "#b8891a", color: "#fff", border: "none", padding: "0.6rem 1rem", borderRadius: "0.625rem", fontWeight: 800, fontSize: "0.8rem", cursor: saving ? "wait" : "pointer" }}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
            {erro && <p style={{ gridColumn: "1 / -1", color: "#c04040", fontSize: "0.75rem", margin: 0 }}>{erro}</p>}
          </div>
        )}

        {loading ? (
          <p style={{ color: "#9a8060", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>Carregando...</p>
        ) : despesas.length === 0 ? (
          <p style={{ color: "#9a8060", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>Nenhuma despesa lançada neste período.</p>
        ) : (
          <div>
            {despesas.map(d => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0", borderBottom: "1px solid rgba(140,100,20,0.06)" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1a1510", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.description}</div>
                  <div style={{ fontSize: "0.7rem", color: "#9a8060" }}>
                    {new Date(d.date).toLocaleDateString("pt-BR")} · {CATEGORY_LABEL[d.category] || d.category}
                    {d.supplier ? ` · ${d.supplier.name}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#c04040", whiteSpace: "nowrap" }}>− {fmt(d.amount)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.75rem", fontSize: "0.9rem" }}>
              <span style={{ color: "#9a8060", fontWeight: 700 }}>Total no período</span>
              <span style={{ color: "#c04040", fontWeight: 900 }}>− {fmt(despesasTotal)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
