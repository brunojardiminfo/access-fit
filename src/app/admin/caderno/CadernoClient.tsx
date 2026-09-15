"use client";
import { useState, useMemo } from "react";

type ClientData = {
  userId: string;
  client: { id: string; name: string | null; email: string; phone?: string | null };
  totalDevido: number;
  pedidosCount: number;
  ultimaCompra: string;
  maiorAtraso: number;
  temVencimento: boolean;
};

type PedidoItem = { quantity: number; price: number; size: string | null; componentName?: string | null; product?: { name: string } | null };

type Installment = { id: string; number: number; amount: number; dueDate: string; status: string; paidAt?: string | null };

type Pedido = {
  id: string;
  total: number;
  amountPaid: number;
  saldoPendente: number;
  dueDate: string | null;
  items?: PedidoItem[];
  installments?: Installment[];
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CadernoClient({ clientsData }: { clientsData: ClientData[] }) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [parcelas, setParcelas] = useState("3");
  const [primeiroVencimento, setPrimeiroVencimento] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  });
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [consolidando, setConsolidando] = useState(false);
  const [valorPagamento, setValorPagamento] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState("pix");
  const [registrando, setRegistrando] = useState(false);
  const [confirmPagamento, setConfirmPagamento] = useState(false);

  const selectedClient = clientsData.find(c => c.userId === selectedClientId);

  const loadClientPedidos = async (clientId: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/caderno/pedidos?clientId=${clientId}`);
    if (res.ok) {
      const data = await res.json();
      setPedidos(data.pedidos);
    }
    setLoading(false);
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    loadClientPedidos(clientId);
  };

  const totalDevido = pedidos.reduce((s, p) => s + p.saldoPendente, 0);
  const numParcelas = parseInt(parcelas) || 1;
  const valorParcela = totalDevido / numParcelas;

  const projecao = Array.from({ length: numParcelas }, (_, i) => {
    const d = new Date(primeiroVencimento);
    d.setMonth(d.getMonth() + i);
    const mes = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const dia = d.toLocaleDateString("pt-BR", { day: "2-digit" });
    const isLast = i === numParcelas - 1;
    const valor = isLast ? totalDevido - valorParcela * (numParcelas - 1) : valorParcela;
    return { mes, dia, valor, data: d.toISOString().split("T")[0], mes_key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` };
  });

  const enviarResumoWhatsApp = () => {
    const phone = selectedClient?.client.phone;
    if (!phone) return alert("Cliente sem telefone cadastrado. Cadastre em /admin/clientes.");
    const linhas = pedidos.flatMap(p =>
      (p.items || []).map(i => {
        const isVM = i.product?.name === "Venda Manual";
        const nome = isVM
          ? (i.size || "Item")
          : i.product?.name
            ? (i.componentName ? `${i.product.name} - ${i.componentName}` : i.product.name)
            : (i.size || "Item");
        return `- ${nome} x${i.quantity}  ${fmt(i.price * i.quantity)}`;
      })
    ).join("\n");
    const msg = [
      `Olá ${selectedClient?.client.name?.split(" ")[0]}!`,
      ``,
      `Segue o resumo das suas peças na *Access Fit*:`,
      ``,
      linhas || `Total: ${fmt(totalDevido)}`,
      ``,
      `*Total em aberto: ${fmt(totalDevido)}*`,
      ``,
      `Qualquer dúvida estamos à disposição!`,
    ].join("\n");
    const ddi = phone.replace(/\D/g, "").startsWith("55") ? phone.replace(/\D/g, "") : `55${phone.replace(/\D/g, "")}`;
    window.open(`https://wa.me/${ddi}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleRegistrarPagamento = async () => {
    const valor = parseFloat(valorPagamento.replace(",", "."));
    if (!selectedClientId || isNaN(valor) || valor <= 0) return;
    setRegistrando(true);
    const res = await fetch("/api/admin/caderno/pagamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: selectedClientId, valor, metodo: metodoPagamento }),
    });
    if (res.ok) {
      setValorPagamento("");
      setConfirmPagamento(false);
      await loadClientPedidos(selectedClientId);
      // Recarrega a lista de clientes para atualizar o totalDevido
      window.location.reload();
    } else {
      alert("Erro ao registrar pagamento");
    }
    setRegistrando(false);
  };

  const handleConsolidar = async () => {
    if (!selectedClientId) return;
    setConsolidando(true);
    const res = await fetch(`/api/admin/caderno/consolidar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: selectedClientId, parcelas: numParcelas, primeiroVencimento }),
    });
    if (res.ok) {
      // Recarrega a página para atualizar Projeção de Caixa e Fluxo do Mês
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 1000);
    } else {
      alert("❌ Erro ao consolidar");
    }
    setConsolidando(false);
  };

  return (
    <div>
      {/* Resumo geral */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Clientes", value: clientsData.length, emoji: "👥" },
          { label: "Total em aberto", value: fmt(clientsData.reduce((s, c) => s + c.totalDevido, 0)), emoji: "💰" },
          { label: "Em atraso", value: clientsData.filter(c => c.maiorAtraso > 0).length, emoji: "🔴", warn: true },
          { label: "Sem vencimento", value: clientsData.filter(c => !c.temVencimento).length, emoji: "🟡", warn: true },
        ].map(k => (
          <div key={k.label} style={{ backgroundColor: "#fff", border: `1px solid ${(k as any).warn ? "rgba(192,64,64,0.15)" : "rgba(140,100,20,0.1)"}`, borderRadius: "0.875rem", padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>{k.emoji}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#1a1510" }}>{k.value}</div>
            <div style={{ fontSize: "0.72rem", color: "#9a8060", fontWeight: 700 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {clientsData.map(c => {
          const isSelected = selectedClientId === c.userId;
          const urgencia = c.maiorAtraso > 0 ? "critico" : !c.temVencimento ? "alerta" : "ok";
          const urgenciaConfig = {
            critico: { dot: "#c04040", border: "rgba(192,64,64,0.4)", tag: `⚠️ ${c.maiorAtraso}d em atraso`, tagBg: "#fee8e8", tagColor: "#c04040" },
            alerta:  { dot: "#b8891a", border: "rgba(184,137,26,0.3)", tag: "📅 Sem vencimento", tagBg: "#fff8e1", tagColor: "#b8891a" },
            ok:      { dot: "#2e7d32", border: "rgba(140,100,20,0.12)", tag: "✅ Em dia", tagBg: "#e8f8e8", tagColor: "#2e7d32" },
          }[urgencia];
          const diasDesdeCompra = Math.floor((Date.now() - new Date(c.ultimaCompra).getTime()) / (1000 * 60 * 60 * 24));

          return (
            <div key={c.userId} onClick={() => handleSelectClient(c.userId)}
              style={{ backgroundColor: isSelected ? "#b8891a" : "#fff", border: `2px solid ${isSelected ? "#b8891a" : urgenciaConfig.border}`, borderRadius: "1rem", padding: "1.25rem", cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden" }}>

              {/* Barra lateral de urgência */}
              {!isSelected && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: urgenciaConfig.dot, borderRadius: "1rem 0 0 1rem" }} />}

              <div style={{ paddingLeft: isSelected ? 0 : "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "1rem", fontWeight: 900, color: isSelected ? "#fff" : "#1a1510" }}>{c.client.name || "—"}</div>
                  {!isSelected && (
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, backgroundColor: urgenciaConfig.tagBg, color: urgenciaConfig.tagColor, padding: "0.2rem 0.5rem", borderRadius: "999px", whiteSpace: "nowrap" }}>
                      {urgenciaConfig.tag}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
                  <span style={{ color: isSelected ? "rgba(255,255,255,0.75)" : "#9a8060", fontSize: "0.78rem" }}>
                    {c.pedidosCount} pedido{c.pedidosCount > 1 ? "s" : ""}
                  </span>
                  <span style={{ color: isSelected ? "rgba(255,255,255,0.75)" : "#9a8060", fontSize: "0.78rem" }}>
                    última compra há {diasDesdeCompra}d
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: 900, color: isSelected ? "#fff" : "#b8891a" }}>{fmt(c.totalDevido)}</div>
                  {c.client.phone && !isSelected && (
                    <a href={`https://wa.me/55${c.client.phone.replace(/\D/g,"")}?text=${encodeURIComponent(`Olá ${c.client.name?.split(" ")[0]}! Passando para lembrar do saldo em aberto de ${fmt(c.totalDevido)} na Access Fit 🌟`)}`}
                      onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer"
                      style={{ backgroundColor: "#25D366", color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.3rem 0.6rem", fontSize: "0.72rem", fontWeight: 700, textDecoration: "none", cursor: "pointer" }}>
                      📱
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedClient && (
        <div style={{ backgroundColor: "#fff", borderRadius: "1rem", padding: "2rem", border: "1px solid rgba(140,100,20,0.1)" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#1a1510", marginBottom: "1.5rem" }}>📋 {selectedClient.client.name}</h2>

          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#5a4a2a", marginBottom: "1rem", textTransform: "uppercase" }}>Pedidos em Aberto</h3>
            {loading ? (
              <p style={{ color: "#9a8060" }}>Carregando...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {pedidos.map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", backgroundColor: "#FAF6EE", borderRadius: "0.5rem", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#5a4a2a", fontWeight: 600 }}>Pedido {p.id.slice(0, 8)}</div>
                      <div style={{ color: "#9a8060", fontSize: "0.75rem", marginTop: "0.2rem" }}>Total: {fmt(p.total)} | Pago: {fmt(p.amountPaid)}</div>
                    </div>
                    <span style={{ color: "#b8891a", fontWeight: 700, minWidth: "100px", textAlign: "right" }}>Saldo: {fmt(p.saldoPendente)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "1rem", backgroundColor: "#b8891a", borderRadius: "0.5rem", color: "#fff", fontWeight: 900, fontSize: "1.1rem" }}>
                  <span>Total em Aberto</span>
                  <span>{fmt(totalDevido)}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── REGISTRAR PAGAMENTO ── */}
          <div style={{ marginBottom: "2rem", backgroundColor: "#f0faf4", borderRadius: "0.75rem", padding: "1.25rem", border: "1px solid rgba(46,125,50,0.2)" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#2e7d32", marginBottom: "1rem", textTransform: "uppercase" }}>💵 Registrar Pagamento</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#5a4a2a", marginBottom: "0.3rem" }}>Valor recebido (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={valorPagamento}
                  onChange={e => { setValorPagamento(e.target.value); setConfirmPagamento(false); }}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid rgba(46,125,50,0.3)", fontSize: "1rem", fontWeight: 700, backgroundColor: "#fff", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#5a4a2a", marginBottom: "0.3rem" }}>Forma de pagamento</label>
                <select
                  value={metodoPagamento}
                  onChange={e => setMetodoPagamento(e.target.value)}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid rgba(46,125,50,0.3)", fontSize: "0.95rem", fontWeight: 700, backgroundColor: "#fff", boxSizing: "border-box" }}
                >
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="credito">Cartão Crédito</option>
                  <option value="debito">Cartão Débito</option>
                  <option value="transferencia">Transferência</option>
                </select>
              </div>
            </div>

            {valorPagamento && parseFloat(valorPagamento.replace(",", ".")) > 0 && (
              <div style={{ backgroundColor: "#fff", borderRadius: "0.5rem", padding: "0.75rem", marginBottom: "0.75rem", fontSize: "0.85rem", color: "#5a4a2a", border: "1px solid rgba(46,125,50,0.2)" }}>
                <div>Recebendo: <strong style={{ color: "#2e7d32" }}>{fmt(parseFloat(valorPagamento.replace(",", ".")))}</strong></div>
                <div>Saldo após pagamento: <strong style={{ color: totalDevido - parseFloat(valorPagamento.replace(",", ".")) > 0 ? "#b8891a" : "#2e7d32" }}>{fmt(Math.max(0, totalDevido - parseFloat(valorPagamento.replace(",", "."))))}</strong></div>
                {parseFloat(valorPagamento.replace(",", ".")) > totalDevido && (
                  <div style={{ color: "#c04040", marginTop: "0.3rem", fontWeight: 700 }}>⚠️ Valor maior que o saldo em aberto ({fmt(totalDevido)})</div>
                )}
              </div>
            )}

            {!confirmPagamento ? (
              <button
                onClick={() => setConfirmPagamento(true)}
                disabled={!valorPagamento || parseFloat(valorPagamento.replace(",", ".")) <= 0}
                style={{ backgroundColor: "#2e7d32", color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.75rem 1.5rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", opacity: (!valorPagamento || parseFloat(valorPagamento.replace(",", ".")) <= 0) ? 0.4 : 1 }}
              >
                Dar baixa no pagamento
              </button>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "#5a4a2a", fontWeight: 600 }}>Confirmar pagamento de {fmt(parseFloat(valorPagamento.replace(",", ".")))}?</span>
                <button onClick={handleRegistrarPagamento} disabled={registrando} style={{ backgroundColor: "#2e7d32", color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.5rem 1rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                  {registrando ? "..." : "Sim, confirmar"}
                </button>
                <button onClick={() => setConfirmPagamento(false)} style={{ backgroundColor: "#fff", color: "#5a4a2a", border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.5rem", padding: "0.5rem 1rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Parcelas existentes OU formulário de consolidar */}
          {(() => {
            const todasParcelas = pedidos.flatMap(p =>
              (p.installments || []).map(inst => ({ ...inst, pedidoId: p.id }))
            ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

            const temParcelas = todasParcelas.length > 0;

            // Varios pedidos parcelados viram dezenas de linhas. Agrupadas por
            // vencimento, viram o que voce combinou com ela: "tanto por mes".
            const porMes = new Map<string, { data: string; valor: number; pedidos: number; pagas: number; total: number }>();
            for (const i of todasParcelas) {
              const chave = String(i.dueDate).slice(0, 10);
              const g = porMes.get(chave) || { data: chave, valor: 0, pedidos: 0, pagas: 0, total: 0 };
              g.valor += i.amount;
              g.pedidos += 1;
              g.total += 1;
              if (i.status === "paid") g.pagas += 1;
              porMes.set(chave, g);
            }
            const meses = [...porMes.values()];

            return temParcelas ? (
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#5a4a2a", marginBottom: "1rem", textTransform: "uppercase" }}>📅 Parcelas definidas</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {meses.map(m => {
                    const paga = m.pagas === m.total;
                    const vencida = !paga && new Date(m.data) < new Date();
                    return (
                      <div key={m.data} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", padding: "0.75rem 1rem", borderRadius: "0.625rem", backgroundColor: paga ? "#e8f8e8" : vencida ? "#fee8e8" : "#fff8e1", border: `1px solid ${paga ? "rgba(46,125,50,0.15)" : vencida ? "rgba(192,64,64,0.15)" : "rgba(184,137,26,0.15)"}` }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: paga ? "#2e7d32" : vencida ? "#c04040" : "#b8891a" }}>
                            {new Date(m.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                            {vencida && " ⚠️"}
                          </span>
                          <span style={{ fontSize: "0.78rem", color: "#9a8060", marginLeft: "0.75rem" }}>
                            {m.pedidos === 1 ? "1 pedido" : `${m.pedidos} pedidos`}
                            {m.pagas > 0 && m.pagas < m.total && ` · ${m.pagas} já paga(s)`}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{ fontWeight: 900, color: "#1a1510" }}>{fmt(m.valor)}</span>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "999px", backgroundColor: paga ? "#c8f0cc" : vencida ? "#fdd" : "#fff3cd", color: paga ? "#2e7d32" : vencida ? "#c04040" : "#856404" }}>
                            {paga ? "✓ Pago" : vencida ? "Vencida" : "Pendente"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: "0.75rem", padding: "0.625rem 1rem", backgroundColor: "#FAF6EE", borderRadius: "0.625rem", display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "#9a8060" }}>Total parcelado</span>
                  <span style={{ fontWeight: 700, color: "#b8891a" }}>{fmt(todasParcelas.filter(i => i.status !== "paid").reduce((s, i) => s + i.amount, 0))} em aberto</span>
                </div>
              </div>
            ) : null;
          })()}

          {/* Reparcelar tudo: o combinado e com a pessoa, nao com cada pedido */}
          {(() => {
            const jaTemParcelas = pedidos.some(p => (p.installments || []).length > 0);
            return (
              <>
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#5a4a2a", marginBottom: "0.4rem", textTransform: "uppercase" }}>
                    {jaTemParcelas ? "Reparcelar tudo" : "Parcelamento"}
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "#9a8060", marginBottom: "1rem", maxWidth: "62ch" }}>
                    {jaTemParcelas
                      ? `Refaz o combinado com ela nos ${pedidos.filter(p => p.saldoPendente > 0.01).length} pedidos em aberto de uma vez. As parcelas já pagas continuam como estão.`
                      : "Divide tudo o que ela deve no caderno, em todos os pedidos em aberto de uma vez."}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#5a4a2a", marginBottom: "0.4rem" }}>Quantidade de Parcelas</label>
                      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <input type="number" min="1" max="12" value={parcelas} onChange={e => setParcelas(e.target.value)} style={{ width: "100px", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid rgba(140,100,20,0.2)", fontSize: "1rem", fontWeight: 700 }} />
                        <span style={{ color: "#9a8060", fontWeight: 600 }}>vezes</span>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#5a4a2a", marginBottom: "0.4rem" }}>1º Vencimento</label>
                      <input type="date" value={primeiroVencimento} onChange={e => setPrimeiroVencimento(e.target.value)} style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid rgba(140,100,20,0.2)", fontSize: "1rem", fontWeight: 700 }} />
                    </div>
                  </div>
                  <div style={{ color: "#b8891a", fontWeight: 700, fontSize: "0.95rem" }}>Valor/parcela: {fmt(valorParcela)}</div>
                </div>
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#5a4a2a", marginBottom: "1rem", textTransform: "uppercase" }}>📊 Projeção</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                    {projecao.map((p, i) => (
                      <div key={i} style={{ backgroundColor: "#FAF6EE", borderRadius: "0.75rem", padding: "1rem", textAlign: "center" }}>
                        <div style={{ color: "#9a8060", fontSize: "0.75rem", marginBottom: "0.3rem" }}>Vencimento</div>
                        <div style={{ color: "#5a4a2a", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem" }}>{p.dia} de {p.mes}</div>
                        <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#b8891a" }}>{fmt(p.valor)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={enviarResumoWhatsApp} style={{ backgroundColor: "#25D366", color: "#fff", padding: "1rem 1.5rem", borderRadius: "0.75rem", border: "none", fontSize: "0.95rem", fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Enviar resumo
            </button>
            <button onClick={handleConsolidar} disabled={consolidando} style={{ backgroundColor: "#b8891a", color: "#fff", padding: "1rem 2rem", borderRadius: "0.75rem", border: "none", fontSize: "1rem", fontWeight: 900, cursor: consolidando ? "not-allowed" : "pointer", opacity: consolidando ? 0.6 : 1, flex: 1 }}>
              {consolidando
                ? "Refazendo..."
                : pedidos.some(p => (p.installments || []).length > 0)
                  ? `Reparcelar tudo em ${numParcelas}×`
                  : `Parcelar tudo em ${numParcelas}×`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
