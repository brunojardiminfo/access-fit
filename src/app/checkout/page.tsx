"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/store/cart";
import { calcularSacola, descontoDoCupom, CAMPANHA } from "@/lib/campanha";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

const PAY_LABELS: Record<string, string> = {
  pix: "Pix", cartao: "Cartão de crédito/débito",
  dinheiro: "Dinheiro", link: "Link de Pagamento",
};

function parseJson<T>(json: string, fallback: T): T {
  try { return JSON.parse(json); } catch { return fallback; }
}

const inp = {
  padding: "0.75rem 1rem",
  border: "1px solid rgba(140,100,20,0.25)",
  borderRadius: "0.625rem",
  fontSize: "0.95rem",
  backgroundColor: "#fff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box" as const,
};

function CheckoutContent() {
  const { items, total, clearCart, addItem, couponCode, couponDiscount } = useCart();
  const searchParams = useSearchParams();
  const previewId = searchParams.get("previewId");
  const [skus, setSkus] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [type, setType] = useState<"compra" | "tryon">("compra");
  const [payMethod, setPayMethod] = useState("pix");
  const [sent, setSent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  // Campos Home Try-On
  const [cpf, setCpf] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [state, setState] = useState("");
  const [cep, setCep] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Busca SKUs dos produtos no carrinho
  useEffect(() => {
    const ids = [...new Set(items.map(i => i.productId))];
    if (!ids.length) return;
    fetch(`/api/produtos/skus?ids=${ids.join(",")}`)
      .then(r => r.json())
      .then(data => setSkus(data))
      .catch(() => {});
  }, [items]);

  // Quem abre um link compartilhado (ou volta nele de outro aparelho) chega sem
  // carrinho: recompoe a partir do rascunho para nao cair num checkout vazio
  useEffect(() => {
    if (!previewId || items.length > 0) return;
    fetch(`/api/pedido-preview?id=${previewId}`)
      .then(r => r.json())
      .then(order => {
        if (!order?.items?.length) return;
        order.items.forEach((i: any) => addItem({
          productId: i.productId,
          name: i.product?.name || "Peça",
          price: i.price,
          image: parseJson<string[]>(i.product?.images || "[]", [])[0] || "",
          size: i.size || "Único",
          color: i.color || "Padrão",
          quantity: i.quantity,
        }));
      })
      .catch(() => {});
  }, [previewId, items.length, addItem]);

  // O botao so fica cinza com a razao escrita embaixo, nunca sem explicacao
  const faltando = [
    !name.trim() && "seu nome",
    !phone.trim() && "telefone",
    !nascimento && "data de nascimento",
    // Endereço é obrigatório em qualquer pedido: sem ele não há como entregar
    !cep.trim() && "CEP",
    !street.trim() && "rua",
    !number.trim() && "número",
    !neighborhood.trim() && "bairro",
    !city.trim() && "cidade",
    !state.trim() && "estado",
    ...(type === "tryon" ? [
      !cpf.trim() && "CPF",
      !termsAccepted && "aceite dos termos",
    ] : []),
  ].filter(Boolean) as string[];

  const sacola = calcularSacola(items);
  // Cupom não vale em peça de SALE: incide só sobre o que está a preço cheio
  const descontoCupom = descontoDoCupom(sacola.baseCupom, couponDiscount || 0);
  // Campanha e cupom não somam: vale a melhor condição
  const campanhaGanha = sacola.desconto > descontoCupom + 0.001;
  const desconto = Math.max(sacola.desconto, descontoCupom);
  const totalFinal = total() - desconto;

  const handleCreatePreview = async () => {
    const res = await fetch("/api/pedido-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price })),
        total: totalFinal,
        subtotal: total(),
        discount: desconto,
        couponCode,
      }),
    });
    const data = await res.json();
    if (data.shareUrl) {
      window.location.href = data.shareUrl;
    }
  };

  const handleWhatsApp = async () => {
    if (!name.trim() || !phone.trim()) return;

    const linhas = items.map(item => {
      const sku = skus[item.productId] ? `[${skus[item.productId]}] ` : "";
      const tam = item.size && item.size !== "Unico" ? ` - Tam. ${item.size}` : "";
      const cor = item.color && item.color !== "Padrão" ? ` - ${item.color}` : "";
      const qtd = item.quantity > 1 ? ` x${item.quantity}` : "";
      return `- ${sku}${item.name}${cor}${tam}${qtd}: ${formatCurrency(item.price * item.quantity)}`;
    }).join("\n");

    const tipoTexto = type === "tryon"
      ? "Home Try-On (experimentar em casa - 48h para devolver)\nTaxa de R$ 30,00 se devolver"
      : "Compra";

    // Endereço vai na mensagem dos dois tipos de pedido
    const enderecoCompleto = `${street}, ${number}${complement ? ` - ${complement}` : ""}, ${neighborhood}, ${city} - ${state.toUpperCase()}, CEP: ${cep}`;

    const cupomLinha = campanhaGanha
      ? `\n${CAMPANHA.nome}: ${sacola.pecas} peças (-${sacola.progressivo}%) = -${formatCurrency(desconto)}`
      : couponCode && couponDiscount
        ? `\nCupom: ${couponCode} (-${couponDiscount}%) = -${formatCurrency(desconto)}`
        : "";

    const msg = [
      `Ola! Gostaria de fazer um pedido na Access Fit`,
      ``,
      linhas,
      ``,
      `*Total: ${formatCurrency(totalFinal)}*${cupomLinha}`,
      ``,
      `Tipo: ${tipoTexto}`,
      `Nome: ${name}`,
      `Telefone: ${phone}`,
      `Nascimento: ${nascimento ? nascimento.split("-").reverse().join("/") : "-"}`,
      type === "tryon" && cpf ? `CPF: ${cpf}` : "",
      ``,
      `*Entrega:*`,
      enderecoCompleto,
      type === "compra" ? `Pagamento: ${PAY_LABELS[payMethod] || payMethod}` : "",
    ].filter(Boolean).join("\n");

    // Abre o WhatsApp ainda dentro do clique: depois do await o navegador
    // trata como popup e o celular bloqueia
    const url = `https://wa.me/5551986596705?text=${encodeURIComponent(msg)}`;
    const janela = window.open(url, "_blank");

    // Criar pedido no banco
    try {
      await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price, size: i.size, color: i.color })),
          total: totalFinal,
          subtotal: total(),
          discount: desconto,
          paymentMethod: type === "tryon" ? "pix" : payMethod,
          cliente: { nome: name.trim(), telefone: phone.trim(), cidade: city.trim() || null, nascimento: nascimento || null },
          endereco: {
            rua: street.trim(), numero: number.trim(), complemento: complement.trim() || null,
            bairro: neighborhood.trim(), cidade: city.trim(), estado: state.trim().toUpperCase(), cep: cep.trim(),
          },
          notes: `${city ? `${city}` : ""}${couponCode ? `${city ? " | " : ""}Cupom: ${couponCode}` : ""}` || null,
          couponCode: couponCode || null,
          status: type === "tryon" ? "try-on" : "pending",
          previewId: previewId || null,
        }),
      });
    } catch {
      // não bloqueia o fluxo se falhar
    }

    // Bloqueado pelo navegador: leva na propria aba, para nunca ficar sem saida
    if (!janela) window.location.href = url;
    setSent(true);
    clearCart();
  };

  if (items.length === 0 && !sent) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#FAF6EE", padding: "2rem" }}>
        <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1a1510", marginBottom: "0.5rem" }}>Carrinho vazio</p>
        <p style={{ color: "#9a8060", marginBottom: "1.5rem" }}>Adicione produtos antes de finalizar.</p>
        <Link href="/produtos" style={{ backgroundColor: "#b8891a", color: "#fff", padding: "0.75rem 2rem", borderRadius: "0.75rem", textDecoration: "none", fontWeight: 700 }}>
          Ver coleção
        </Link>
      </div>
    );
  }

  if (sent) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#FAF6EE", padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#1a1510", marginBottom: "0.5rem" }}>Pedido enviado!</h2>
        <p style={{ color: "#5a4a2a", marginBottom: "0.5rem" }}>Sua mensagem foi aberta no WhatsApp.</p>
        <p style={{ color: "#9a8060", fontSize: "0.875rem", marginBottom: "2rem" }}>Em breve entraremos em contato para confirmar.</p>
        <Link href="/produtos" style={{ color: "#b8891a", fontWeight: 700, textDecoration: "none" }}>← Continuar comprando</Link>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#FAF6EE", minHeight: "100vh", padding: "2rem 1.25rem" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <Link href="/produtos" style={{ color: "#b8891a", fontSize: "0.875rem", textDecoration: "none" }}>← Continuar comprando</Link>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#1a1510", marginTop: "0.3rem" }}>Finalizar Pedido</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>

          {/* Resumo do carrinho */}
          <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.12)", borderRadius: "1rem", padding: "1.5rem" }}>
            <h2 style={{ fontWeight: 800, color: "#1a1510", marginBottom: "1.25rem", fontSize: "1rem" }}>🛍️ Seus itens</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}>
              {items.map(item => (
                <div key={item.id} style={{ display: "flex", gap: "0.875rem", alignItems: "center" }}>
                  <div style={{ width: 56, height: 56, backgroundColor: "#F0E8D0", borderRadius: "0.5rem", overflow: "hidden", flexShrink: 0 }}>
                    {item.image && <img src={item.image} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {skus[item.productId] && (
                      <p style={{ fontSize: "0.68rem", color: "#b8891a", fontWeight: 700, fontFamily: "monospace" }}>{skus[item.productId]}</p>
                    )}
                    <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1a1510", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
                    <p style={{ fontSize: "0.75rem", color: "#9a8060" }}>{[item.color && item.color !== "Padrão" ? item.color : null, item.size].filter(Boolean).join(" · ")}{item.quantity > 1 ? ` × ${item.quantity}` : ""}</p>
                  </div>
                  <span style={{ fontWeight: 700, color: "#b8891a", whiteSpace: "nowrap" }}>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid rgba(140,100,20,0.1)", paddingTop: "1rem" }}>
              {desconto > 0 && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span style={{ color: "#5a4a2a", fontSize: "0.875rem" }}>Subtotal</span>
                    <span style={{ color: "#5a4a2a" }}>{formatCurrency(total())}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span style={{ color: "#1a8a2a", fontSize: "0.875rem", fontWeight: 700 }}>
                      {campanhaGanha
                        ? `${CAMPANHA.nome} · ${sacola.pecas} peças (-${sacola.progressivo}%)`
                        : `Cupom ${couponCode} (-${couponDiscount}%)`}
                    </span>
                    <span style={{ color: "#1a8a2a", fontWeight: 700 }}>-{formatCurrency(desconto)}</span>
                  </div>
                </>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: "#1a1510" }}>Total</span>
                <span style={{ fontWeight: 900, fontSize: "1.25rem", color: "#b8891a" }}>{formatCurrency(totalFinal)}</span>
              </div>
            </div>
          </div>

          {/* Formulário */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Tipo de pedido */}
            <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.12)", borderRadius: "1rem", padding: "1.5rem" }}>
              <h2 style={{ fontWeight: 800, color: "#1a1510", marginBottom: "1rem", fontSize: "1rem" }}>Como prefere receber?</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {[
                  { value: "compra", emoji: "🛍️", title: "Compra normal", desc: "Recebo e fico com as peças" },
                  { value: "tryon", emoji: "👗", title: "Home Try-On", desc: "Experimento em casa e pago só o que ficar · Taxa de R$ 30 se devolver" },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setType(opt.value as any)}
                    style={{ display: "flex", gap: "0.875rem", alignItems: "center", padding: "0.875rem 1rem", borderRadius: "0.75rem", border: `2px solid ${type === opt.value ? "#b8891a" : "rgba(140,100,20,0.15)"}`, backgroundColor: type === opt.value ? "#fff8e8" : "#FAF6EE", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontSize: "1.5rem" }}>{opt.emoji}</span>
                    <div>
                      <p style={{ fontWeight: 700, color: type === opt.value ? "#b8891a" : "#1a1510", fontSize: "0.9rem" }}>{opt.title}</p>
                      <p style={{ fontSize: "0.75rem", color: "#9a8060", marginTop: "0.1rem" }}>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dados */}
            <div style={{ backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.12)", borderRadius: "1rem", padding: "1.5rem" }}>
              <h2 style={{ fontWeight: 800, color: "#1a1510", marginBottom: "1rem", fontSize: "1rem" }}>
                {type === "tryon" ? "📋 Cadastro Home Try-On" : "Seus dados"}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7a6030", display: "block", marginBottom: "0.3rem" }}>Nome completo *</label>
                  <input style={inp} placeholder="Seu nome completo" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7a6030", display: "block", marginBottom: "0.3rem" }}>WhatsApp *</label>
                  <input style={inp} placeholder="(51) 9..." value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7a6030", display: "block", marginBottom: "0.3rem" }}>Data de nascimento *</label>
                  <input style={inp} type="date" value={nascimento} onChange={e => setNascimento(e.target.value)}
                    max={new Date().toISOString().split("T")[0]} />
                  <p style={{ fontSize: "0.72rem", color: "#9a8060", marginTop: "0.25rem" }}>
                    Guardamos para te mimar no seu aniversário 🎁
                  </p>
                </div>

                {type === "compra" && (
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7a6030", display: "block", marginBottom: "0.3rem" }}>Forma de pagamento *</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      {Object.entries(PAY_LABELS).map(([val, label]) => (
                        <button key={val} type="button" onClick={() => setPayMethod(val)}
                          style={{ padding: "0.6rem 0.5rem", borderRadius: "0.625rem", border: `2px solid ${payMethod === val ? "#b8891a" : "rgba(140,100,20,0.15)"}`, backgroundColor: payMethod === val ? "#fff8e8" : "#FAF6EE", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, color: payMethod === val ? "#b8891a" : "#5a4a2a", textAlign: "center" }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {type === "tryon" && (
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7a6030", display: "block", marginBottom: "0.3rem" }}>CPF *</label>
                    <input style={inp} placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(e.target.value)} />
                  </div>
                )}

                {/* Endereço de entrega — vale para compra e para try-on */}
                <>
                    <p style={{ fontSize: "0.78rem", fontWeight: 800, color: "#1a1510", marginTop: "0.4rem" }}>
                      📍 Endereço de entrega
                    </p>
                    <div>
                      <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7a6030", display: "block", marginBottom: "0.3rem" }}>CEP *</label>
                      <input style={inp} placeholder="00000-000" value={cep} onChange={e => setCep(e.target.value)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.5rem" }}>
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7a6030", display: "block", marginBottom: "0.3rem" }}>Rua / Avenida *</label>
                        <input style={inp} placeholder="Nome da rua" value={street} onChange={e => setStreet(e.target.value)} />
                      </div>
                      <div style={{ width: 90 }}>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7a6030", display: "block", marginBottom: "0.3rem" }}>Número *</label>
                        <input style={inp} placeholder="Nº" value={number} onChange={e => setNumber(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7a6030", display: "block", marginBottom: "0.3rem" }}>Complemento</label>
                      <input style={inp} placeholder="Apto, bloco..." value={complement} onChange={e => setComplement(e.target.value)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7a6030", display: "block", marginBottom: "0.3rem" }}>Bairro *</label>
                        <input style={inp} placeholder="Bairro" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7a6030", display: "block", marginBottom: "0.3rem" }}>Estado *</label>
                        <input style={inp} placeholder="RS" value={state} onChange={e => setState(e.target.value)} maxLength={2} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7a6030", display: "block", marginBottom: "0.3rem" }}>Cidade *</label>
                      <input style={inp} placeholder="Sua cidade" value={city} onChange={e => setCity(e.target.value)} />
                    </div>
                </>
              </div>
            </div>

            {/* Termos Home Try-On */}
            {type === "tryon" && (
              <div style={{ backgroundColor: "#fff8e1", border: "1px solid rgba(184,137,26,0.3)", borderRadius: "1rem", padding: "1.25rem" }}>
                <p style={{ fontWeight: 800, color: "#5a3a00", fontSize: "0.9rem", marginBottom: "0.75rem" }}>⚠️ Termos do Home Try-On</p>
                {/* Aviso taxa */}
                <div style={{ backgroundColor: "#1a1510", borderRadius: "0.75rem", padding: "0.875rem 1rem", marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>💰</span>
                  <div>
                    <p style={{ fontWeight: 900, color: "#b8891a", fontSize: "0.9rem", marginBottom: "0.2rem" }}>Taxa de R$ 30,00</p>
                    <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.8rem", lineHeight: 1.5 }}>
                      Cobrada para cobrir o custo de levar e buscar a peça <strong style={{ color: "#fff" }}>somente se você devolver</strong>. Se ficar com a peça, não há nenhuma taxa adicional.
                    </p>
                  </div>
                </div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                  {[
                    "Você tem até 48h para experimentar e devolver as peças que não quiser",
                    "As peças devem ser devolvidas com etiqueta, sem avarias e sem sinais de uso",
                    "Peças com avaria, manchas, sem etiqueta ou lavadas serão cobradas integralmente",
                    "O pagamento das peças que ficarem é combinado no ato da devolução",
                    "A Access Fit reserva o direito de cobrar pela peça em caso de não devolução no prazo",
                  ].map((t, i) => (
                    <li key={i} style={{ display: "flex", gap: "0.5rem", fontSize: "0.8rem", color: "#5a3a00", lineHeight: 1.5 }}>
                      <span style={{ color: "#b8891a", flexShrink: 0 }}>•</span> {t}
                    </li>
                  ))}
                </ul>
                <label style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", cursor: "pointer" }}>
                  <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                    style={{ width: 18, height: 18, marginTop: 2, accentColor: "#b8891a", flexShrink: 0, cursor: "pointer" }} />
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1a1510", lineHeight: 1.5 }}>
                    Li e aceito os termos do Home Try-On e me comprometo a devolver as peças dentro do prazo
                  </span>
                </label>
              </div>
            )}

            {/* Finalização */}
            <div>
              <button onClick={handleWhatsApp}
                disabled={faltando.length > 0}
                style={{ width: "100%", backgroundColor: faltando.length > 0 ? "#d4b870" : "#25D366", color: "#fff", border: "none", borderRadius: "0.875rem", padding: "1.05rem", fontSize: "1rem", fontWeight: 900, cursor: faltando.length > 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Finalizar pedido no WhatsApp
              </button>
            </div>

            {faltando.length > 0 ? (
              <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#c04040", fontWeight: 700, marginTop: "0.75rem" }}>
                Para finalizar, preencha: {faltando.join(", ")}
              </p>
            ) : (
              <p style={{ textAlign: "center", fontSize: "0.78rem", color: "#9a8060", marginTop: "0.75rem" }}>
                Você será levada ao nosso WhatsApp com o pedido pronto para confirmar.
              </p>
            )}

            <button onClick={handleCreatePreview} disabled={items.length === 0}
              style={{ display: "block", margin: "0.5rem auto 0", background: "none", border: "none", color: "#9a8060", fontSize: "0.78rem", textDecoration: "underline", cursor: items.length === 0 ? "not-allowed" : "pointer" }}>
              Só quero mostrar esta sacola para alguém
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FAF6EE" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(184,137,26,0.2)", borderTopColor: "#b8891a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
