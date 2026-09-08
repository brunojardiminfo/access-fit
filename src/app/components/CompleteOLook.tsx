"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, parseJson } from "@/lib/utils";
import { getSaleInfo } from "@/lib/saleHelper";

type Peca = {
  id: string; name: string; slug: string; price: number; images: string;
  createdAt: string | Date; onSale?: boolean; saleDiscount?: number | null;
  category: { name: string };
};

/**
 * "Complete o look": peças de outra categoria na mesma cor da que a cliente
 * está vendo. Fica logo abaixo do botão de comprar, onde a decisão acontece.
 *
 * Some sozinho quando não há combinação — um bloco vazio ou com peça que não
 * combina atrapalha mais do que ajuda.
 */
export default function CompleteOLook({ productSlug }: { productSlug: string }) {
  const [pecas, setPecas] = useState<Peca[]>([]);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/produtos/${productSlug}/complete-o-look`)
      .then(r => r.json())
      .then(d => { if (vivo && d?.pecas?.length) setPecas(d.pecas); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [productSlug]);

  if (pecas.length === 0) return null;

  return (
    <div style={{ marginTop: "1.75rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(140,100,20,0.12)" }}>
      <p style={{ fontSize: "0.72rem", fontWeight: 800, color: "#9a8060", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.75rem" }}>
        Complete o look
      </p>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        {pecas.map(p => {
          const imgs = parseJson<string[]>(p.images, []);
          const criado = typeof p.createdAt === "string" ? new Date(p.createdAt) : p.createdAt;
          const sale = getSaleInfo({ price: p.price, createdAt: criado, onSale: p.onSale, saleDiscount: p.saleDiscount });
          const preco = sale ? sale.salePrice : p.price;
          return (
            <Link key={p.id} href={`/produtos/${p.slug}`}
              style={{ textDecoration: "none", width: 108, display: "block" }}>
              <div style={{ position: "relative", width: 108, aspectRatio: "3/4", borderRadius: "0.625rem", overflow: "hidden", backgroundColor: "#F0E8D0", border: "1px solid rgba(140,100,20,0.15)" }}>
                {imgs[0] ? (
                  <img src={imgs[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(184,137,26,0.4)", fontSize: "0.6rem", fontWeight: 700, textAlign: "center", padding: "0 0.4rem" }}>
                    Foto em breve
                  </div>
                )}
                {sale && (
                  <span style={{ position: "absolute", top: 5, left: 5, backgroundColor: "#e74c3c", color: "#fff", fontSize: "0.52rem", fontWeight: 900, padding: "1px 5px", borderRadius: "999px" }}>
                    −{sale.discount}%
                  </span>
                )}
              </div>
              <p style={{ fontSize: "0.68rem", color: "#5a4a2a", fontWeight: 600, margin: "0.4rem 0 0.1rem", lineHeight: 1.25, overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical" as const, WebkitLineClamp: 2, minHeight: "1.7em" }}>
                {p.name}
              </p>
              <p style={{ fontSize: "0.75rem", fontWeight: 800, color: sale ? "#e74c3c" : "#b8891a", margin: 0 }}>
                {formatCurrency(preco)}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
