"use client";
import { useState, useMemo, useEffect, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import { useAdmin } from "@/store/admin";
import { useMobileView } from "@/hooks/useMediaQuery";
import ProdutosSemCusto from "../ProdutosSemCusto";
import OrderTimeline from "../../components/OrderTimeline";
import { ORDER_STATUS_LABEL as STATUS_LABEL, ORDER_STATUS_COLOR as STATUS_COLOR, ORDER_STATUS_ICON as STATUS_ICON } from "@/lib/orderStatus";

type OrderItem = { id: string; quantity: number; price: number; size?: string; costPrice?: number | null; product: { id: string; name: string; costPrice?: number | null } };
type Installment = { id: string; number: number; amount: number; dueDate: string; status: string; paidAt?: string | null };
type StatusHistoryEntry = { status: string; createdAt: string };
type Order = {
  id: string; status: string; paymentStatus: string; paymentMethod: string; amountPaid: number;
  total: number; subtotal: number; shipping: number; discount: number; notes?: string;
  createdAt: string; dueDate?: string | null; installmentCount: number;
  user: { id: string; name: string; email: string; phone?: string };
  items: OrderItem[];
  installments: Installment[];
  statusHistory: StatusHistoryEntry[];
};

// Adiciona uma entrada otimista no histórico local ao mudar o status (o servidor já grava de verdade)
function withStatusChange(order: Order, status: string): Order {
  if (status === order.status) return order;
  return { ...order, status, statusHistory: [{ status, createdAt: new Date().toISOString() }, ...order.statusHistory] };
}

const PAY_LABEL: Record<string, string> = {
  paid: "Pago", partial: "Parcial", pending: "Pendente",
};
const PAY_COLOR: Record<string, { bg: string; color: string }> = {
  paid:    { bg: "#e8f8e8", color: "#1a8a2a" },
  partial: { bg: "#fff8e1", color: "#b8891a" },
  pending: { bg: "#fee8e8", color: "#c04040" },
};

const METHOD_LABEL: Record<string, string> = {
  pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro", caderno: "Caderno", link: "Link",
};
const METHOD_COLOR: Record<string, { bg: string; color: string }> = {
  pix:      { bg: "#e8f4fd", color: "#1a6a9a" },
  cartao:   { bg: "#f0e8ff", color: "#6a30b8" },
  dinheiro: { bg: "#e8f8e8", color: "#1a8a2a" },
  caderno:  { bg: "#fff3cd", color: "#856404" },
  link:     { bg: "#fce8ff", color: "#8a1ab8" },
};

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Retorna o nome real do item — se for "Venda Manual", usa o campo size como nome
function itemName(item: { product: { name: string }; size?: string; componentName?: string }): string {
  const isVendaManual = item.product.name === "Venda Manual";
  if (isVendaManual) return item.size || "Item";
  if (item.componentName) return `${item.product.name} - ${item.componentName}`;
  if (item.size) return `${item.product.name} (${item.size})`;
  return item.product.name;
}

type Customer = { id: string; name: string | null; email: string };

export default function PedidosClient({ orders, customers = [] }: { orders: Order[]; customers?: Customer[] }) {
  const { hideProfit } = useAdmin();
  const isMobile = useMobileView();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [payFilter, setPayFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [filterPending, setFilterPending] = useState(false);
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState<string | null>(searchParams.get("expand"));
  const [activeTab, setActiveTab] = useState<"itens" | "pagamento" | "cliente" | "jornada">("itens");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [localOrders, setLocalOrders] = useState(orders);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const id = searchParams.get("expand");
    if (id) {
      setExpanded(id);
      setTimeout(() => document.getElementById(`order-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  }, []);

  // Busca despesas do período para calcular lucro correto
  useEffect(() => {
    const loadExpenses = async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/admin/despesas?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTotalExpenses(data.total || 0);
      }
    };
    loadExpenses();
  }, [dateFrom, dateTo]);
  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editAmountPaid, setEditAmountPaid] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editInstallments, setEditInstallments] = useState(1);
  const [taxaAbsorvida, setTaxaAbsorvida] = useState(true);
  const [editandoDesconto, setEditandoDesconto] = useState<string | null>(null);
  const [descontoValor, setDescontoValor] = useState("");
  const [descontoTipo, setDescontoTipo] = useState<"reais" | "percent">("reais");
  const [salvandoDesconto, setSalvandoDesconto] = useState(false);
  const [togglingInstallment, setTogglingInstallment] = useState<string | null>(null);
  const [editingItemCost, setEditingItemCost] = useState<string | null>(null);
  const [itemCostValue, setItemCostValue] = useState("");
  const [editingItemPrice, setEditingItemPrice] = useState<string | null>(null);
  const [itemPriceValue, setItemPriceValue] = useState("");
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [editingInstallmentId, setEditingInstallmentId] = useState<string | null>(null);
  const [editInstallmentDate, setEditInstallmentDate] = useState("");
  const [editInstallmentAmount, setEditInstallmentAmount] = useState("");
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [reassignSearch, setReassignSearch] = useState("");
  const [reassignSaving, setReassignSaving] = useState(false);
  const [localCustomers, setLocalCustomers] = useState<Customer[]>(customers);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [ncName, setNcName] = useState("");
  const [ncPhone, setNcPhone] = useState("");
  const [ncEmail, setNcEmail] = useState("");
  const [ncError, setNcError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copyingLinkId, setCopyingLinkId] = useState<string | null>(null);
  const [trocaOrderId, setTrocaOrderId] = useState<string | null>(null);
  const [trocaReason, setTrocaReason] = useState("");
  const [trocaItemIds, setTrocaItemIds] = useState<string[]>([]);
  const [trocaSaving, setTrocaSaving] = useState(false);

  const filtered = useMemo(() => {
    return localOrders.filter(o => {
      if (statusFilter && o.status !== statusFilter) return false;
      // Rascunhos gerados por link de preview ficam fora da listagem por padrao
      if (o.status === "preview" && !showPreview && statusFilter !== "preview" && o.id !== expanded) return false;
      if (payFilter && o.paymentStatus !== payFilter) return false;
      if (methodFilter && o.paymentMethod !== methodFilter) return false;
      if (filterPending && o.status !== "pending") return false;
      if (dateFrom && new Date(o.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(o.createdAt) > new Date(dateTo + "T23:59:59")) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!o.user.name.toLowerCase().includes(q) &&
            !o.id.toLowerCase().includes(q) &&
            !o.user.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [localOrders, statusFilter, payFilter, methodFilter, filterPending, dateFrom, dateTo, search, showPreview, expanded]);

  const selectedOrders = localOrders.filter(o => selectedIds.includes(o.id));
  const selectedSameCustomer = selectedOrders.length > 0 && selectedOrders.every(o => o.user.id === selectedOrders[0].user.id);

  const activeFiltered = filtered.filter(o => o.status !== "cancelled");
  const totalReceita = activeFiltered.reduce((s, o) => s + o.total, 0);
  const totalCusto = activeFiltered.reduce((s, o) =>
    s + o.items.reduce((si, item) => {
      const c = item.costPrice ?? item.product.costPrice;
      return si + (c != null ? c * item.quantity : 0);
    }, 0), 0);
  const itemsComCusto = activeFiltered.flatMap(o => o.items).filter(i => (i.costPrice ?? i.product.costPrice) !== null).length;
  const totalItems = activeFiltered.flatMap(o => o.items).length;
  // Receita apenas dos itens com custo registrado
  const receitaComCusto = activeFiltered.reduce((s, o) =>
    s + o.items.reduce((si, item) => {
      const c = item.costPrice ?? item.product.costPrice;
      return si + (c != null ? item.price * item.quantity : 0);
    }, 0), 0);
  // Lucro = Receita - Custo do Produto - Despesas Gerais (estoque, marketing, frete, cartão, etc)
  const lucroLiquido = totalReceita - totalCusto - totalExpenses;
  const margemLucro = receitaComCusto > 0 ? ((receitaComCusto - totalCusto - totalExpenses) / receitaComCusto) * 100 : 0;
  const totalEmAberto = filtered.filter(o => o.paymentStatus !== "paid").reduce((s, o) => s + (o.total - o.amountPaid), 0);
  const cadernoTotal = localOrders.filter(o => o.paymentMethod === "caderno" && o.paymentStatus !== "paid" && o.status !== "cancelled")
    .reduce((s, o) => s + (o.total - o.amountPaid), 0);
  const cadernoCount = localOrders.filter(o => o.paymentMethod === "caderno" && o.paymentStatus !== "paid" && o.status !== "cancelled").length;

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    const res = await fetch(`/api/admin/pedidos/${orderId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setLocalOrders(prev => prev.map(o => o.id === orderId ? withStatusChange(o, status) : o));
    setUpdatingId(null);
  };

  const handleSolicitarTroca = async () => {
    if (!trocaOrderId || !trocaReason.trim() || trocaItemIds.length === 0) return;
    setTrocaSaving(true);
    const order = localOrders.find(o => o.id === trocaOrderId);
    const trocaItems = order?.items.filter(i => trocaItemIds.includes(i.id)) ?? [];
    const amount = trocaItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const itensResumo = trocaItems.map(i => itemName(i)).join(", ");
    const res = await fetch("/api/admin/devolucoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: trocaOrderId, reason: `Item(s): ${itensResumo}\n\n${trocaReason.trim()}`, amount, itemIds: trocaItemIds }),
    });
    if (res.ok) {
      setTrocaOrderId(null);
      setTrocaReason("");
      setTrocaItemIds([]);
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error || "Não foi possível solicitar a troca.");
    }
    setTrocaSaving(false);
  };

  const startEditPayment = (order: Order) => {
    setEditingPayment(order.id);
    setEditAmountPaid(String(order.amountPaid));
    setEditPaymentStatus(order.paymentStatus);
    setEditPaymentMethod(order.paymentMethod || "pix");
    setEditDueDate(order.dueDate ? new Date(order.dueDate).toISOString().slice(0, 10) : "");
    setEditInstallments(order.installmentCount || 1);
    setTaxaAbsorvida(true);
  };

  const savePayment = async (orderId: string) => {
    const amountPaid = parseFloat(editAmountPaid) || 0;
    const order = localOrders.find(o => o.id === orderId);
    if (!order) return;

    // Link de pagamento com taxa absorvida: a cliente pagou tudo, a diferenca
    // ficou com a operadora — o pedido esta quitado, nao ha saldo a cobrar
    const ehTaxaLink = editPaymentMethod === "link" && amountPaid > 0 && amountPaid < order.total;
    const statusFinal = ehTaxaLink && taxaAbsorvida ? "paid" : editPaymentStatus;

    const res = await fetch(`/api/admin/pedidos/${orderId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentStatus: statusFinal, paymentMethod: editPaymentMethod, amountPaid,
        dueDate: editDueDate || null, installmentCount: editInstallments,
        generateInstallments: !!editDueDate && editInstallments > 0,
      }),
    });

    // Registra a taxa como despesa uma vez so: salvar de novo o mesmo valor
    // nao pode gerar outro lancamento
    if (ehTaxaLink && Math.abs(order.amountPaid - amountPaid) > 0.001) {
      const taxAmount = order.total - amountPaid;
      await fetch("/api/admin/despesas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString(),
          description: `Taxa operadora - Pedido #${order.id.slice(-8).toUpperCase()}`,
          amount: taxAmount,
          category: "taxa_operadora",
          paymentMethod: "link",
          notes: `Valor total: R$ ${order.total}, Recebido: R$ ${amountPaid}`,
        }),
      }).catch(() => {});
    }
    if (res.ok) {
      const updated = await res.json();
      setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
    }
    setEditingPayment(null);
  };

  const salvarDesconto = async (orderId: string) => {
    const order = localOrders.find(o => o.id === orderId);
    if (!order) return;
    const bruto = parseFloat(descontoValor.replace(",", ".")) || 0;
    const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    // Percentual e convertido em reais na hora: o pedido guarda sempre o valor
    const desconto = Math.min(descontoTipo === "percent" ? (subtotal * bruto) / 100 : bruto, subtotal);

    setSalvandoDesconto(true);
    const res = await fetch(`/api/admin/pedidos/${orderId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discount: Math.round(desconto * 100) / 100 }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated, items: o.items, user: o.user } : o));
    }
    setSalvandoDesconto(false);
    setEditandoDesconto(null);
    setDescontoValor("");
  };

  const generateShareLink = (orderId: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : "https://www.accessfit.com.br";
    const link = `${baseUrl}/pedido-preview/${orderId}`;

    try {
      navigator.clipboard.writeText(link).then(() => {
        setCopyingLinkId(orderId);
        setTimeout(() => setCopyingLinkId(null), 2000);
        alert(`✓ Link copiado!\n\n${link}`);
      }).catch(() => {
        alert(`Link para copiar:\n\n${link}`);
      });
    } catch (e) {
      alert(`Link:\n\n${link}`);
    }
  };

  const removeItem = async (orderId: string, itemId: string) => {
    if (!confirm("Remover este item do pedido?")) return;
    setRemovingItemId(itemId);
    const res = await fetch(`/api/admin/order-items/${itemId}`, { method: "DELETE" });
    if (res.ok) {
      const { newTotal } = await res.json();
      setLocalOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        items: o.items.filter(i => i.id !== itemId),
        total: newTotal,
        subtotal: newTotal,
      } : o));
    }
    setRemovingItemId(null);
  };

  const saveItemCost = async (orderId: string, itemId: string) => {
    const res = await fetch(`/api/admin/order-items/${itemId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ costPrice: itemCostValue }),
    });
    if (res.ok) {
      const cost = parseFloat(itemCostValue) || null;
      setLocalOrders(prev => prev.map(o => o.id === orderId ? {
        ...o, items: o.items.map(i => i.id === itemId ? { ...i, costPrice: cost } : i)
      } : o));
    }
    setEditingItemCost(null);
  };

  const saveItemPrice = async (orderId: string, itemId: string) => {
    const newPrice = parseFloat(itemPriceValue);
    if (isNaN(newPrice) || newPrice < 0) { setEditingItemPrice(null); return; }
    const res = await fetch(`/api/admin/order-items/${itemId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: newPrice }),
    });
    if (res.ok) {
      setLocalOrders(prev => prev.map(o => {
        if (o.id !== orderId) return o;
        const items = o.items.map(i => i.id === itemId ? { ...i, price: newPrice } : i);
        const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
        return { ...o, items, total, subtotal: total };
      }));
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error || "Não foi possível alterar o preço.");
    }
    setEditingItemPrice(null);
  };

  const toggleInstallment = async (orderId: string, installmentId: string, currentStatus: string) => {
    setTogglingInstallment(installmentId);
    const newStatus = currentStatus === "paid" ? "pending" : "paid";
    const res = await fetch(`/api/admin/parcelas/${installmentId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setLocalOrders(prev => prev.map(o => o.id === orderId ? {
        ...o,
        installments: o.installments.map(i => i.id === installmentId ? { ...i, status: newStatus } : i),
        paymentStatus: o.installments.every(i => (i.id === installmentId ? newStatus : i.status) === "paid") ? "paid"
          : o.installments.some(i => (i.id === installmentId ? newStatus : i.status) === "paid") ? "partial" : "pending",
        amountPaid: o.installments.filter(i => (i.id === installmentId ? newStatus : i.status) === "paid").reduce((s, i) => s + i.amount, 0),
      } : o));
    }
    setTogglingInstallment(null);
  };

  const saveInstallmentEdit = async (orderId: string, installmentId: string) => {
    const body: Record<string, unknown> = {};
    if (editInstallmentDate) body.dueDate = editInstallmentDate;
    if (editInstallmentAmount) body.amount = parseFloat(editInstallmentAmount);
    await fetch(`/api/admin/parcelas/${installmentId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLocalOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      installments: o.installments.map(i => i.id === installmentId ? {
        ...i,
        dueDate: editInstallmentDate || i.dueDate,
        amount: editInstallmentAmount ? parseFloat(editInstallmentAmount) : i.amount,
      } : i),
    } : o));
    setEditingInstallmentId(null);
  };

  const createAndAssignCustomer = async (orderId: string) => {
    const name = ncName.trim();
    if (!name) { setNcError("Informe o nome do cliente."); return; }
    setNcError("");
    setReassignSaving(true);
    // Sem e-mail informado, o servidor gera um interno automaticamente
    const res = await fetch("/api/admin/clientes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email: ncEmail.trim() || null, phone: ncPhone.trim() || null }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setNcError(data.error || "Não foi possível cadastrar o cliente.");
      setReassignSaving(false);
      return;
    }
    const created = await res.json();
    setLocalCustomers(prev => [...prev, { id: created.id, name: created.name, email: created.email }]);
    setReassignSaving(false);
    setNewCustomerOpen(false);
    setNcName(""); setNcPhone(""); setNcEmail("");
    await reassignCustomer(orderId, created);
  };

  const reassignCustomer = async (orderId: string, newUser: { id: string; name: string | null; email: string }) => {
    setReassignSaving(true);
    const res = await fetch(`/api/admin/pedidos/${orderId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: newUser.id }),
    });
    if (res.ok) {
      setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, user: { ...o.user, id: newUser.id, name: newUser.name || "", email: newUser.email } } : o));
    }
    setReassignSaving(false);
    setReassigningId(null);
    setReassignSearch("");
    setNewCustomerOpen(false);
  };

  const inp = { padding: "0.55rem 0.875rem", border: "1px solid rgba(140,100,20,0.25)", borderRadius: "0.625rem", fontSize: "0.8rem", backgroundColor: "#FAF6EE", outline: "none" };

  // Mantem a coluna de acoes visivel quando a tabela precisa rolar na horizontal
  const stickyRight = (bg: string) => ({
    position: "sticky" as const,
    right: 0,
    zIndex: 2,
    backgroundColor: bg,
    boxShadow: "-6px 0 8px -6px rgba(0,0,0,0.12)",
  });

  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: isMobile ? "1rem" : "2rem 1.5rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <a href="/admin" style={{ color: "#b8891a", fontSize: "0.875rem", textDecoration: "none" }}>← Admin</a>
          <h1 style={{ color: "#1a1510", fontSize: "1.75rem", fontWeight: 900, marginTop: "0.2rem" }}>Pedidos</h1>
        </div>
        <a href="/admin/pedidos/novo" style={{ backgroundColor: "#b8891a", color: "#fff", padding: "0.6rem 1.25rem", borderRadius: "0.75rem", fontWeight: 800, fontSize: "0.875rem", textDecoration: "none", boxShadow: "0 2px 8px rgba(184,137,26,0.3)" }}>
          + Novo Pedido
        </a>
      </div>

      {/* Aviso produtos sem custo */}
      <ProdutosSemCusto />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        {[
          { emoji: "🛍️", label: "Total de Pedidos", value: filtered.length, gold: false },
          { emoji: "✅", label: "Entregues", value: filtered.filter(o => o.status === "delivered").length, gold: false },
          { emoji: "⏱️", label: "Pendentes de Confirmação", value: localOrders.filter(o => o.status === "pending").length, gold: false, warn: localOrders.filter(o => o.status === "pending").length > 0, pending: true },
          { emoji: "📒", label: "Caderno na Rua", value: fmt(cadernoTotal), gold: false, caderno: cadernoTotal > 0 },
          { emoji: "🚫", label: "Cancelados", value: localOrders.filter(o => o.status === "cancelled").length, gold: false, cancel: true },
        ].map(s => (
          <div key={s.label}
            onClick={(s as any).caderno ? () => setMethodFilter(methodFilter === "caderno" ? "" : "caderno") : (s as any).cancel ? () => setStatusFilter(statusFilter === "cancelled" ? "" : "cancelled") : (s as any).pending ? () => setFilterPending(!filterPending) : undefined}
            style={{
              backgroundColor: (s as any).caderno ? (methodFilter === "caderno" ? "#856404" : "#fffbea") : (s as any).cancel ? (statusFilter === "cancelled" ? "#c04040" : "#fff5f5") : (s as any).pending ? (filterPending ? "#fff3e0" : "#fff") : s.gold ? "#b8891a" : "#fff",
              border: `1px solid ${(s as any).warn ? "rgba(192,64,64,0.25)" : (s as any).caderno ? "rgba(133,100,4,0.3)" : (s as any).cancel ? "rgba(192,64,64,0.2)" : (s as any).pending ? "rgba(184,137,26,0.3)" : s.gold ? "none" : "rgba(140,100,20,0.1)"}`,
              borderRadius: "0.875rem", padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              cursor: (s as any).caderno || (s as any).cancel || (s as any).pending ? "pointer" : "default",
            }}>
            <div style={{ fontSize: "1.25rem", marginBottom: "0.4rem" }}>{s.emoji}</div>
            <div style={{ color: hideProfit ? "#e8e0d0" : ((s as any).lucro ? "#1a8a2a" : (s as any).caderno ? (methodFilter === "caderno" ? "#fff" : "#856404") : (s as any).cancel ? (statusFilter === "cancelled" ? "#fff" : "#c04040") : (s as any).pending ? (filterPending ? "#b8891a" : "#1a1510") : s.gold ? "#fff" : "#1a1510"), fontSize: "1.4rem", fontWeight: 900 }}>
              {hideProfit ? "—" : s.value}
            </div>
            <div style={{ color: (s as any).caderno ? (methodFilter === "caderno" ? "rgba(255,255,255,0.8)" : "#a07820") : (s as any).cancel ? (statusFilter === "cancelled" ? "rgba(255,255,255,0.8)" : "#c04040") : (s as any).pending ? (filterPending ? "#b8891a" : "#9a8060") : s.gold ? "rgba(255,255,255,0.8)" : "#9a8060", fontSize: "0.75rem", marginTop: "0.2rem" }}>
              {s.label}{(s as any).caderno && cadernoCount > 0 ? ` (${cadernoCount} pedidos)` : ""}
            </div>
            {(s as any).sub && <div style={{ color: hideProfit ? "#e8e0d0" : "#1a8a2a", fontSize: "0.68rem", fontWeight: 700, marginTop: "0.1rem" }}>{hideProfit ? "—" : (s as any).sub}</div>}
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)", borderRadius: "1rem", padding: "1rem 1.25rem", marginBottom: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <input type="text" placeholder="🔍 Buscar cliente ou pedido..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, minWidth: 200, flex: 1 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inp, minWidth: 150 }}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={payFilter} onChange={e => setPayFilter(e.target.value)} style={{ ...inp, minWidth: 140 }}>
          <option value="">Todos pagamentos</option>
          {Object.entries(PAY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} style={{ ...inp, minWidth: 140 }}>
          <option value="">Todas as formas</option>
          {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {/* Período */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.75rem", color: "#9a8060", whiteSpace: "nowrap" }}>De:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp, width: 135 }} />
          <span style={{ fontSize: "0.75rem", color: "#9a8060" }}>até:</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inp, width: 135 }} />
        </div>
        {/* Rascunhos de link de preview */}
        {localOrders.some(o => o.status === "preview") && (
          <button onClick={() => setShowPreview(!showPreview)}
            title="Rascunhos criados automaticamente quando alguém gera um link de preview do carrinho"
            style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.35rem 0.7rem", borderRadius: "999px", border: "none", cursor: "pointer", whiteSpace: "nowrap", backgroundColor: showPreview ? "#8a1ab8" : "#FAF6EE", color: showPreview ? "#fff" : "#9a8060" }}>
            {showPreview ? "Ocultar" : "Ver"} rascunhos ({localOrders.filter(o => o.status === "preview").length})
          </button>
        )}

        {/* Atalhos de período */}
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {[
            { label: "Hoje", days: 0 },
            { label: "7 dias", days: 7 },
            { label: "Este mês", month: true },
          ].map(p => {
            const now = new Date();
            const from = p.month
              ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
              : p.days === 0
                ? now.toISOString().slice(0, 10)
                : new Date(now.getTime() - (p.days ?? 0) * 86400000).toISOString().slice(0, 10);
            const to = now.toISOString().slice(0, 10);
            const active = dateFrom === from && dateTo === to;
            return (
              <button key={p.label}
                onClick={() => { if (active) { setDateFrom(""); setDateTo(""); } else { setDateFrom(from); setDateTo(to); } }}
                style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.35rem 0.7rem", borderRadius: "999px", border: "none", cursor: "pointer", backgroundColor: active ? "#b8891a" : "#FAF6EE", color: active ? "#fff" : "#9a8060" }}>
                {p.label}
              </button>
            );
          })}
        </div>
        {(search || statusFilter || payFilter || methodFilter || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(""); setStatusFilter(""); setPayFilter(""); setMethodFilter(""); setDateFrom(""); setDateTo(""); }}
            style={{ backgroundColor: "#FAF6EE", border: "1px solid rgba(140,100,20,0.2)", color: "#9a8060", fontWeight: 700, fontSize: "0.75rem", padding: "0.55rem 0.875rem", borderRadius: "0.625rem", cursor: "pointer" }}>
            ✕ Limpar
          </button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", backgroundColor: "#FAF6EE", border: "1px solid rgba(184,137,26,0.3)", borderRadius: "0.875rem", padding: "0.75rem 1rem", marginBottom: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#5a4a2a" }}>
            <strong>{selectedIds.length}</strong> pedido{selectedIds.length > 1 ? "s" : ""} selecionado{selectedIds.length > 1 ? "s" : ""}
            {selectedOrders.length > 0 && !selectedSameCustomer && (
              <span style={{ color: "#c04040", fontWeight: 700 }}> — precisam ser do mesmo cliente</span>
            )}
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => setSelectedIds([])}
              style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.2)", color: "#9a8060", fontWeight: 700, fontSize: "0.78rem", padding: "0.5rem 0.875rem", borderRadius: "0.625rem", cursor: "pointer" }}>
              Limpar seleção
            </button>
            {selectedIds.length > 1 && selectedSameCustomer && (
              <a href={`/admin/pedidos/multi-nota?ids=${selectedIds.join(",")}`} target="_blank" rel="noopener noreferrer"
                style={{ backgroundColor: "#b8891a", color: "#fff", fontWeight: 700, fontSize: "0.78rem", padding: "0.5rem 1rem", borderRadius: "0.625rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                🧾 Gerar Nota Unificada
              </a>
            )}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.1)", borderRadius: "1rem", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#FAF6EE" }}>
                <th style={{ padding: isMobile ? "0.625rem 0.5rem" : "0.875rem 0.75rem", borderBottom: "1px solid rgba(140,100,20,0.1)", position: "sticky", left: 0, zIndex: 2, backgroundColor: "#FAF6EE" }}>
                  <input type="checkbox"
                    checked={filtered.length > 0 && filtered.every(o => selectedIds.includes(o.id))}
                    onChange={e => setSelectedIds(e.target.checked ? filtered.map(o => o.id) : [])}
                    style={{ cursor: "pointer" }} />
                </th>
                {["Pedido", "Cliente", ...(isMobile ? [] : ["Produtos"]), "Total", ...(isMobile ? [] : ["Entrega", "Pagamento", "Forma", "Data", "Ações"])].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: isMobile ? "0.625rem 0.75rem" : "0.875rem 0.75rem", color: "#9a8060", fontWeight: 700, fontSize: isMobile ? "0.7rem" : "0.75rem", borderBottom: "1px solid rgba(140,100,20,0.1)", whiteSpace: "nowrap", ...(h === "Ações" ? stickyRight("#FAF6EE") : {}) }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: "3rem", color: "#b8a080" }}>Nenhum pedido encontrado.</td></tr>
              ) : filtered.map(order => {
                const sc = STATUS_COLOR[order.status] || { bg: "#f0f0f0", color: "#666" };
                const pc = PAY_COLOR[order.paymentStatus] || { bg: "#f0f0f0", color: "#666" };
                const mc = METHOD_COLOR[order.paymentMethod] || { bg: "#f0f0f0", color: "#666" };
                const isExpanded = expanded === order.id;
                const firstItem = order.items[0];
                const produtoNome = firstItem
                  ? (firstItem.product?.name !== "Venda Manual"
                      ? `${firstItem.product?.name}${firstItem.size ? ` (${firstItem.size})` : ""}`
                      : firstItem.size || firstItem.product?.name || "—")
                  : "—";
                const maisItens = order.items.length > 1 ? ` +${order.items.length - 1}` : "";
                return (
                  <Fragment key={order.id}>
                    <tr id={`order-${order.id}`} style={{ borderBottom: isExpanded ? "none" : "1px solid rgba(140,100,20,0.06)", cursor: "pointer", backgroundColor: isExpanded ? "#FDFAF4" : "transparent" }}
                      onClick={() => { setExpanded(isExpanded ? null : order.id); setActiveTab("itens"); }}>
                      <td style={{ padding: isMobile ? "0.625rem 0.5rem" : "0.875rem 0.75rem", position: "sticky", left: 0, zIndex: 1, backgroundColor: isExpanded ? "#FDFAF4" : "#fff" }} onClick={e => e.stopPropagation()}>
                        <input type="checkbox"
                          checked={selectedIds.includes(order.id)}
                          onChange={e => setSelectedIds(prev => e.target.checked ? [...prev, order.id] : prev.filter(id => id !== order.id))}
                          style={{ cursor: "pointer" }} />
                      </td>
                      <td style={{ padding: "0.875rem 0.75rem", fontFamily: "monospace", fontSize: "0.72rem", color: "#9a8060" }}>
                        {isExpanded ? "▼" : "▶"} #{order.id.slice(-8).toUpperCase()}
                      </td>
                      <td style={{ padding: isMobile ? "0.625rem 0.75rem" : "0.875rem 0.75rem" }}>
                        <div style={{ color: "#1a1510", fontWeight: 600, fontSize: isMobile ? "0.8rem" : "0.875rem" }}>{order.user.name}</div>
                        {!isMobile && <div title={order.user.email} style={{ color: "#9a8060", fontSize: "0.7rem", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{order.user.email}</div>}
                      </td>
                      {!isMobile && <td style={{ padding: "0.875rem 0.75rem", color: "#5a4a2a", fontSize: "0.8rem" }}>
                        {produtoNome}{maisItens && <span style={{ color: "#b8891a", fontWeight: 700 }}>{maisItens}</span>}
                      </td>}
                      <td style={{ padding: isMobile ? "0.625rem 0.75rem" : "0.875rem 0.75rem", color: "#1a1510", fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(order.total)}</td>
                      <td style={{ padding: isMobile ? "0.625rem 0.75rem" : "0.875rem 0.75rem" }}>
                        <span style={{ backgroundColor: sc.bg, color: sc.color, fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.625rem", borderRadius: "999px", whiteSpace: "nowrap" }}>
                          {STATUS_LABEL[order.status] || order.status}
                        </span>
                      </td>
                      {!isMobile && <td style={{ padding: "0.875rem 0.75rem" }}>
                        <span style={{ backgroundColor: pc.bg, color: pc.color, fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.625rem", borderRadius: "999px", whiteSpace: "nowrap" }}>
                          {PAY_LABEL[order.paymentStatus] || order.paymentStatus}
                        </span>
                        {order.paymentStatus === "partial" && (
                          <div style={{ color: "#9a8060", fontSize: "0.65rem", marginTop: "0.2rem" }}>Pago: {fmt(order.amountPaid)}</div>
                        )}
                      </td>}
                      {!isMobile && <td style={{ padding: "0.875rem 0.75rem" }}>
                        <span style={{ backgroundColor: mc.bg, color: mc.color, fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.625rem", borderRadius: "999px", whiteSpace: "nowrap" }}>
                          {METHOD_LABEL[order.paymentMethod] || order.paymentMethod}
                        </span>
                      </td>}
                      {!isMobile && <td style={{ padding: "0.875rem 0.75rem", color: "#9a8060", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                      </td>}
                      {!isMobile && <td style={{ padding: "0.875rem 0.75rem", ...stickyRight(isExpanded ? "#FDFAF4" : "#fff") }} onClick={e => e.stopPropagation()}>
                        <select
                          value={order.status}
                          disabled={updatingId === order.id}
                          onChange={e => updateStatus(order.id, e.target.value)}
                          style={{ ...inp, fontSize: "0.72rem", padding: "0.3rem 0.5rem", cursor: "pointer", maxWidth: 130 }}>
                          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </td>}
                    </tr>
                    {isExpanded && (
                      <tr key={order.id + "-detail"} style={{ backgroundColor: "#FDFAF4", borderBottom: "1px solid rgba(140,100,20,0.06)" }}>
                        <td colSpan={isMobile ? 5 : 10} style={{ padding: isMobile ? "0.75rem 0.75rem" : "0 1rem 1rem 1rem" }}>
                          <div>
                            {/* Ações principais */}
                            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.875rem" }}>
                              {order.user.phone && (
                                <a
                                  href={(() => {
                                    const itens = order.items.map(i =>
                                      `- ${itemName({ product: i.product, size: i.size, componentName: (i as any).componentName })} x${i.quantity}  ${fmt(i.price * i.quantity)}`
                                    ).join("\n");
                                    const metodo: Record<string,string> = { pix:"Pix", cartao:"Cartão", dinheiro:"Dinheiro", caderno:"Caderno", link:"Link de Pagamento" };
                                    const msg = [
                                      `Olá ${order.user.name?.split(" ")[0]}!`,
                                      ``,
                                      `Segue o resumo do seu pedido na *Access Fit*:`,
                                      ``,
                                      itens,
                                      ``,
                                      `*Total: ${fmt(order.total)}*`,
                                      `Pagamento: ${metodo[order.paymentMethod] || order.paymentMethod}`,
                                      ``,
                                      `Responda *SIM* para confirmar ou nos chame se tiver duvidas!`,
                                    ].join("\n");
                                    const phone = order.user.phone!.replace(/\D/g, "");
                                    const ddi = phone.startsWith("55") ? phone : `55${phone}`;
                                    return `https://wa.me/${ddi}?text=${encodeURIComponent(msg)}`;
                                  })()}
                                  target="_blank" rel="noopener noreferrer"
                                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", backgroundColor: "#25D366", color: "#fff", fontWeight: 700, fontSize: "0.8rem", padding: "0.55rem 1rem", borderRadius: "0.625rem", textDecoration: "none", flex: "1 1 auto", minWidth: 170 }}>
                                  📲 Enviar confirmação
                                </a>
                              )}
                              <a href={`/admin/pedidos/${order.id}/nota`} target="_blank" rel="noopener noreferrer"
                                style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.55rem 1rem", backgroundColor: "#fff8e1", color: "#b8891a", border: "1px solid rgba(184,137,26,0.3)", borderRadius: "0.625rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", textDecoration: "none", flex: "1 1 auto", minWidth: 140 }}>
                                🧾 Ver Nota
                              </a>
                              {order.status !== "cancelled" && (
                                <button onClick={() => { if (confirm("Cancelar este pedido?")) updateStatus(order.id, "cancelled"); }}
                                  style={{ padding: "0.55rem 1rem", backgroundColor: "#fee8e8", color: "#c04040", border: "1px solid rgba(192,64,64,0.2)", borderRadius: "0.625rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", flex: "1 1 auto", minWidth: 140 }}>
                                  🚫 Cancelar Pedido
                                </button>
                              )}
                              <button onClick={() => { setTrocaOrderId(order.id); setTrocaReason(""); setTrocaItemIds([]); }}
                                style={{ padding: "0.55rem 1rem", backgroundColor: "#fff3e0", color: "#b8891a", border: "1px solid rgba(184,137,26,0.3)", borderRadius: "0.625rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", flex: "1 1 auto", minWidth: 140 }}>
                                🔄 Solicitar Troca
                              </button>
                            </div>

                            {/* Banner Home Try-On */}
                            {order.status === "try-on" && (
                              <div style={{ backgroundColor: "#fce8ff", border: "1px solid rgba(138,26,184,0.25)", borderRadius: "0.75rem", padding: "1rem", marginBottom: "0.875rem" }}>
                                <p style={{ fontWeight: 800, color: "#5a0a7a", fontSize: "0.85rem", marginBottom: "0.625rem" }}>👗 Home Try-On — aguardando decisão</p>
                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                  <button
                                    onClick={async () => {
                                      await fetch(`/api/admin/pedidos/${order.id}`, {
                                        method: "PUT", headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ status: "delivered" }),
                                      });
                                      setLocalOrders(prev => prev.map(o => o.id === order.id ? withStatusChange(o, "delivered") : o));
                                      startEditPayment(order);
                                    }}
                                    style={{ backgroundColor: "#1a8a2a", color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.45rem 0.875rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                                    ✅ Confirmou a compra
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm("Confirmar devolução? O estoque será restaurado.")) return;
                                      await fetch(`/api/admin/pedidos/${order.id}`, {
                                        method: "PUT", headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ status: "cancelled" }),
                                      });
                                      setLocalOrders(prev => prev.map(o => o.id === order.id ? withStatusChange(o, "cancelled") : o));
                                    }}
                                    style={{ backgroundColor: "#fee8e8", color: "#c04040", border: "1px solid rgba(192,64,64,0.25)", borderRadius: "0.5rem", padding: "0.45rem 0.875rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                                    ↩️ Devolveu
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Abas */}
                            <div style={{ display: "flex", gap: "0.25rem", borderBottom: "1px solid rgba(140,100,20,0.15)", marginBottom: "1rem" }}>
                              {([
                                { key: "itens", label: "Itens" },
                                { key: "pagamento", label: "Pagamento" },
                                { key: "cliente", label: "Cliente" },
                                { key: "jornada", label: "Jornada" },
                              ] as const).map(t => (
                                <button key={t.key} onClick={() => setActiveTab(t.key)}
                                  style={{
                                    padding: "0.5rem 1rem", border: "none", background: "none", cursor: "pointer",
                                    fontWeight: 700, fontSize: "0.8rem",
                                    color: activeTab === t.key ? "#b8891a" : "#9a8060",
                                    borderBottom: activeTab === t.key ? "2px solid #b8891a" : "2px solid transparent",
                                    marginBottom: "-1px",
                                  }}>
                                  {t.label}
                                </button>
                              ))}
                            </div>

                          {activeTab === "itens" && (
                            <div style={{ backgroundColor: "#fff", borderRadius: "0.75rem", padding: "1rem", border: "1px solid rgba(140,100,20,0.08)" }}>
                              {order.items.map(item => {
                                const custo = item.costPrice ?? item.product.costPrice ?? null;
                                const isEditingCost = editingItemCost === item.id;
                                const isEditingPrice = editingItemPrice === item.id;
                                const canEditPrice = order.paymentStatus !== "paid";
                                return (
                                  <div key={item.id} style={{ padding: "0.4rem 0", borderBottom: "1px solid rgba(140,100,20,0.06)", fontSize: "0.8rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                                      <span style={{ color: "#3a2a10", flex: 1 }}>
                                        {itemName({ product: item.product, size: item.size, componentName: (item as any).componentName })}
                                      </span>
                                      {!canEditPrice ? (
                                        <span style={{ color: "#1a1510", fontWeight: 700 }}>{fmt(item.price)}</span>
                                      ) : isEditingPrice ? (
                                        <>
                                          <input type="number" step="0.01" autoFocus value={itemPriceValue}
                                            onChange={e => setItemPriceValue(e.target.value)}
                                            style={{ ...inp, fontSize: "0.75rem", padding: "0.2rem 0.4rem", width: 80 }} />
                                          <button onClick={() => saveItemPrice(order.id, item.id)}
                                            style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.2rem 0.5rem", backgroundColor: "#b8891a", color: "#fff", border: "none", borderRadius: "0.4rem", cursor: "pointer" }}>
                                            Salvar
                                          </button>
                                          <button onClick={() => setEditingItemPrice(null)}
                                            style={{ fontSize: "0.65rem", color: "#9a8060", background: "none", border: "none", cursor: "pointer" }}>
                                            ✕
                                          </button>
                                        </>
                                      ) : (
                                        <button onClick={() => { setEditingItemPrice(item.id); setItemPriceValue(String(item.price)); }}
                                          title="Editar preço"
                                          style={{ color: "#1a1510", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "0.8rem" }}>
                                          {fmt(item.price)} ✎
                                        </button>
                                      )}
                                      <button onClick={() => removeItem(order.id, item.id)} disabled={removingItemId === item.id}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: "#c04040", fontSize: "0.9rem", padding: "0 2px", lineHeight: 1, opacity: removingItemId === item.id ? 0.4 : 1 }}
                                        title="Remover item">✕</button>
                                    </div>
                                    {!hideProfit && (
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.2rem" }}>
                                        {isEditingCost ? (
                                          <>
                                            <input type="number" step="0.01" placeholder="Custo R$" value={itemCostValue}
                                              onChange={e => setItemCostValue(e.target.value)}
                                              style={{ ...inp, fontSize: "0.7rem", padding: "0.2rem 0.5rem", width: 90 }} />
                                            <button onClick={() => saveItemCost(order.id, item.id)}
                                              style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.2rem 0.5rem", backgroundColor: "#b8891a", color: "#fff", border: "none", borderRadius: "0.4rem", cursor: "pointer" }}>
                                              Salvar
                                            </button>
                                            <button onClick={() => setEditingItemCost(null)}
                                              style={{ fontSize: "0.65rem", color: "#9a8060", background: "none", border: "none", cursor: "pointer" }}>
                                              ✕
                                            </button>
                                          </>
                                        ) : (
                                          <button onClick={() => { setEditingItemCost(item.id); setItemCostValue(custo?.toString() ?? ""); }}
                                            style={{ fontSize: "0.65rem", color: custo ? "#1a8a2a" : "#c04040", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                                            {custo ? `custo: ${fmt(custo)}` : "+ Inserir custo"}
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {/* Desconto do pedido */}
                              {(() => {
                                const subtotalItens = order.items.reduce((sm, i) => sm + i.price * i.quantity, 0);
                                const editando = editandoDesconto === order.id;
                                return (
                                  <>
                                    {(order.discount > 0 || editando) && (
                                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", fontSize: "0.8rem" }}>
                                        <span style={{ color: "#5a4a2a" }}>Subtotal</span>
                                        <span style={{ color: "#1a1510", fontWeight: 700 }}>{fmt(subtotalItens)}</span>
                                      </div>
                                    )}
                                    {order.discount > 0 && !editando && (
                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                                        <span style={{ color: "#1a8a2a" }}>Desconto</span>
                                        <span style={{ color: "#1a8a2a", fontWeight: 700 }}>− {fmt(order.discount)}</span>
                                      </div>
                                    )}
                                    {editando && (
                                      <div style={{ marginTop: "0.4rem", padding: "0.5rem 0.625rem", backgroundColor: "#FAF6EE", borderRadius: "0.5rem", display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                                        <input autoFocus value={descontoValor} onChange={e => setDescontoValor(e.target.value)}
                                          placeholder="0,00" inputMode="decimal"
                                          style={{ ...inp, fontSize: "0.75rem", padding: "0.25rem 0.5rem", width: 80 }} />
                                        <div style={{ display: "flex", gap: "2px" }}>
                                          {(["reais", "percent"] as const).map(t => (
                                            <button key={t} onClick={() => setDescontoTipo(t)}
                                              style={{ fontSize: "0.7rem", fontWeight: 800, padding: "0.25rem 0.5rem", border: "none", borderRadius: "0.35rem", cursor: "pointer", backgroundColor: descontoTipo === t ? "#b8891a" : "#fff", color: descontoTipo === t ? "#fff" : "#9a8060" }}>
                                              {t === "reais" ? "R$" : "%"}
                                            </button>
                                          ))}
                                        </div>
                                        <button onClick={() => salvarDesconto(order.id)} disabled={salvandoDesconto}
                                          style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.6rem", backgroundColor: "#b8891a", color: "#fff", border: "none", borderRadius: "0.4rem", cursor: "pointer" }}>
                                          {salvandoDesconto ? "..." : "Aplicar"}
                                        </button>
                                        <button onClick={() => setEditandoDesconto(null)}
                                          style={{ fontSize: "0.7rem", color: "#9a8060", background: "none", border: "none", cursor: "pointer" }}>✕</button>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}

                              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", fontWeight: 900, fontSize: "0.875rem" }}>
                                <span style={{ color: "#1a1510" }}>Total</span>
                                <span style={{ color: "#b8891a" }}>{fmt(order.total)}</span>
                              </div>
                              {order.paymentStatus !== "paid" && editandoDesconto !== order.id && (
                                <button onClick={() => { setEditandoDesconto(order.id); setDescontoValor(order.discount ? String(order.discount) : ""); setDescontoTipo("reais"); }}
                                  style={{ marginTop: "0.35rem", fontSize: "0.7rem", color: "#b8891a", background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: 0 }}>
                                  {order.discount > 0 ? "✎ Alterar desconto" : "+ Dar desconto"}
                                </button>
                              )}
                              {!hideProfit && order.paymentStatus !== "paid" && order.installments.length === 0 && (
                                <div style={{ marginTop: "0.5rem", padding: "0.5rem 0.75rem", backgroundColor: PAY_COLOR[order.paymentStatus]?.bg || "#fee8e8", borderRadius: "0.5rem" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                                    <span style={{ color: "#5a4a2a" }}>Pago</span>
                                    <span style={{ color: "#1a1510", fontWeight: 700 }}>{fmt(order.amountPaid)}</span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginTop: "0.2rem" }}>
                                    <span style={{ color: "#5a4a2a" }}>Em aberto</span>
                                    <span style={{ color: PAY_COLOR[order.paymentStatus]?.color || "#c04040", fontWeight: 700 }}>{fmt(order.total - order.amountPaid)}</span>
                                  </div>
                                </div>
                              )}
                              {order.installments.length > 0 && (
                                <div style={{ marginTop: "0.75rem" }}>
                                  <p style={{ fontSize: "0.75rem", color: "#9a8060", fontWeight: 700, marginBottom: "0.4rem" }}>PARCELAS</p>
                                  {order.installments.map(inst => {
                                    const isPaid = inst.status === "paid";
                                    const isOverdue = !isPaid && new Date(inst.dueDate) < new Date();
                                    const isEditingThis = editingInstallmentId === inst.id;
                                    return (
                                      <div key={inst.id} style={{ borderRadius: "0.5rem", marginBottom: "0.3rem", backgroundColor: isPaid ? "#e8f8e8" : isOverdue ? "#fee8e8" : "#fff8e1", border: `1px solid ${isPaid ? "rgba(26,138,42,0.15)" : isOverdue ? "rgba(192,64,64,0.15)" : "rgba(184,137,26,0.15)"}` }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.625rem" }}>
                                          <div>
                                            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isPaid ? "#1a8a2a" : isOverdue ? "#c04040" : "#b8891a" }}>
                                              {inst.number}ª parcela
                                            </span>
                                            <span style={{ fontSize: "0.7rem", color: "#9a8060", marginLeft: "0.5rem" }}>
                                              {new Date(inst.dueDate).toLocaleDateString("pt-BR")}
                                              {isOverdue && " ⚠️"}
                                            </span>
                                          </div>
                                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1a1510" }}>{fmt(inst.amount)}</span>
                                            {!isPaid && (
                                              <button onClick={() => { setEditingInstallmentId(isEditingThis ? null : inst.id); setEditInstallmentDate(new Date(inst.dueDate).toISOString().slice(0, 10)); setEditInstallmentAmount(String(inst.amount)); }}
                                                style={{ fontSize: "0.65rem", padding: "0.2rem 0.4rem", borderRadius: "999px", border: "1px solid rgba(140,100,20,0.2)", cursor: "pointer", backgroundColor: "transparent", color: "#9a8060" }}>
                                                ✏️
                                              </button>
                                            )}
                                            <button
                                              disabled={togglingInstallment === inst.id}
                                              onClick={() => toggleInstallment(order.id, inst.id, inst.status)}
                                              style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: "999px", border: "none", cursor: "pointer", backgroundColor: isPaid ? "#1a8a2a" : "#b8891a", color: "#fff" }}>
                                              {isPaid ? "✓ Pago" : "Marcar pago"}
                                            </button>
                                          </div>
                                        </div>
                                        {isEditingThis && (
                                          <div style={{ padding: "0.5rem 0.625rem", borderTop: "1px solid rgba(140,100,20,0.1)", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                                            <div style={{ flex: 1, minWidth: 120 }}>
                                              <div style={{ fontSize: "0.65rem", color: "#9a8060", marginBottom: "0.2rem" }}>Data de vencimento</div>
                                              <input type="date" value={editInstallmentDate} onChange={e => setEditInstallmentDate(e.target.value)}
                                                style={{ ...inp, padding: "0.3rem 0.5rem", fontSize: "0.75rem" }} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 90 }}>
                                              <div style={{ fontSize: "0.65rem", color: "#9a8060", marginBottom: "0.2rem" }}>Valor (R$)</div>
                                              <input type="number" step="0.01" value={editInstallmentAmount} onChange={e => setEditInstallmentAmount(e.target.value)}
                                                style={{ ...inp, padding: "0.3rem 0.5rem", fontSize: "0.75rem" }} />
                                            </div>
                                            <div style={{ display: "flex", gap: "0.3rem", paddingTop: "0.9rem" }}>
                                              <button onClick={() => saveInstallmentEdit(order.id, inst.id)}
                                                style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.3rem 0.625rem", borderRadius: "0.4rem", border: "none", cursor: "pointer", backgroundColor: "#b8891a", color: "#fff" }}>
                                                Salvar
                                              </button>
                                              <button onClick={() => setEditingInstallmentId(null)}
                                                style={{ fontSize: "0.7rem", padding: "0.3rem 0.5rem", borderRadius: "0.4rem", border: "1px solid rgba(140,100,20,0.2)", cursor: "pointer", backgroundColor: "transparent", color: "#9a8060" }}>
                                                ✕
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {activeTab === "pagamento" && (
                              <div style={{ backgroundColor: "#fff", borderRadius: "0.75rem", padding: "1rem", border: "1px solid rgba(140,100,20,0.08)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                                  <p style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.8rem" }}>Pagamento</p>
                                  {editingPayment !== order.id ? (
                                    <button onClick={() => startEditPayment(order)}
                                      style={{ fontSize: "0.7rem", color: "#b8891a", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                                      ✏️ Editar
                                    </button>
                                  ) : (
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                      <button onClick={() => savePayment(order.id)}
                                        style={{ fontSize: "0.7rem", color: "#fff", background: "#b8891a", border: "none", borderRadius: "0.4rem", padding: "0.2rem 0.6rem", cursor: "pointer", fontWeight: 700 }}>
                                        Salvar
                                      </button>
                                      <button onClick={() => setEditingPayment(null)}
                                        style={{ fontSize: "0.7rem", color: "#9a8060", background: "none", border: "none", cursor: "pointer" }}>
                                        Cancelar
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {editingPayment === order.id ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <div>
                                      <label style={{ fontSize: "0.72rem", color: "#9a8060", display: "block", marginBottom: "0.2rem" }}>Forma de Pagamento</label>
                                      <select value={editPaymentMethod} onChange={e => setEditPaymentMethod(e.target.value)}
                                        style={{ ...inp, width: "100%", boxSizing: "border-box" as const }}>
                                        {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                      </select>
                                    </div>
                                    {editPaymentMethod === "link" && (() => {
                                      const recebido = parseFloat(editAmountPaid) || 0;
                                      const taxa = order.total - recebido;
                                      const temTaxa = recebido > 0 && taxa > 0.001;
                                      return (
                                        <div>
                                          <label style={{ fontSize: "0.72rem", color: "#9a8060", display: "block", marginBottom: "0.2rem" }}>💰 Valor recebido (líquido, já com a taxa descontada)</label>
                                          <input type="number" step="0.01" value={editAmountPaid} onChange={e => setEditAmountPaid(e.target.value)}
                                            placeholder={`Ex: ${order.total}`}
                                            style={{ ...inp, width: "100%", boxSizing: "border-box" as const }} />
                                          {temTaxa && (
                                            <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginTop: "0.5rem", padding: "0.5rem 0.625rem", backgroundColor: "#fff8e1", borderRadius: "0.5rem", cursor: "pointer" }}>
                                              <input type="checkbox" checked={taxaAbsorvida} onChange={e => setTaxaAbsorvida(e.target.checked)}
                                                style={{ marginTop: 2, accentColor: "#b8891a", cursor: "pointer" }} />
                                              <span style={{ fontSize: "0.7rem", color: "#7a6030", lineHeight: 1.4 }}>
                                                Os {fmt(taxa)} que faltam são taxa da operadora, não dívida da cliente.
                                                Marcando, o pedido fica <strong>quitado</strong> e a taxa vira despesa.
                                              </span>
                                            </label>
                                          )}
                                        </div>
                                      );
                                    })()}
                                    <div>
                                      <label style={{ fontSize: "0.72rem", color: "#9a8060", display: "block", marginBottom: "0.2rem" }}>Status de Pagamento</label>
                                      <select value={editPaymentStatus} onChange={e => setEditPaymentStatus(e.target.value)}
                                        style={{ ...inp, width: "100%", boxSizing: "border-box" as const }}>
                                        {Object.entries(PAY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                      </select>
                                    </div>
                                    {editPaymentStatus !== "paid" && (
                                      <>
                                        <div>
                                          <label style={{ fontSize: "0.72rem", color: "#9a8060", display: "block", marginBottom: "0.2rem" }}>Valor já pago (R$)</label>
                                          <input type="number" step="0.01" value={editAmountPaid} onChange={e => setEditAmountPaid(e.target.value)}
                                            style={{ ...inp, width: "100%", boxSizing: "border-box" as const }} />
                                        </div>
                                        <div>
                                          <label style={{ fontSize: "0.72rem", color: "#9a8060", display: "block", marginBottom: "0.2rem" }}>Vencimento</label>
                                          <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)}
                                            style={{ ...inp, width: "100%", boxSizing: "border-box" as const }} />
                                        </div>
                                        <div>
                                          <label style={{ fontSize: "0.72rem", color: "#9a8060", display: "block", marginBottom: "0.2rem" }}>Parcelas</label>
                                          <select value={editInstallments} onChange={e => setEditInstallments(Number(e.target.value))}
                                            style={{ ...inp, width: "100%", boxSizing: "border-box" as const }}>
                                            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}x</option>)}
                                          </select>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                                    <span style={{ backgroundColor: mc.bg, color: mc.color, fontSize: "0.75rem", fontWeight: 700, padding: "0.3rem 0.75rem", borderRadius: "999px" }}>
                                      {METHOD_LABEL[order.paymentMethod] || order.paymentMethod}
                                    </span>
                                    <span style={{ backgroundColor: pc.bg, color: pc.color, fontSize: "0.75rem", fontWeight: 700, padding: "0.3rem 0.75rem", borderRadius: "999px" }}>
                                      {PAY_LABEL[order.paymentStatus] || order.paymentStatus}
                                    </span>
                                    {order.installmentCount > 1 && (
                                      <span style={{ backgroundColor: "#f0e8ff", color: "#6a30b8", fontSize: "0.75rem", fontWeight: 700, padding: "0.3rem 0.75rem", borderRadius: "999px" }}>
                                        {order.installmentCount}x
                                      </span>
                                    )}
                                    {order.dueDate && (
                                      <span style={{ backgroundColor: "#fff8e1", color: "#b8891a", fontSize: "0.75rem", fontWeight: 700, padding: "0.3rem 0.75rem", borderRadius: "999px" }}>
                                        📅 Vence {new Date(order.dueDate).toLocaleDateString("pt-BR")}
                                      </span>
                                    )}
                                    {order.paymentMethod === "link" && (
                                      <div style={{ width: "100%", marginTop: "0.4rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                                          <span style={{ color: "#9a8060" }}>Total do link</span>
                                          <span style={{ color: "#1a1510", fontWeight: 700 }}>{fmt(order.total)}</span>
                                        </div>
                                        {order.amountPaid > 0 && order.amountPaid < order.total && (
                                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                                            <span style={{ color: "#c04040" }}>Taxa da operadora</span>
                                            <span style={{ color: "#c04040", fontWeight: 700 }}>-{fmt(order.total - order.amountPaid)}</span>
                                          </div>
                                        )}
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                                          <span style={{ color: "#1a8a2a", fontWeight: 700 }}>Valor recebido (líquido)</span>
                                          <span style={{ color: "#1a8a2a", fontWeight: 900 }}>{fmt(order.amountPaid)}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                          )}

                          {activeTab === "cliente" && (
                              <div style={{ backgroundColor: "#fff", borderRadius: "0.75rem", padding: "1rem", border: "1px solid rgba(140,100,20,0.08)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                                  <p style={{ fontWeight: 700, color: "#1a1510", fontSize: "0.8rem" }}>Cliente</p>
                                  {reassigningId !== order.id ? (
                                    <button onClick={() => { setReassigningId(order.id); setReassignSearch(""); }}
                                      style={{ fontSize: "0.7rem", color: "#b8891a", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>
                                      🔄 Trocar cliente
                                    </button>
                                  ) : (
                                    <button onClick={() => setReassigningId(null)}
                                      style={{ fontSize: "0.7rem", color: "#9a8060", background: "none", border: "none", cursor: "pointer" }}>
                                      Cancelar
                                    </button>
                                  )}
                                </div>
                                {reassigningId === order.id ? (
                                  <div>
                                    <p style={{ fontSize: "0.72rem", color: "#9a8060", marginBottom: "0.5rem" }}>
                                      Atual: <strong>{order.user.name}</strong>. Busque o cliente correto:
                                    </p>
                                    <input
                                      style={{ ...inp, width: "100%", boxSizing: "border-box" as const, marginBottom: "0.5rem" }}
                                      placeholder="Nome ou e-mail do cliente..."
                                      value={reassignSearch}
                                      onChange={e => setReassignSearch(e.target.value)}
                                      autoFocus
                                    />
                                    {reassignSearch.length >= 2 && (
                                      <div style={{ border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.5rem", overflow: "hidden" }}>
                                        {localCustomers
                                          .filter(c => c.id !== order.user.id && (
                                            (c.name || "").toLowerCase().includes(reassignSearch.toLowerCase()) ||
                                            c.email.toLowerCase().includes(reassignSearch.toLowerCase())
                                          ))
                                          .slice(0, 6)
                                          .map(c => (
                                            <button key={c.id} disabled={reassignSaving}
                                              onClick={() => reassignCustomer(order.id, c)}
                                              style={{ display: "block", width: "100%", textAlign: "left", padding: "0.5rem 0.75rem", background: "#fff", border: "none", borderBottom: "1px solid rgba(140,100,20,0.08)", cursor: "pointer", fontSize: "0.8rem" }}
                                              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#FAF6EE")}
                                              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#fff")}>
                                              <span style={{ fontWeight: 700, color: "#1a1510" }}>{c.name || "—"}</span>
                                              <span style={{ color: "#9a8060", marginLeft: "0.5rem", fontSize: "0.72rem" }}>{c.email}</span>
                                            </button>
                                          ))}
                                        {localCustomers.filter(c => c.id !== order.user.id && (
                                          (c.name || "").toLowerCase().includes(reassignSearch.toLowerCase()) ||
                                          c.email.toLowerCase().includes(reassignSearch.toLowerCase())
                                        )).length === 0 && (
                                          <p style={{ padding: "0.5rem 0.75rem", color: "#9a8060", fontSize: "0.8rem" }}>Nenhum cliente encontrado.</p>
                                        )}
                                      </div>
                                    )}

                                    {/* Cadastro de cliente novo sem sair do pedido */}
                                    {!newCustomerOpen ? (
                                      <button onClick={() => { setNewCustomerOpen(true); setNcName(reassignSearch); setNcError(""); }}
                                        style={{ marginTop: "0.6rem", fontSize: "0.75rem", fontWeight: 700, color: "#b8891a", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                                        + Cadastrar novo cliente
                                      </button>
                                    ) : (
                                      <div style={{ marginTop: "0.6rem", padding: "0.75rem", backgroundColor: "#FAF6EE", borderRadius: "0.625rem", border: "1px solid rgba(140,100,20,0.15)" }}>
                                        <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1a1510", marginBottom: "0.5rem" }}>Novo cliente</p>
                                        <input style={{ ...inp, width: "100%", boxSizing: "border-box" as const, backgroundColor: "#fff", marginBottom: "0.4rem" }}
                                          placeholder="Nome *" value={ncName} onChange={e => setNcName(e.target.value)} autoFocus />
                                        <input style={{ ...inp, width: "100%", boxSizing: "border-box" as const, backgroundColor: "#fff", marginBottom: "0.4rem" }}
                                          placeholder="Telefone (opcional)" value={ncPhone} onChange={e => setNcPhone(e.target.value)} />
                                        <input style={{ ...inp, width: "100%", boxSizing: "border-box" as const, backgroundColor: "#fff", marginBottom: "0.4rem" }}
                                          placeholder="E-mail (opcional)" value={ncEmail} onChange={e => setNcEmail(e.target.value)} />
                                        {ncError && <p style={{ fontSize: "0.72rem", color: "#c04040", marginBottom: "0.4rem" }}>{ncError}</p>}
                                        <div style={{ display: "flex", gap: "0.4rem" }}>
                                          <button disabled={reassignSaving} onClick={() => createAndAssignCustomer(order.id)}
                                            style={{ flex: 1, padding: "0.45rem", backgroundColor: "#b8891a", color: "#fff", border: "none", borderRadius: "0.5rem", fontWeight: 800, fontSize: "0.75rem", cursor: reassignSaving ? "wait" : "pointer" }}>
                                            {reassignSaving ? "Salvando..." : "Cadastrar e vincular"}
                                          </button>
                                          <button onClick={() => { setNewCustomerOpen(false); setNcError(""); }}
                                            style={{ padding: "0.45rem 0.75rem", backgroundColor: "#fff", color: "#9a8060", border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.5rem", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>
                                            Cancelar
                                          </button>
                                        </div>
                                        <p style={{ fontSize: "0.68rem", color: "#9a8060", marginTop: "0.4rem" }}>
                                          Sem e-mail, geramos um interno automaticamente.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <p style={{ color: "#3a2a10", fontSize: "0.8rem", marginBottom: "0.3rem" }}>👤 {order.user.name}</p>
                                    <p style={{ color: "#3a2a10", fontSize: "0.8rem", marginBottom: "0.3rem" }}>📧 {order.user.email}</p>
                                    {order.user.phone && <p style={{ color: "#3a2a10", fontSize: "0.8rem", marginBottom: "0.3rem" }}>📞 {order.user.phone}</p>}
                                  </>
                                )}
                                {order.notes && (
                                  <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", backgroundColor: "#FAF6EE", borderRadius: "0.5rem", fontSize: "0.75rem", color: "#7a6030" }}>
                                    📝 {order.notes}
                                  </div>
                                )}
                                <button onClick={() => generateShareLink(order.id)}
                                  style={{ marginTop: "0.875rem", width: "100%", padding: "0.5rem", backgroundColor: copyingLinkId === order.id ? "#e8f8e8" : "#e8f4fd", color: copyingLinkId === order.id ? "#1a8a2a" : "#1a6a9a", border: `1px solid ${copyingLinkId === order.id ? "rgba(26,138,42,0.2)" : "rgba(26,106,154,0.2)"}`, borderRadius: "0.625rem", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                                  {copyingLinkId === order.id ? "✓ Link copiado!" : "📋 Gerar link para cliente"}
                                </button>
                              </div>
                          )}

                          {activeTab === "jornada" && (
                              <div style={{ backgroundColor: "#fff", borderRadius: "0.75rem", padding: "1.25rem 1rem", border: "1px solid rgba(140,100,20,0.08)" }}>
                                <OrderTimeline history={order.statusHistory} fallbackCreatedAt={order.createdAt} />

                                {/* Mudar o status aqui mesmo, sem voltar para a linha da tabela */}
                                <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid rgba(140,100,20,0.1)" }}>
                                  <p style={{ fontSize: "0.72rem", fontWeight: 800, color: "#9a8060", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.625rem" }}>
                                    Marcar como
                                  </p>
                                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                    {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => {
                                      const atual = order.status === valor;
                                      const cor = STATUS_COLOR[valor] || { bg: "#f0f0f0", color: "#666" };
                                      const salvando = updatingId === order.id;
                                      return (
                                        <button key={valor}
                                          disabled={atual || salvando}
                                          onClick={() => {
                                            if (valor === "cancelled" && !confirm("Cancelar este pedido? O estoque das peças volta para o catálogo.")) return;
                                            updateStatus(order.id, valor);
                                          }}
                                          title={atual ? "É o status atual" : `Mudar para ${rotulo}`}
                                          style={{
                                            display: "inline-flex", alignItems: "center", gap: "0.35rem",
                                            fontSize: "0.78rem", fontWeight: 700, padding: "0.45rem 0.875rem",
                                            borderRadius: "999px", cursor: atual || salvando ? "default" : "pointer",
                                            backgroundColor: atual ? cor.bg : "#fff",
                                            color: atual ? cor.color : "#5a4a2a",
                                            border: `1.5px solid ${atual ? cor.color : "rgba(140,100,20,0.2)"}`,
                                            opacity: salvando && !atual ? 0.5 : 1,
                                          }}>
                                          <span>{STATUS_ICON[valor] || "•"}</span>
                                          {rotulo}
                                          {atual && <span style={{ fontSize: "0.68rem", opacity: 0.75 }}>· atual</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <p style={{ fontSize: "0.7rem", color: "#9a8060", marginTop: "0.6rem", lineHeight: 1.5 }}>
                                    A cliente recebe um aviso no celular quando o pedido é confirmado, enviado, entregue ou cancelado.
                                  </p>
                                </div>
                              </div>
                          )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Solicitar Troca */}
      {trocaOrderId && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ backgroundColor: "#FAF6EE", borderRadius: "1.25rem", padding: "2rem", width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ color: "#1a1510", fontWeight: 900, fontSize: "1.1rem", margin: 0 }}>🔄 Solicitar Troca</h2>
              <button onClick={() => setTrocaOrderId(null)} style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#9a8060" }}>
                ✕
              </button>
            </div>
            <p style={{ color: "#5a4a2a", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
              Pedido #{trocaOrderId.slice(-8).toUpperCase()} vai para a aba <strong>Devoluções</strong> com status &quot;Solicitado&quot;.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {(() => {
                const trocaOrder = localOrders.find(o => o.id === trocaOrderId);
                if (!trocaOrder) return null;
                const trocaAmount = trocaOrder.items.filter(i => trocaItemIds.includes(i.id)).reduce((s, i) => s + i.price * i.quantity, 0);
                return (
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#5a4a2a", display: "block", marginBottom: "0.4rem" }}>
                      Quais itens estão na troca? *
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.5rem", padding: "0.6rem" }}>
                      {trocaOrder.items.map(item => (
                        <label key={item.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#3a2a10", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={trocaItemIds.includes(item.id)}
                            onChange={e => setTrocaItemIds(prev => e.target.checked ? [...prev, item.id] : prev.filter(id => id !== item.id))}
                          />
                          <span style={{ flex: 1 }}>{itemName(item)}</span>
                          <span style={{ fontWeight: 700 }}>{fmt(item.price * item.quantity)}</span>
                        </label>
                      ))}
                    </div>
                    {trocaItemIds.length > 0 && (
                      <p style={{ fontSize: "0.78rem", color: "#7a6030", marginTop: "0.4rem" }}>
                        Valor da troca: <strong>{fmt(trocaAmount)}</strong>
                      </p>
                    )}
                  </div>
                );
              })()}
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#5a4a2a", display: "block", marginBottom: "0.4rem" }}>
                  Motivo da troca *
                </label>
                <textarea
                  value={trocaReason}
                  onChange={e => setTrocaReason(e.target.value)}
                  placeholder="Ex: Tamanho errado, cliente pediu outra cor..."
                  rows={3}
                  autoFocus
                  style={{ width: "100%", padding: "0.6rem", border: "1px solid rgba(140,100,20,0.2)", borderRadius: "0.5rem", fontFamily: "inherit", resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => setTrocaOrderId(null)}
                  style={{ flex: 1, backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.2)", color: "#5a4a2a", fontWeight: 700, padding: "0.75rem", borderRadius: "0.75rem", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSolicitarTroca}
                  disabled={trocaSaving || !trocaReason.trim() || trocaItemIds.length === 0}
                  style={{ flex: 1, backgroundColor: "#b8891a", color: "#fff", fontWeight: 700, padding: "0.75rem", borderRadius: "0.75rem", border: "none", cursor: trocaSaving || !trocaReason.trim() || trocaItemIds.length === 0 ? "not-allowed" : "pointer", opacity: trocaSaving || !trocaReason.trim() || trocaItemIds.length === 0 ? 0.7 : 1 }}
                >
                  {trocaSaving ? "Enviando..." : "Confirmar Troca"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// force
