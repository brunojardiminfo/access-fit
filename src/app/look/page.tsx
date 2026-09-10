"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency, parseJson } from "@/lib/utils";
import { getSaleInfo } from "@/lib/saleHelper";
import { useCart } from "@/store/cart";

type Peca = {
  id: string; slug: string; name: string; price: number; images: string;
  createdAt: string; onSale?: boolean; saleDiscount?: number | null;
  category: { name: string };
  cor: string | null; tamanho: string | null; quantidade: number; disponivel: boolean;
};

function LookInterno() {
  const params = useSearchParams();
  const router = useRouter();
  const { addItem, openCart } = useCart();
  const [pecas, setPecas] = useState<Peca[] | null>(null);
  const [fora, setFora] = useState<string[]>([]);

  const p = params.get("p");

  useEffect(() => {
    if (!p) {
      // Fora do caminho sincrono do efeito, senao o React encadeia renderizacoes
      const t = setTimeout(() => setPecas([]), 0);
      return () => clearTimeout(t);
    }
    fetch(`/api/look?p=${encodeURIComponent(p)}`)
      .then(r => r.json())
      .then(d => {
        const lista: Peca[] = d?.pecas || [];
        setPecas(lista);
        setFora(lista.filter(x => !x.disponivel).map(x => x.name));
      })
      .catch(() => setPecas([]));
  }, [p]);

  const precoFinal = (peca: Peca) => {
    const sale = getSaleInfo({
      price: peca.price, createdAt: new Date(peca.createdAt),
      onSale: peca.onSale, saleDiscount: peca.saleDiscount,
    });
    return { preco: sale ? sale.salePrice : peca.price, sale };
  };

  const disponiveis = (pecas || []).filter(x => x.disponivel);
  const total = disponiveis.reduce((s, x) => s + precoFinal(x).preco * x.quantidade, 0);

  const levarTudo = () => {
    for (const peca of disponiveis) {
      const { preco, sale } = precoFinal(peca);
      addItem({
        productId: peca.id,
        name: peca.name,
        price: preco,
        precoCheio: peca.price,
        descontoSale: sale?.discount ?? 0,
        image: parseJson<string[]>(peca.images, [])[0] || "",
        size: peca.tamanho || "Único",
        color: peca.cor || "Padrão",
        quantity: peca.quantidade,
      });
    }
    openCart();
    router.push("/checkout");
  };

  if (pecas === null) {
    return <div style={{ padding: "4rem 1.5rem", textAlign: "center", color: "#9a8060" }}>Montando seu look...</div>;
  }

  if (pecas.length === 0) {
    return (
      <div style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
        <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1a1510", marginBottom: "0.5rem" }}>Não encontramos este look</p>
        <p style={{ color: "#9a8060", fontSize: "0.9rem", marginBottom: "1.5rem" }}>O link pode ter expirado ou as peças saíram do ar.</p>
        <Link href="/produtos" style={{ backgroundColor: "#b8891a", color: "#fff", padding: "0.75rem 2rem", borderRadius: "0.75rem", textDecoration: "none", fontWeight: 700 }}>
          Ver a coleção
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "1.5rem 1.25rem 3rem" }}>
      <p style={{ fontSize: "0.7rem", fontWeight: 800, color: "#b8891a", textTransform: "uppercase", letterSpacing: "0.16em", margin: 0 }}>
        Look selecionado
      </p>
      <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: "#1a1510", margin: "0.25rem 0 1.25rem" }}>
        {disponiveis.length === 1 ? "A peça do look" : `As ${disponiveis.length} peças do look`}
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {pecas.map((peca, i) => {
          const { preco, sale } = precoFinal(peca);
          const img = parseJson<string[]>(peca.images, [])[0];
          const detalhe = [peca.cor, peca.tamanho].filter(Boolean).join(" · ");
          return (
            <Link key={`${peca.id}-${i}`} href={`/produtos/${peca.slug}`}
              style={{ display: "flex", gap: "0.875rem", alignItems: "center", backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.12)", borderRadius: "0.875rem", padding: "0.75rem", textDecoration: "none", opacity: peca.disponivel ? 1 : 0.55 }}>
              <div style={{ width: 74, height: 96, borderRadius: "0.625rem", overflow: "hidden", backgroundColor: "#F0E8D0", flexShrink: 0 }}>
                {img && <img src={img} alt={peca.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.68rem", color: "#b8891a", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                  {peca.category.name}
                </p>
                <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1a1510", margin: "0.15rem 0" }}>{peca.name}</p>
                {detalhe && <p style={{ fontSize: "0.78rem", color: "#9a8060", margin: 0 }}>{detalhe}{peca.quantidade > 1 ? ` · ${peca.quantidade} un` : ""}</p>}
                {!peca.disponivel && <p style={{ fontSize: "0.75rem", color: "#c04040", fontWeight: 700, margin: "0.2rem 0 0" }}>Esgotada no momento</p>}
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "1rem", fontWeight: 900, color: sale ? "#e74c3c" : "#b8891a", margin: 0 }}>{formatCurrency(preco)}</p>
                {sale && <p style={{ fontSize: "0.72rem", color: "#b8a080", textDecoration: "line-through", margin: 0 }}>{formatCurrency(peca.price)}</p>}
              </div>
            </Link>
          );
        })}
      </div>

      {fora.length > 0 && disponiveis.length > 0 && (
        <p style={{ fontSize: "0.78rem", color: "#9a8060", marginTop: "0.875rem" }}>
          {fora.length === 1 ? "Uma peça do look está esgotada e não entra na sacola." : `${fora.length} peças estão esgotadas e não entram na sacola.`}
        </p>
      )}

      {disponiveis.length > 0 ? (
        <div style={{ marginTop: "1.5rem", backgroundColor: "#fff", border: "1px solid rgba(140,100,20,0.15)", borderRadius: "0.875rem", padding: "1rem 1.125rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.875rem" }}>
            <span style={{ color: "#5a4a2a", fontWeight: 700 }}>Total do look</span>
            <span style={{ fontSize: "1.35rem", fontWeight: 900, color: "#b8891a" }}>{formatCurrency(total)}</span>
          </div>
          <button onClick={levarTudo}
            style={{ width: "100%", padding: "1rem", backgroundColor: "#1a1510", color: "#FAF6EE", fontWeight: 900, fontSize: "1rem", border: "none", borderRadius: "0.875rem", cursor: "pointer", letterSpacing: "0.03em" }}>
            🛍️ Quero este look
          </button>
          <p style={{ fontSize: "0.75rem", color: "#9a8060", textAlign: "center", margin: "0.625rem 0 0" }}>
            Você confere tudo antes de finalizar no WhatsApp
          </p>
        </div>
      ) : (
        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <p style={{ color: "#c04040", fontWeight: 700, marginBottom: "0.875rem" }}>As peças deste look estão esgotadas no momento.</p>
          <Link href="/produtos" style={{ backgroundColor: "#b8891a", color: "#fff", padding: "0.75rem 2rem", borderRadius: "0.75rem", textDecoration: "none", fontWeight: 700 }}>
            Ver a coleção
          </Link>
        </div>
      )}
    </div>
  );
}

export default function LookPage() {
  return (
    <div style={{ backgroundColor: "#FAF6EE", minHeight: "100vh" }}>
      <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center", color: "#9a8060" }}>Carregando...</div>}>
        <LookInterno />
      </Suspense>
    </div>
  );
}
