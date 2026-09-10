"use client";

import { useState } from "react";
import { useCart, PERMITIR_PULAR } from "@/store/cart";
import { registrarSacola } from "@/lib/carrinhoLead";

/** Telefone brasileiro precisa de DDD + numero. */
function telefoneValido(v: string): boolean {
  const so = v.replace(/\D/g, "");
  return so.length >= 10 && so.length <= 13;
}

function mascara(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Pede nome e telefone na primeira peca que entra no carrinho.
 *
 * Fica no layout e aparece sozinho quando o carrinho segura uma peca por nao
 * saber quem esta comprando. Depois disso nao aparece mais: a cliente e
 * lembrada no proprio navegador, e o checkout ja vem preenchido.
 */
export default function IdentificacaoModal() {
  const pendente = useCart(e => e.pendente);
  const identificar = useCart(e => e.identificar);
  const pular = useCart(e => e.pularIdentificacao);
  const cancelar = useCart(e => e.cancelarPendente);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState("");

  if (!pendente) return null;

  const confirmar = () => {
    if (!nome.trim()) { setErro("Como podemos te chamar?"); return; }
    if (!telefoneValido(telefone)) { setErro("Confira o telefone com DDD."); return; }
    setErro("");
    identificar({ nome: nome.trim(), telefone: telefone.trim() });
    // Ja registra a sacola com contato, sem esperar o checkout
    registrarSacola({
      itens: [{
        nome: pendente.name,
        cor: pendente.color !== "Padrão" ? pendente.color : undefined,
        tamanho: pendente.size,
        peca: pendente.componentName,
        quantidade: pendente.quantity,
        preco: pendente.price,
      }],
      total: pendente.price * pendente.quantity,
      nome: nome.trim(),
      telefone: telefone.trim(),
    });
  };

  const campo: React.CSSProperties = {
    width: "100%", padding: "0.85rem 1rem", borderRadius: "0.75rem",
    border: "1px solid rgba(140,100,20,0.25)", fontSize: "1rem",
    backgroundColor: "#fff", color: "#1a1510", marginBottom: "0.75rem",
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) cancelar(); }}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(26,21,16,0.6)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.25rem" }}>
      <div style={{ backgroundColor: "#FAF6EE", borderRadius: "1.25rem", padding: "1.75rem 1.5rem", width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
        <p style={{ fontSize: "0.7rem", fontWeight: 800, color: "#b8891a", textTransform: "uppercase", letterSpacing: "0.14em", margin: 0 }}>
          Quase lá
        </p>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#1a1510", margin: "0.3rem 0 0.4rem" }}>
          Pra quem estamos separando?
        </h2>
        <p style={{ fontSize: "0.85rem", color: "#9a8060", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
          Guardamos sua sacola com seu nome. Assim, se você não finalizar agora,
          a gente te ajuda a terminar depois.
        </p>

        <input value={nome} onChange={e => { setNome(e.target.value); setErro(""); }}
          placeholder="Seu nome" autoFocus style={campo}
          onKeyDown={e => { if (e.key === "Enter") confirmar(); }} />
        <input value={telefone} onChange={e => { setTelefone(mascara(e.target.value)); setErro(""); }}
          placeholder="(51) 99999-9999" inputMode="tel" style={campo}
          onKeyDown={e => { if (e.key === "Enter") confirmar(); }} />

        {erro && <p style={{ color: "#c04040", fontSize: "0.8rem", fontWeight: 700, margin: "0 0 0.75rem" }}>{erro}</p>}

        <button onClick={confirmar}
          style={{ width: "100%", padding: "1rem", backgroundColor: "#1a1510", color: "#FAF6EE", fontWeight: 900, fontSize: "1rem", border: "none", borderRadius: "0.875rem", cursor: "pointer", letterSpacing: "0.03em" }}>
          Adicionar à sacola
        </button>

        {PERMITIR_PULAR && (
          <button onClick={pular}
            style={{ display: "block", width: "100%", marginTop: "0.625rem", background: "none", border: "none", color: "#9a8060", fontSize: "0.82rem", textDecoration: "underline", cursor: "pointer" }}>
            Agora não, quero só olhar
          </button>
        )}

        <p style={{ fontSize: "0.7rem", color: "#b0a08c", textAlign: "center", margin: "1rem 0 0", lineHeight: 1.5 }}>
          Usamos seu contato só para falar sobre este pedido.
        </p>
      </div>
    </div>
  );
}
