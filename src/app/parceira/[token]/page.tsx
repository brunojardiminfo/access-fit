import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { KIND_CASHBACK, baseDaComissao, resumoDaParceira } from "@/lib/parceiras";

export const dynamic = "force-dynamic";

/**
 * A página que a parceira abre, sem senha.
 *
 * O QUE ELA VÊ, E O QUE NÃO VÊ. Vê o que ela mesma vendeu: data, valor da
 * venda e o cashback. NÃO vê nome de cliente, peça comprada nem endereço —
 * nada disso é dela, e um link sem senha que escapa de um grupo de WhatsApp
 * não pode levar junto a lista de clientes da loja.
 *
 * O LINK É A ÚNICA TRANCA, por isso o token é longo e aleatório. Se vazar, o
 * admin gera outro num clique e o antigo morre na hora.
 *
 * `noindex` porque uma página sem senha que o Google indexa deixa de ser
 * privada.
 */
export const metadata = { robots: { index: false, follow: false } };

export default async function PaginaDaParceira({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const parceira = await prisma.parceira.findUnique({ where: { token } });
  if (!parceira || !parceira.ativa) notFound();

  const [pedidos, creditos] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: { not: "cancelled" },
        OR: [{ parceiraId: parceira.id }, { couponCode: parceira.codigo }],
      },
      select: { id: true, subtotal: true, discount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    parceira.userId
      ? prisma.customerCredit.findMany({
          where: { userId: parceira.userId },
          select: { amount: true, kind: true },
        })
      : Promise.resolve([]),
  ]);

  const r = resumoDaParceira(
    pedidos, parceira.comissao,
    creditos.filter(c => c.kind === KIND_CASHBACK && c.amount > 0).map(c => c.amount),
    creditos.map(c => c.amount),
  );

  const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const dia = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

  const cartao = {
    backgroundColor: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "1rem", padding: "1.1rem 1.25rem",
  } as const;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>

        <p style={{ color: "var(--gold)", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
          Parceria Access Fit
        </p>
        <h1 style={{ color: "var(--text-main)", fontSize: "1.9rem", fontWeight: 900, lineHeight: 1.1, marginBottom: "0.35rem" }}>
          {parceira.nome}
        </h1>
        <p style={{ color: "var(--text-sub)", fontSize: "0.9rem", marginBottom: "1.75rem" }}>
          Seu código é <strong style={{ color: "var(--gold)" }}>{parceira.codigo}</strong> · você ganha {parceira.comissao}% do que vende
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.75rem", marginBottom: "1.75rem" }}>
          <div style={cartao}>
            <div style={{ color: "var(--text-main)", fontSize: "1.5rem", fontWeight: 900 }}>{moeda(r.vendido)}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: "0.15rem" }}>você vendeu</div>
          </div>
          <div style={{ ...cartao, borderColor: "rgba(184,137,26,0.45)" }}>
            <div style={{ color: "var(--gold)", fontSize: "1.5rem", fontWeight: 900 }}>{moeda(r.saldoNaLoja)}</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: "0.15rem" }}>saldo para usar agora</div>
          </div>
        </div>

        {/* O que ainda não virou saldo aparece como tal, em vez de somar no
            número de cima: prometer saldo que ainda não existe gera cobrança. */}
        {r.aCreditar > 0 && (
          <div style={{ ...cartao, marginBottom: "1.75rem", backgroundColor: "rgba(184,137,26,0.07)" }}>
            <div style={{ color: "var(--text-sub)", fontSize: "0.85rem" }}>
              Mais <strong style={{ color: "var(--gold)" }}>{moeda(r.aCreditar)}</strong> de cashback a liberar
              das suas vendas mais recentes.
            </div>
          </div>
        )}

        <p style={{ color: "var(--text-muted)", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.6rem" }}>
          Suas vendas ({r.pedidos})
        </p>

        {pedidos.length === 0 ? (
          <div style={{ ...cartao, color: "var(--text-sub)", fontSize: "0.88rem" }}>
            Nenhuma venda registrada ainda. Quando alguém comprar com o seu código, aparece aqui.
          </div>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: "1rem", overflow: "hidden" }}>
            {pedidos.map((o, i) => {
              const valor = baseDaComissao(o);
              return (
                <div key={o.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.8rem 1.1rem",
                  backgroundColor: i % 2 === 0 ? "var(--bg-card)" : "var(--bg)",
                  borderBottom: i < pedidos.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <span style={{ color: "var(--text-sub)", fontSize: "0.85rem" }}>{dia(o.createdAt)}</span>
                  <span style={{ color: "var(--text-main)", fontSize: "0.9rem", fontWeight: 700 }}>{moeda(valor)}</span>
                  <span style={{ color: "var(--gold)", fontSize: "0.82rem", fontWeight: 700 }}>
                    +{moeda(valor * (parceira.comissao / 100))}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <p style={{ color: "var(--text-muted)", fontSize: "0.72rem", lineHeight: 1.6, marginTop: "1.5rem" }}>
          O saldo é usado como crédito nas suas compras na loja. Dúvida sobre alguma venda, chama a gente no WhatsApp.
        </p>
      </div>
    </div>
  );
}
