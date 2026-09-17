import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatCurrency, parseJson } from "@/lib/utils";
import Link from "next/link";
import { perfilDaCliente } from "@/lib/crm/perfil";
import { extratoDaCliente, MOTIVOS_DE_ENTRADA } from "@/lib/credito";
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from "@/lib/orderStatus";
import Historico from "./Historico";
import Etiquetas from "./Etiquetas";
import Credito from "./Credito";

export const dynamic = "force-dynamic";

const PAY_LABEL: Record<string, string> = {
  pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro", link: "Link", caderno: "Caderno",
};
const PAY_STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  paid: { bg: "#e8f8e8", color: "#1a8a2a" },
  partial: { bg: "#fff8e1", color: "#b8891a" },
  pending: { bg: "#fee8e8", color: "#c04040" },
};

const CARTAO: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid rgba(140,100,20,0.1)",
  borderRadius: "1rem",
};

export default async function ClientePerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "admin") redirect("/");

  const { id } = await params;

  const cliente = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: { select: { quantity: true, size: true, color: true, componentName: true, product: { select: { name: true } } } } },
      },
      crmTags: { include: { tag: true } },
      addresses: { take: 1 },
    },
  });
  if (!cliente) redirect("/admin/clientes");

  const digitos = (cliente.phone || "").replace(/\D/g, "").slice(-8);

  const [perfil, credito, notas, tarefas, todasTags, devolucoes, indicadas, sacolas, espera] = await Promise.all([
    perfilDaCliente(id),
    extratoDaCliente(id),
    prisma.customerNote.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.crmTask.findMany({ where: { userId: id, status: { in: ["aberta", "adiada"] } }, orderBy: { priority: "desc" } }),
    prisma.customerTag.findMany({ orderBy: [{ auto: "desc" }, { name: "asc" }] }),
    prisma.return.findMany({ where: { order: { userId: id } }, orderBy: { requestedAt: "desc" }, take: 10 }),
    prisma.referral.findMany({ where: { referrerId: id }, include: { referred: { select: { id: true, name: true } } } }),
    digitos
      ? prisma.cartLead.findMany({ where: { status: "aberto" }, orderBy: { updatedAt: "desc" }, take: 50 })
      : Promise.resolve([]),
    digitos
      ? prisma.waitlist.findMany({ where: { notified: false }, include: { product: { select: { name: true, stock: true } } }, take: 50 })
      : Promise.resolve([]),
  ]);

  const casaTelefone = (t: string | null) => !!digitos && (t || "").replace(/\D/g, "").slice(-8) === digitos;
  const minhasSacolas = sacolas.filter(s => casaTelefone(s.phone));
  const minhaEspera = espera.filter(w => casaTelefone(w.phone));

  // Só o caderno: é o que o abatimento de crédito quita.
  const dividaNoCaderno = Math.round(
    cliente.orders
      .filter(o => o.paymentMethod === "caderno" && o.paymentStatus !== "paid" && o.status !== "cancelled")
      .reduce((s, o) => s + (o.total - o.amountPaid), 0) * 100,
  ) / 100;

  const tryOn = cliente.orders.filter(o => o.status === "try-on").length;
  const endereco = cliente.addresses[0];
  const aniversario = cliente.birthDate
    ? cliente.birthDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : null;

  const whats = (cliente.phone || "").replace(/\D/g, "");
  const linkWhats = whats ? `https://wa.me/${whats.startsWith("55") ? whats : `55${whats}`}` : null;

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem 1.25rem", backgroundColor: "#FAF6EE", minHeight: "100vh" }}>

      {/* ── Cabeçalho ── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/admin/clientes" style={{ color: "#b8891a", fontSize: "0.875rem", textDecoration: "none" }}>← Clientes</Link>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginTop: "0.3rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#1a1510" }}>{cliente.name || "Cliente"}</h1>
            <div style={{ display: "flex", gap: "1rem", marginTop: "0.3rem", flexWrap: "wrap", fontSize: "0.8rem", color: "#9a8060" }}>
              {cliente.phone && <span style={{ color: "#7a6030" }}>📞 {cliente.phone}</span>}
              <span>📧 {cliente.email}</span>
              {endereco && <span>📍 {endereco.district}, {endereco.city}/{endereco.state}</span>}
              {aniversario && <span>🎂 {aniversario}</span>}
              <span>Cliente desde {cliente.createdAt.toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {linkWhats && (
              <a href={linkWhats} target="_blank" rel="noopener noreferrer"
                style={{ backgroundColor: "#25D366", color: "#fff", fontWeight: 700, fontSize: "0.85rem", padding: "0.5rem 1rem", borderRadius: "0.625rem", textDecoration: "none" }}>
                WhatsApp
              </a>
            )}
            <Link href={`/admin/pedidos/novo?clienteId=${cliente.id}`}
              style={{ backgroundColor: "#b8891a", color: "#fff", fontWeight: 700, fontSize: "0.85rem", padding: "0.5rem 1rem", borderRadius: "0.625rem", textDecoration: "none" }}>
              + Novo Pedido
            </Link>
            {perfil.saldoAberto > 0 && (
              <Link href={`/admin/caderno/${cliente.id}`}
                style={{ backgroundColor: "#fff8e1", border: "1px solid rgba(184,137,26,0.3)", color: "#856404", fontWeight: 700, fontSize: "0.85rem", padding: "0.5rem 1rem", borderRadius: "0.625rem", textDecoration: "none" }}>
                Ver caderno
              </Link>
            )}
          </div>
        </div>

        <Etiquetas
          userId={cliente.id}
          coladas={cliente.crmTags.map(l => ({ id: l.tag.id, nome: l.tag.name, cor: l.tag.color, auto: l.tag.auto }))}
          todas={todasTags.map(t => ({ id: t.id, nome: t.name, cor: t.color, auto: t.auto }))}
        />
      </div>

      {/* ── O que fazer com ela agora ── */}
      {tarefas.length > 0 && (
        <div style={{ ...CARTAO, borderColor: "rgba(184,137,26,0.35)", backgroundColor: "#fff8e1", padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "0.7rem", fontWeight: 800, color: "#856404", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
            NA FILA AGORA
          </p>
          {tarefas.map(t => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", padding: "0.25rem 0" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1a1510" }}>{t.title}</span>
              <span style={{ fontSize: "0.8rem", color: "#7a6030" }}>{t.detail}</span>
            </div>
          ))}
          <Link href="/admin/fila" style={{ fontSize: "0.78rem", color: "#b8891a", textDecoration: "none", display: "inline-block", marginTop: "0.4rem" }}>
            abrir a fila →
          </Link>
        </div>
      )}

      {/* ── Números ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        {[
          { emoji: "🛍️", label: "Pedidos", value: String(perfil.quantidade) },
          { emoji: "💰", label: "Total gasto", value: formatCurrency(perfil.totalGasto) },
          { emoji: "🎯", label: "Ticket médio", value: formatCurrency(perfil.ticketMedio) },
          { emoji: "📒", label: "Saldo em aberto", value: formatCurrency(perfil.saldoAberto), warn: perfil.saldoAberto > 0 },
          {
            emoji: "📅", label: "Sem comprar",
            value: perfil.diasSemComprar !== null ? `${perfil.diasSemComprar}d` : "—",
            warn: perfil.atraso !== null && perfil.atraso >= 1.5,
          },
          {
            emoji: "🔁", label: "Compra a cada",
            value: perfil.cicloMedio ? `${perfil.cicloMedio}d` : "—",
          },
          { emoji: "👗", label: "Home Try-On", value: String(tryOn) },
          { emoji: "🔄", label: "Trocas / devoluções", value: `${perfil.trocas} / ${perfil.devolucoes}` },
          ...(credito.saldo > 0.005
            ? [{ emoji: "🎟️", label: "Crédito disponível", value: formatCurrency(credito.saldo) }]
            : []),
        ].map(k => (
          <div key={k.label} style={{ ...CARTAO, borderColor: k.warn ? "rgba(184,137,26,0.35)" : "rgba(140,100,20,0.1)", padding: "0.875rem 1rem" }}>
            <div style={{ fontSize: "1.1rem", marginBottom: "0.25rem" }}>{k.emoji}</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 900, color: k.warn ? "#856404" : "#1a1510" }}>{k.value}</div>
            <div style={{ fontSize: "0.7rem", color: "#9a8060", marginTop: "0.15rem" }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: "1.25rem", alignItems: "start" }} className="ficha-grid">

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0 }}>

          {/* Pedidos */}
          <div style={{ ...CARTAO, overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(140,100,20,0.08)", backgroundColor: "#FAF6EE" }}>
              <h2 style={{ fontWeight: 800, fontSize: "0.95rem", color: "#1a1510" }}>Pedidos</h2>
            </div>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {cliente.orders.length === 0 ? (
                <p style={{ textAlign: "center", padding: "2rem", color: "#b8a080" }}>Nenhum pedido ainda.</p>
              ) : cliente.orders.map(o => {
                const saldo = o.total - o.amountPaid;
                const sc = PAY_STATUS_COLOR[o.paymentStatus] || { bg: "#f0f0f0", color: "#666" };
                const st = ORDER_STATUS_COLOR[o.status] || { bg: "#f0f0f0", color: "#666" };
                const pecas = o.items
                  .map(i => [i.componentName || i.product?.name, i.color, i.size].filter(Boolean).join(" "))
                  .join(" · ");
                return (
                  <div key={o.id} style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid rgba(140,100,20,0.05)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.72rem", fontFamily: "monospace", color: "#9a8060" }}>#{o.id.slice(-8).toUpperCase()}</span>
                        <Selo bg={sc.bg} cor={sc.color}>
                          {o.paymentStatus === "paid" ? "Pago" : o.paymentStatus === "partial" ? "Parcial" : "Pendente"}
                        </Selo>
                        <Selo bg={st.bg} cor={st.color}>{ORDER_STATUS_LABEL[o.status] || o.status}</Selo>
                        <span style={{ fontSize: "0.72rem", color: "#9a8060" }}>{PAY_LABEL[o.paymentMethod] || o.paymentMethod}</span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#7a6030", marginTop: "0.25rem" }}>{pecas || "—"}</div>
                      <div style={{ fontSize: "0.72rem", color: "#9a8060", marginTop: "0.15rem" }}>
                        {o.createdAt.toLocaleDateString("pt-BR")}
                        {o.couponCode ? ` · cupom ${o.couponCode}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: "#1a1510" }}>{formatCurrency(o.total)}</div>
                      {saldo > 0.01 && <div style={{ fontSize: "0.72rem", color: "#c04040" }}>saldo: {formatCurrency(saldo)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Histórico de contato */}
          <Historico
            userId={cliente.id}
            notasIniciais={notas.map(n => ({
              id: n.id, kind: n.kind, body: n.body, outcome: n.outcome,
              authorName: n.authorName, createdAt: n.createdAt.toISOString(),
            }))}
            eventos={[
              ...cliente.orders.map(o => ({
                id: `pedido-${o.id}`,
                quando: o.createdAt.toISOString(),
                titulo: `Pedido #${o.id.slice(-8).toUpperCase()} — ${formatCurrency(o.total)}`,
                texto: o.items.map(i => [i.componentName || i.product?.name, i.color, i.size].filter(Boolean).join(" ")).join(", "),
                tipo: "venda" as const,
              })),
              ...devolucoes.map(d => ({
                id: `dev-${d.id}`,
                quando: d.requestedAt.toISOString(),
                titulo: d.replacementProductId ? "Pediu troca" : "Pediu devolução",
                texto: `${d.status} · ${formatCurrency(d.amount)}${d.reason ? ` · ${d.reason}` : ""}`,
                tipo: "sistema" as const,
              })),
              ...minhasSacolas.map(s => ({
                id: `sacola-${s.id}`,
                quando: s.updatedAt.toISOString(),
                titulo: `Carrinho deixado — ${formatCurrency(s.total)}`,
                texto: parseJson<{ nome?: string; cor?: string; tamanho?: string }[]>(s.items, [])
                  .map(i => [i.nome, i.cor, i.tamanho].filter(Boolean).join(" ")).join(", "),
                tipo: "sistema" as const,
              })),
              ...minhaEspera.map(w => ({
                id: `espera-${w.id}`,
                quando: w.createdAt.toISOString(),
                titulo: "Entrou na lista de espera",
                texto: `${w.product.name}${w.product.stock > 0 ? " — já repôs!" : " — ainda sem estoque"}`,
                tipo: "sistema" as const,
              })),
            ]}
          />
        </div>

        {/* ── Coluna lateral ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0 }}>

          <Credito
            userId={cliente.id}
            saldo={credito.saldo}
            motivos={[...MOTIVOS_DE_ENTRADA]}
            dividaNoCaderno={dividaNoCaderno}
            lancamentos={credito.lancamentos.map(l => ({
              id: l.id, amount: l.amount, kind: l.kind, rotulo: l.rotulo,
              note: l.note, authorName: l.authorName,
              createdAt: l.createdAt.toISOString(),
            }))}
          />

          <Bloco titulo="O que ela compra">
            {perfil.pecas === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#b8a080" }}>Ainda sem peças compradas.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <Preferencia titulo="Tamanho" itens={perfil.tamanhos} />
                <Preferencia titulo="Categoria" itens={perfil.categorias} />
                <Preferencia titulo="Cor" itens={perfil.cores} />
              </div>
            )}
          </Bloco>

          {minhasSacolas.length > 0 && (
            <Bloco titulo="Carrinho abandonado">
              {minhasSacolas.map(s => (
                <div key={s.id} style={{ fontSize: "0.8rem", color: "#7a6030", marginBottom: "0.4rem" }}>
                  <div style={{ fontWeight: 700, color: "#1a1510" }}>{formatCurrency(s.total)} · {s.pecas} peça(s)</div>
                  <div style={{ fontSize: "0.75rem", color: "#9a8060" }}>
                    {parseJson<{ nome?: string; cor?: string; tamanho?: string }[]>(s.items, [])
                      .map(i => [i.nome, i.cor, i.tamanho].filter(Boolean).join(" ")).join(", ")}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#b8a080" }}>{s.updatedAt.toLocaleString("pt-BR")}</div>
                </div>
              ))}
            </Bloco>
          )}

          {minhaEspera.length > 0 && (
            <Bloco titulo="Lista de espera">
              {minhaEspera.map(w => (
                <div key={w.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", fontSize: "0.8rem", marginBottom: "0.3rem" }}>
                  <span style={{ color: "#7a6030" }}>{w.product.name}</span>
                  <span style={{ fontWeight: 700, color: w.product.stock > 0 ? "#1a8a2a" : "#b8a080" }}>
                    {w.product.stock > 0 ? "chegou" : "aguarda"}
                  </span>
                </div>
              ))}
            </Bloco>
          )}

          {devolucoes.length > 0 && (
            <Bloco titulo="Trocas e devoluções">
              {devolucoes.map(d => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", fontSize: "0.8rem", marginBottom: "0.3rem" }}>
                  <span style={{ color: "#7a6030" }}>
                    {d.replacementProductId ? "Troca" : "Devolução"} · {d.requestedAt.toLocaleDateString("pt-BR")}
                  </span>
                  <span style={{ fontWeight: 700, color: "#1a1510" }}>{d.status}</span>
                </div>
              ))}
            </Bloco>
          )}

          {indicadas.length > 0 && (
            <Bloco titulo={`Indicou ${indicadas.length} cliente(s)`}>
              {indicadas.map(r => (
                <Link key={r.id} href={`/admin/clientes/${r.referred.id}`}
                  style={{ display: "block", fontSize: "0.8rem", color: "#b8891a", textDecoration: "none", marginBottom: "0.25rem" }}>
                  {r.referred.name || "Cliente"} →
                </Link>
              ))}
            </Bloco>
          )}
        </div>
      </div>
    </div>
  );
}

function Selo({ children, bg, cor }: { children: React.ReactNode; bg: string; cor: string }) {
  return (
    <span style={{ fontSize: "0.68rem", backgroundColor: bg, color: cor, padding: "0.15rem 0.5rem", borderRadius: 999, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ ...CARTAO, padding: "1.1rem 1.25rem" }}>
      <h3 style={{ fontWeight: 800, fontSize: "0.8rem", color: "#1a1510", marginBottom: "0.75rem" }}>{titulo}</h3>
      {children}
    </div>
  );
}

function Preferencia({ titulo, itens }: { titulo: string; itens: { nome: string; fatia: number }[] }) {
  const principal = itens[0];
  if (!principal) return null;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
        <span style={{ color: "#9a8060", fontWeight: 700 }}>{titulo}</span>
        <span style={{ color: "#1a1510", fontWeight: 700 }}>
          {principal.nome} · {Math.round(principal.fatia * 100)}%
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, backgroundColor: "rgba(140,100,20,0.12)", overflow: "hidden" }}>
        <div style={{ width: `${Math.round(principal.fatia * 100)}%`, height: "100%", backgroundColor: "#b8891a" }} />
      </div>
      {itens.length > 1 && (
        <p style={{ fontSize: "0.7rem", color: "#b8a080", marginTop: "0.25rem" }}>
          também: {itens.slice(1, 4).map(i => i.nome).join(", ")}
        </p>
      )}
    </div>
  );
}
