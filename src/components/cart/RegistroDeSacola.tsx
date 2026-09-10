"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/store/cart";
import { registrarSacola } from "@/lib/carrinhoLead";

const ESPERA = 2500;

/**
 * Registra a sacola sozinho, observando o carrinho de fora.
 *
 * Fica aqui, e nao dentro de cada acao do carrinho, para pegar adicionar,
 * remover e mudar quantidade no mesmo lugar. Espera a cliente parar de mexer
 * antes de mandar: quem ajusta a quantidade tres vezes seguidas gera um
 * registro so, nao tres.
 */
export default function RegistroDeSacola() {
  const items = useCart(e => e.items);
  const cliente = useCart(e => e.cliente);
  const jaMandou = useRef(false);

  useEffect(() => {
    // Nao registra a sacola vazia da primeira visita — so quando ela esvazia
    // algo que existia
    if (items.length === 0 && !jaMandou.current) return;
    jaMandou.current = true;

    const t = setTimeout(() => {
      registrarSacola({
        itens: items.map(i => ({
          nome: i.name,
          cor: i.color !== "Padrão" ? i.color : undefined,
          tamanho: i.size,
          peca: i.componentName,
          quantidade: i.quantity,
          preco: i.price,
        })),
        total: items.reduce((s, i) => s + i.price * i.quantity, 0),
        nome: cliente?.nome || undefined,
        telefone: cliente?.telefone || undefined,
      });
    }, ESPERA);

    return () => clearTimeout(t);
  }, [items, cliente]);

  return null;
}
