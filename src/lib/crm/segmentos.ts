import { prisma } from "@/lib/prisma";
import { perfisDeTodas, type Perfil } from "./perfil";

/**
 * Filtro montavel de clientes.
 *
 * As condicoes sao avaliadas em memoria sobre o perfil ja calculado, e nao
 * traduzidas para SQL. E uma escolha consciente: metade dos criterios uteis
 * ("passou de 1,5x o proprio ritmo", "70% dos pedidos com desconto") nao existem
 * como coluna, e a loja tem centenas de clientes, nao milhoes.
 */

export type Operador = "maisDe" | "menosDe" | "acimaDe" | "abaixoDe" | "tem" | "naoTem" | "sim" | "nao";

export type Condicao =
  | { campo: "produto"; valor: string; tamanho?: string; cor?: string }
  | { campo: "categoria"; valor: string }
  | { campo: "tamanho"; valor: string }
  | { campo: "cor"; valor: string }
  | { campo: "ultimaCompra"; op: "maisDe" | "menosDe"; dias: number }
  | { campo: "totalGasto"; op: "acimaDe" | "abaixoDe"; valor: number }
  | { campo: "ticket"; op: "acimaDe" | "abaixoDe"; valor: number }
  | { campo: "pedidos"; op: "acimaDe" | "abaixoDe"; valor: number }
  | { campo: "etiqueta"; op: "tem" | "naoTem"; slug: string }
  | { campo: "saldoAberto"; op: "sim" | "nao" };

export type ClienteDoSegmento = {
  id: string;
  nome: string | null;
  telefone: string | null;
  etiquetas: { nome: string; cor: string }[];
  pedidos: number;
  totalGasto: number;
  ticketMedio: number;
  ultimaCompra: Date | null;
  diasSemComprar: number | null;
};

const contem = (lista: { nome: string }[], alvo: string) =>
  lista.some(x => x.nome.toLowerCase() === alvo.toLowerCase());

function passa(p: Perfil, etiquetas: Set<string>, c: Condicao): boolean {
  switch (c.campo) {
    case "produto": {
      const itens = p.pedidos.flatMap(o => o.itens).filter(i => i.produto.toLowerCase() === c.valor.toLowerCase());
      if (!itens.length) return false;
      if (c.tamanho && !itens.some(i => (i.tamanho || "") === c.tamanho)) return false;
      if (c.cor && !itens.some(i => (i.cor || "") === c.cor)) return false;
      return true;
    }
    case "categoria": return contem(p.categorias, c.valor);
    case "tamanho":   return contem(p.tamanhos, c.valor);
    case "cor":       return contem(p.cores, c.valor);
    case "ultimaCompra": {
      const dias = p.diasSemComprar;
      if (dias === null) return c.op === "maisDe";
      return c.op === "maisDe" ? dias > c.dias : dias < c.dias;
    }
    case "totalGasto": return c.op === "acimaDe" ? p.totalGasto > c.valor : p.totalGasto < c.valor;
    case "ticket":     return c.op === "acimaDe" ? p.ticketMedio > c.valor : p.ticketMedio < c.valor;
    case "pedidos":    return c.op === "acimaDe" ? p.quantidade > c.valor : p.quantidade < c.valor;
    case "etiqueta":   return c.op === "tem" ? etiquetas.has(c.slug) : !etiquetas.has(c.slug);
    case "saldoAberto": return c.op === "sim" ? p.saldoAberto > 0.01 : p.saldoAberto <= 0.01;
    default: return true;
  }
}

export async function filtrarClientes(condicoes: Condicao[], agora = new Date()) {
  const [perfis, clientes, vinculos] = await Promise.all([
    perfisDeTodas(agora),
    prisma.user.findMany({
      where: { role: "customer" },
      select: { id: true, name: true, phone: true },
    }),
    prisma.customerTagLink.findMany({ include: { tag: { select: { slug: true, name: true, color: true } } } }),
  ]);

  const tagsPor = new Map<string, { slug: string; nome: string; cor: string }[]>();
  for (const v of vinculos) {
    const lista = tagsPor.get(v.userId) || [];
    lista.push({ slug: v.tag.slug, nome: v.tag.name, cor: v.tag.color });
    tagsPor.set(v.userId, lista);
  }

  const encontradas: ClienteDoSegmento[] = [];
  for (const cliente of clientes) {
    const perfil = perfis.get(cliente.id);
    if (!perfil) continue;

    const etiquetas = tagsPor.get(cliente.id) || [];
    const slugs = new Set(etiquetas.map(e => e.slug));
    if (!condicoes.every(c => passa(perfil, slugs, c))) continue;

    encontradas.push({
      id: cliente.id,
      nome: cliente.name,
      telefone: cliente.phone,
      etiquetas: etiquetas.map(e => ({ nome: e.nome, cor: e.cor })),
      pedidos: perfil.quantidade,
      totalGasto: perfil.totalGasto,
      ticketMedio: perfil.ticketMedio,
      ultimaCompra: perfil.ultimaCompra,
      diasSemComprar: perfil.diasSemComprar,
    });
  }

  encontradas.sort((a, b) => b.totalGasto - a.totalGasto);

  const soma = encontradas.reduce((s, c) => s + c.totalGasto, 0);
  return {
    clientes: encontradas,
    quantidade: encontradas.length,
    somaGasta: Math.round(soma * 100) / 100,
    ticketMedio: encontradas.length
      ? Math.round((encontradas.reduce((s, c) => s + c.ticketMedio, 0) / encontradas.length) * 100) / 100
      : 0,
  };
}

/** Valores que existem de verdade no catálogo, para o filtro não oferecer opção vazia. */
export async function opcoesDeFiltro() {
  const [produtos, categorias, tags] = await Promise.all([
    prisma.product.findMany({ where: { active: true }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.category.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    prisma.customerTag.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return {
    produtos: produtos.map(p => p.name),
    categorias: categorias.map(c => c.name),
    etiquetas: tags,
    tamanhos: ["PP", "P", "M", "G", "GG", "P/M", "G/GG", "Único"],
  };
}
