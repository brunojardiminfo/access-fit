export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function excelDateToJS(serial: number): Date {
  return new Date(Math.floor(serial - 25569) * 86400 * 1000);
}

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferCategory(name: string, cat: string): string {
  if (cat) {
    const map: Record<string, string> = {
      "SHORTS": "Shorts", "TOPS": "Tops", "MACAQUINHOS": "Macaquinhos",
      "LEGGINS": "Leggings", "LEGGINGS": "Leggings", "JAQUETAS": "Jaquetas", "CONJUNTOS": "Conjuntos",
      "CAMISETAS BÁSICAS": "Camisetas básicas", "Camisetas Básicas": "Camisetas básicas",
      "MACACÃO": "Macacão",
    };
    if (map[cat.trim()]) return map[cat.trim()];
  }
  const n = name.toLowerCase();
  if (n.startsWith("macacão") || n.startsWith("macacao") || n.startsWith("zip back")) return "Macacão";
  if (n.startsWith("conjunto") || n.startsWith("conj") || n.startsWith("calça cozy")) return "Conjuntos";
  if (n.startsWith("camiseta")) return "Camisetas básicas";
  if (n.startsWith("legging") || n.startsWith("leggin") || n.startsWith("calça legging") || n.startsWith("calça elite")) return "Leggings";
  if (n.startsWith("macaquinho")) return "Macaquinhos";
  if (n.startsWith("jaqueta") || n.startsWith("casaco")) return "Jaquetas";
  if (n.startsWith("top")) return "Tops";
  if (n.startsWith("short") || n.startsWith("bermuda")) return "Shorts";
  return "Conjuntos";
}

const SKU_PREFIX: Record<string, string> = {
  "Shorts": "SH", "Tops": "TP", "Macaquinhos": "MQ", "Leggings": "LG",
  "Jaquetas": "JQ", "Conjuntos": "CF", "Camisetas básicas": "CB",
  "Macacão": "MC", "Vendas Manuais": "VM",
};

const PRODUCTS_RAW = [
  { name: "Bermuda Bicolor Marrom", size: "ÚNICO", cat: "SHORTS", qty: 1, cost: 42.5, price: 79, sc: null, sup: "LISS FITNESS" },
  { name: "Top Vermelho promo", size: "ÚNICO", cat: "TOPS", qty: 1, cost: 25, price: 59, sc: null, sup: "LISS FITNESS" },
  { name: "Short Vermelho promo", size: "ÚNICO", cat: "SHORTS", qty: 1, cost: 25, price: 59, sc: null, sup: "LISS FITNESS" },
  { name: "Bermuda Vermelha", size: "ÚNICO", cat: "SHORTS", qty: 1, cost: 40, price: 79, sc: null, sup: "LISS FITNESS" },
  { name: "Top Slim Preto", size: "ÚNICO", cat: "TOPS", qty: 1, cost: 26, price: 50, sc: null, sup: "LISS FITNESS" },
  { name: "Macaquinho Fabi Bicolor", size: "ÚNICO", cat: "MACAQUINHOS", qty: 1, cost: 95, price: 129, sc: null, sup: "LISS FITNESS" },
  { name: "Bermuda rosa claro", size: "ÚNICO", cat: "SHORTS", qty: 1, cost: 25, price: 69, sc: null, sup: "LISS FITNESS" },
  { name: "Top rosa claro", size: "ÚNICO", cat: "TOPS", qty: 1, cost: 25, price: 59, sc: null, sup: "LISS FITNESS" },
  { name: "Bermuda bege", size: "ÚNICO", cat: "SHORTS", qty: 1, cost: 25, price: 69, sc: null, sup: "LISS FITNESS" },
  { name: "Top bege", size: "ÚNICO", cat: "TOPS", qty: 1, cost: 25, price: 59, sc: null, sup: "LISS FITNESS" },
  { name: "Legging Rosa", size: "ÚNICO", cat: "LEGGINS", qty: 1, cost: 37.5, price: 89, sc: null, sup: "LISS FITNESS" },
  { name: "Top Rosa", size: "ÚNICO", cat: "TOPS", qty: 1, cost: 37.5, price: 69, sc: null, sup: "LISS FITNESS" },
  { name: "Top preto Aline", size: "ÚNICO", cat: "TOPS", qty: 1, cost: 37.5, price: 69, sc: null, sup: "LISS FITNESS" },
  { name: "Top marrom plus", size: "ÚNICO", cat: "TOPS", qty: 1, cost: 45, price: 90, sc: null, sup: "LISS FITNESS" },
  { name: "Bermuda marrom plus", size: "GG", cat: "SHORTS", qty: 1, cost: 45, price: 90, sc: null, sup: "LISS FITNESS" },
  { name: "Macaquinho Agatha Rosa", size: "ÚNICO", cat: "MACAQUINHOS", qty: 1, cost: 80, price: 149, sc: null, sup: "LISS FITNESS" },
  { name: "Short Roxo Bicolor", size: "ÚNICO", cat: "SHORTS", qty: 1, cost: 25, price: 69, sc: null, sup: "LISS FITNESS" },
  { name: "Top Roxo Bicolor", size: "ÚNICO", cat: "TOPS", qty: 1, cost: 25, price: 59, sc: null, sup: "LISS FITNESS" },
  { name: "Top Preto Cintia", size: "ÚNICO", cat: "TOPS", qty: 1, cost: 37.5, price: 69, sc: null, sup: "LISS FITNESS" },
  { name: "Casaco Icebraker marrom", size: "P/M", cat: "JAQUETAS", qty: 1, cost: 150, price: 299, sc: null, sup: "MISS BLESSED" },
  { name: "Casaco slim curto Cinza", size: "P/M", cat: "JAQUETAS", qty: 1, cost: 60, price: 149, sc: null, sup: "MISS BLESSED" },
  { name: "Macaquinho costa nua preto", size: "P/M", cat: "MACAQUINHOS", qty: 1, cost: 70, price: 140, sc: null, sup: "MISS BLESSED" },
  { name: "Leggin Cinza fit stream listra", size: "P/M", cat: "LEGGINS", qty: 1, cost: 40, price: 90, sc: null, sup: "MISS BLESSED" },
  { name: "Leggin Preto fit stream listra", size: "P/M", cat: "LEGGINS", qty: 1, cost: 40, price: 90, sc: null, sup: "MISS BLESSED" },
  { name: "Macaquinho Bordô canelado C/Ziper", size: "P/M", cat: "MACAQUINHOS", qty: 1, cost: 50, price: 140, sc: null, sup: "MISS BLESSED" },
  { name: "Macaquinho Marrom Canelado Aberto", size: "G/GG", cat: "MACAQUINHOS", qty: 1, cost: 50, price: 140, sc: null, sup: "MISS BLESSED" },
  { name: "Macaquinho Zíper Bordô", size: "P/M", cat: "MACAQUINHOS", qty: 1, cost: 50, price: 140, sc: null, sup: "MISS BLESSED" },
  { name: "Calça Cozy balance", size: "G/GG", cat: "CONJUNTOS", qty: 1, cost: 60, price: 109, sc: null, sup: "MISS BLESSED" },
  { name: "Conjunto Flare Cropped Cinza", size: "ÚNICO", cat: "CONJUNTOS", qty: 1, cost: 105, price: 199, sc: null, sup: null },
  { name: "Conjunto Flare betina Nude", size: "ÚNICO", cat: "CONJUNTOS", qty: 1, cost: 105, price: 199, sc: null, sup: "BF FITNESS" },
  { name: "Jaqueta Duo Preto M", size: "M", cat: "JAQUETAS", qty: 1, cost: 120, price: 299, sc: "HJ-28-183", sup: "BF FITNESS" },
  { name: "Jaqueta Duo Preto G", size: "G", cat: "JAQUETAS", qty: 1, cost: 120, price: 299, sc: "HJ-28-183", sup: "MISS BLESSED" },
  { name: "Calça Legging Elite Fit 2.0 Preto GG", size: "G/GG", cat: "LEGGINS", qty: 1, cost: 45, price: 109, sc: "MN-2541", sup: "MISS BLESSED" },
  { name: "Calça Elite Prime 2.0 Marrom", size: "P/M", cat: "LEGGINS", qty: 1, cost: 45, price: 109.9, sc: "A-116", sup: "MISS BLESSED" },
  { name: "Calça Elite Prime 2.0 Verde", size: "P/M", cat: "LEGGINS", qty: 1, cost: 45, price: 109.9, sc: "A-116", sup: "MISS BLESSED" },
  { name: "Calça Elite Prime 2.0 Preto", size: "G/GG", cat: "LEGGINS", qty: 1, cost: 45, price: 109.9, sc: "A-116", sup: "MISS BLESSED" },
  { name: "Camiseta Manga Longa Basic Azul Marinho PM", size: "P/M", cat: "Camisetas Básicas", qty: 2, cost: 50, price: 99.9, sc: "K-836", sup: "MISS BLESSED" },
  { name: "Camiseta Manga Longa Basic Azul Bebê", size: "P/M", cat: "Camisetas Básicas", qty: 1, cost: 50, price: 99.9, sc: "K-836", sup: "MISS BLESSED" },
  { name: "Camiseta Manga Longa Basic Cinza", size: "G/GG", cat: "Camisetas Básicas", qty: 2, cost: 50, price: 99.9, sc: "K-836", sup: "MISS BLESSED" },
  { name: "Camiseta Manga Longa Basic Azul Marinho GG", size: "G/GG", cat: "Camisetas Básicas", qty: 1, cost: 50, price: 99.9, sc: "K-836", sup: "MISS BLESSED" },
  { name: "Top Hype Preto", size: "G/GG", cat: "TOPS", qty: 1, cost: 40, price: 99.9, sc: "MN-2587", sup: "MISS BLESSED" },
  { name: "Top Shape Branco", size: "G/GG", cat: "TOPS", qty: 1, cost: 45, price: 99.9, sc: "MN-2551", sup: "MISS BLESSED" },
  { name: "Jaqueta Hype Fit 2.0 Preto", size: "P/M", cat: "JAQUETAS", qty: 2, cost: 60, price: 149, sc: "WT-333", sup: "MISS BLESSED" },
  { name: "Jaqueta Hype Fit 2.0 Of-White", size: "P/M", cat: "JAQUETAS", qty: 2, cost: 60, price: 149, sc: "WT-333", sup: "MISS BLESSED" },
  { name: "Conjunto Legging Urban Sculpt Rosa", size: "G/GG", cat: "CONJUNTOS", qty: 1, cost: 60, price: 139, sc: "MN-9307", sup: "MISS BLESSED" },
  { name: "Jaqueta Urban Azul Marinho", size: "P/M", cat: "JAQUETAS", qty: 1, cost: 70, price: 149, sc: "MN-2558", sup: "MISS BLESSED" },
  { name: "Macacão Fit Princess Lilás", size: "P/M", cat: "MACACÃO", qty: 1, cost: 70, price: 159.9, sc: "L-658", sup: "MISS BLESSED" },
  { name: "Zip Back Sculpt Vinho", size: "P/M", cat: "MACACÃO", qty: 1, cost: 70, price: 149.9, sc: "L-653", sup: "MISS BLESSED" },
  { name: "Zip Back Sculpt Preto", size: "P/M", cat: "MACACÃO", qty: 1, cost: 70, price: 149, sc: "L-653", sup: "MISS BLESSED" },
  { name: "Conj Clássico top TATI PRETO", size: "ÚNICO", cat: "CONJUNTOS", qty: 3, cost: 89.9, price: 159.9, sc: null, sup: "LISS FITNESS" },
  { name: "Conj Clássico top TATI BRANCO", size: "ÚNICO", cat: "CONJUNTOS", qty: 1, cost: 89.9, price: 159.9, sc: null, sup: "LISS FITNESS" },
  { name: "Conj Clássico top TATI AZUL", size: "ÚNICO", cat: "CONJUNTOS", qty: 1, cost: 89.9, price: 159.9, sc: null, sup: "LISS FITNESS" },
  { name: "Conj Clássico top TATI BORDÔ", size: "ÚNICO", cat: "CONJUNTOS", qty: 1, cost: 89.9, price: 159.9, sc: null, sup: "LISS FITNESS" },
  { name: "Conj Clássico top TATI MARROM", size: "ÚNICO", cat: "CONJUNTOS", qty: 1, cost: 89.9, price: 159.9, sc: null, sup: "LISS FITNESS" },
  // Novos produtos (sem categoria na planilha — auto-atribuída)
  { name: "Macacão Fit Power Marrom", size: "P/M", cat: "MACACÃO", qty: 1, cost: 74.07, price: 164.9, sc: null, sup: "MISS BLESSED" },
  { name: "Macacão Fit Power Azul", size: "P/M", cat: "MACACÃO", qty: 1, cost: 74.07, price: 164.9, sc: null, sup: "MISS BLESSED" },
  { name: "Conjunto Legging Elite Race Verde Musgo", size: "G/GG", cat: "CONJUNTOS", qty: 1, cost: 84.66, price: 179.9, sc: null, sup: "MISS BLESSED" },
  { name: "Conjunto Legging Blackout Rose", size: "P/M", cat: "CONJUNTOS", qty: 1, cost: 84.66, price: 179.9, sc: null, sup: "MISS BLESSED" },
  { name: "Conjunto Legging Blackout Preto GG", size: "G/GG", cat: "CONJUNTOS", qty: 1, cost: 84.66, price: 179.9, sc: null, sup: "MISS BLESSED" },
  { name: "Conjunto Legging Blackout Preto PM", size: "P/M", cat: "CONJUNTOS", qty: 1, cost: 84.66, price: 179.9, sc: null, sup: "MISS BLESSED" },
  { name: "Conjunto Legging Mula Manca Preto", size: "P/M", cat: "CONJUNTOS", qty: 1, cost: 84.66, price: 179.9, sc: null, sup: "MISS BLESSED" },
  { name: "Camiseta Signature Tee Preto", size: "P/M", cat: "Camisetas Básicas", qty: 1, cost: 42.33, price: 89.9, sc: null, sup: "MISS BLESSED" },
  { name: "Camiseta Zip Line 4 Preto PM", size: "P/M", cat: "Camisetas Básicas", qty: 1, cost: 47.62, price: 99.9, sc: null, sup: "MISS BLESSED" },
  { name: "Camiseta Zip Line 4 Preto GG", size: "G/GG", cat: "Camisetas Básicas", qty: 1, cost: 47.62, price: 99.9, sc: null, sup: "MISS BLESSED" },
  { name: "Camiseta Performance Basic Preto GG", size: "G/GG", cat: "Camisetas Básicas", qty: 1, cost: 52.91, price: 114.9, sc: null, sup: "MISS BLESSED" },
  { name: "Camiseta Performance Basic Preto PM", size: "P/M", cat: "Camisetas Básicas", qty: 2, cost: 52.91, price: 114.9, sc: null, sup: "MISS BLESSED" },
  { name: "Legging Elite Prime Branco", size: "P/M", cat: "LEGGINS", qty: 1, cost: 47.62, price: 114.9, sc: null, sup: "MISS BLESSED" },
  { name: "Legging Elite Prime 3.0 Vinho", size: "P/M", cat: "LEGGINS", qty: 1, cost: 47.62, price: 114.9, sc: null, sup: "MISS BLESSED" },
  { name: "Legging Elite Prime 3.0 Rosa Bebê", size: "P/M", cat: "LEGGINS", qty: 2, cost: 47.62, price: 124.9, sc: null, sup: "MISS BLESSED" },
  { name: "Legging Elite Fit 2.0 Off White", size: "P/M", cat: "LEGGINS", qty: 2, cost: 47.62, price: 124.9, sc: null, sup: "MISS BLESSED" },
  { name: "Legging Yoga Poliamida Preto", size: "G/GG", cat: "LEGGINS", qty: 1, cost: 47.62, price: 124.9, sc: null, sup: "MISS BLESSED" },
  { name: "Macacão Gota Preto GG", size: "G/GG", cat: "MACACÃO", qty: 1, cost: 63.49, price: 154.9, sc: null, sup: "MISS BLESSED" },
  { name: "Macacão Gota Preto PM", size: "P/M", cat: "MACACÃO", qty: 1, cost: 63.49, price: 154.9, sc: null, sup: "MISS BLESSED" },
  { name: "Macacão Gota Off White", size: "P/M", cat: "MACACÃO", qty: 1, cost: 63.49, price: 154.9, sc: null, sup: "MISS BLESSED" },
  { name: "Macacão X Preto", size: "P/M", cat: "MACACÃO", qty: 2, cost: 63.49, price: 154.9, sc: null, sup: "MISS BLESSED" },
  { name: "Macacão X Marrom", size: "P/M", cat: "MACACÃO", qty: 1, cost: 63.49, price: 154.9, sc: null, sup: "MISS BLESSED" },
  { name: "Conjunto Flare Nicole Preto", size: "ÚNICO", cat: "CONJUNTOS", qty: 1, cost: 104.99, price: 199, sc: null, sup: "LISS FITNESS" },
  { name: "Conjunto Gisele Chumbo", size: "ÚNICO", cat: "CONJUNTOS", qty: 1, cost: 89.9, price: 159.9, sc: null, sup: "LISS FITNESS" },
  { name: "Conjunto Gisele Azul Marinho", size: "ÚNICO", cat: "CONJUNTOS", qty: 1, cost: 89.9, price: 159.9, sc: null, sup: "LISS FITNESS" },
  { name: "Conjunto Flare Nicole Bordô", size: "ÚNICO", cat: "CONJUNTOS", qty: 1, cost: 104.99, price: 199, sc: null, sup: "LISS FITNESS" },
  { name: "Macaquinho Fabi Azul Marinho", size: "ÚNICO", cat: "MACAQUINHOS", qty: 1, cost: 50, price: 99.9, sc: null, sup: "LISS FITNESS" },
  { name: "Macacão Flare Nicole Black", size: "ÚNICO", cat: "MACACÃO", qty: 1, cost: 104.99, price: 199, sc: null, sup: "LISS FITNESS" },
  { name: "Macacão Flare Nicole Bordô", size: "ÚNICO", cat: "MACACÃO", qty: 1, cost: 104.99, price: 199, sc: null, sup: "LISS FITNESS" },
  { name: "Conjunto Maju Preto", size: "ÚNICO", cat: "CONJUNTOS", qty: 1, cost: 79.9, price: 159.9, sc: null, sup: "LISS FITNESS" },
];

const EXPENSES_DATA = [
  { date: 46163, desc: "Espelho de Chão", supplier: "MERCADO LIVRE", method: "cartao", cat: "outros", value: 137, fatura: "JUL" },
  { date: 46174, desc: "Arara de roupa de madeira", supplier: "MERCADO LIVRE", method: "cartao", cat: "outros", value: 104.9, fatura: "JUL/AGO" },
  { date: 46178, desc: "Vaso Cesto para decorar", supplier: "MERCADO LIVRE", method: "cartao", cat: "outros", value: 55.46, fatura: "JUL" },
  { date: 46175, desc: "Tapete redondo", supplier: "MERCADO LIVRE", method: "cartao", cat: "outros", value: 89.68, fatura: "JUL" },
  { date: 46180, desc: "Letreiro Luminoso", supplier: "MERCADO LIVRE", method: "cartao", cat: "marketing", value: 78.9, fatura: "JUL" },
  { date: 46178, desc: "Fita de Led", supplier: "MERCADO LIVRE", method: "cartao", cat: "outros", value: 37.34, fatura: "JUL" },
  { date: 46180, desc: "Papel Seda", supplier: "MERCADO LIVRE", method: "cartao", cat: "outros", value: 25.9, fatura: "JUL" },
  { date: 46180, desc: "Fonte para Led", supplier: "MERCADO LIVRE", method: "cartao", cat: "outros", value: 19, fatura: "JUL" },
  { date: 46180, desc: "Lacres Roupas", supplier: "MERCADO LIVRE", method: "cartao", cat: "outros", value: 26.97, fatura: "JUL" },
  { date: 46178, desc: "Etiquetas para Roupas", supplier: "MERCADO LIVRE", method: "cartao", cat: "outros", value: 112.42, fatura: "JUL" },
  { date: 46178, desc: "Pedido Liss Fitness", supplier: "LISS FITNESS", method: "pix", cat: "outros", value: 757.93, fatura: null },
  { date: 46178, desc: "Pedido Miss Blessed", supplier: "MISS BLESSED", method: "pix", cat: "outros", value: 2194.19, fatura: null },
  { date: 46183, desc: "Pedido Liss Fitness", supplier: "LISS FITNESS", method: "pix", cat: "outros", value: 650.93, fatura: null },
  { date: 46187, desc: "Pedido Liss Fitness", supplier: "LISS FITNESS", method: "pix", cat: "outros", value: 729.84, fatura: null },
  { date: 46191, desc: "Pedido Miss Blessed", supplier: "MISS BLESSED", method: "pix", cat: "outros", value: 1502.92, fatura: null },
  { date: 46193, desc: "Pedido Boneca de Ferro", supplier: "BONECA DE FERRO", method: "pix", cat: "outros", value: 435, fatura: null },
];

const SALES_DATA = [
  { date: 46086, client: "Eduarda Yago", product: "top", total: 50, method: "pix", status: "paid", received: 50 },
  { date: 46086, client: "Ingrid Bandeira", product: "Conjunto azul", total: 99, method: "pix", status: "paid", received: 99 },
  { date: 46086, client: "Gabriela Becker", product: "Macaquinho", total: 129, method: "pix", status: "paid", received: 129 },
  { date: 46086, client: "Gabriela Becker", product: "Macaquinho", total: 129, method: "pix", status: "paid", received: 129 },
  { date: 46086, client: "Ingrid Bandeira", product: "Macaquinho", total: 129, method: "pix", status: "paid", received: 129 },
  { date: 46096, client: "Daniela Faszank", product: "Short Rosa", total: 40, method: "pix", status: "paid", received: 40 },
  { date: 46096, client: "Daniela Faszank", product: "Conjunto Cinza", total: 95, method: "pix", status: "paid", received: 95 },
  { date: 46096, client: "Daniela Faszank", product: "Conjunto Verde", total: 95, method: "pix", status: "paid", received: 95 },
  { date: 46096, client: "Daniela Faszank", product: "Top Bicolor", total: 45, method: "pix", status: "paid", received: 45 },
  { date: 46096, client: "Daniela Faszank", product: "Top alça única Marrom", total: 40, method: "pix", status: "paid", received: 40 },
  { date: 46096, client: "Daniela Faszank", product: "Conjunto Branco/Preto", total: 150, method: "pix", status: "paid", received: 150 },
  { date: 46097, client: "Ingrid Bandeira", product: "Macaquinho", total: 130, method: "pix", status: "paid", received: 130 },
  { date: 46097, client: "Stefani Biviaschi", product: "Conjunto", total: 95, method: "pix", status: "paid", received: 95 },
  { date: 46097, client: "Ingrid Bandeira", product: "Top", total: 50, method: "pix", status: "paid", received: 50 },
  { date: 46097, client: "Franciele Nunes", product: "Short", total: 50, method: "pix", status: "paid", received: 50 },
  { date: 46097, client: "Eliana Borges", product: "Tops", total: 50, method: "pix", status: "paid", received: 50 },
  { date: 46098, client: "Eliana Borges", product: "Tops", total: 50, method: "pix", status: "paid", received: 50 },
  { date: 46097, client: "Aline Coach", product: "Conjunto", total: 99, method: "pix", status: "paid", received: 99 },
  { date: 46101, client: "Eduarda Yago", product: "Short", total: 50, method: "pix", status: "paid", received: 50 },
  { date: 46112, client: "Mari Feijó", product: "Short Marrom", total: 50, method: "pix", status: "paid", received: 50 },
  { date: 46112, client: "Mari Feijó", product: "Top costas nuas marrom", total: 50, method: "pix", status: "paid", received: 50 },
  { date: 46118, client: "Daniela Faszank", product: "Short Marrom", total: 50, method: "pix", status: "paid", received: 50 },
  { date: 46118, client: "Daniela Faszank", product: "Top tiras marrom", total: 50, method: "pix", status: "paid", received: 50 },
  { date: 46119, client: "Gabriela Osório", product: "Conj. Aline Leg", total: 139, method: "pix", status: "paid", received: 139 },
  { date: 46119, client: "Daniela Faszank", product: "Conj bicolor café", total: 99, method: "pix", status: "paid", received: 99 },
  { date: 46119, client: "Denise Jorge", product: "Leg Cintia Plus", total: 95, method: "pix", status: "paid", received: 95 },
  { date: 46119, client: "Denise Jorge", product: "Conj. Lorena Plus", total: 189, method: "pix", status: "paid", received: 189 },
  { date: 46119, client: "Denise Jorge", product: "Macaquinho Plus", total: 189, method: "pix", status: "paid", received: 189 },
  { date: 46126, client: "Fernanda", product: "Macacão Luna Bicolor Bege", total: 199, method: "pix", status: "paid", received: 199 },
  { date: 46126, client: "Fernanda", product: "Macacão Amanda marrom", total: 179, method: "pix", status: "paid", received: 179 },
  { date: 46126, client: "Fernanda", product: "Macaquinho Rosa", total: 149, method: "pix", status: "paid", received: 149 },
  { date: 46126, client: "Fernanda", product: "Conj. Promoção Uva", total: 99, method: "pix", status: "paid", received: 99 },
  { date: 46126, client: "Fernanda", product: "Macaquinho Fabi Bicolor", total: 129, method: "pix", status: "paid", received: 129 },
  { date: 46126, client: "Daniela Faszank", product: "Macaquinho Areia", total: 99, method: "pix", status: "paid", received: 99 },
  { date: 46126, client: "Daniela Faszank", product: "Macaquinho Fabi Bicolor", total: 129, method: "pix", status: "paid", received: 129 },
  { date: 46126, client: "Jéssica Rodzinski", product: "Macaquinho Fabi Bicolor AZUL", total: 129, method: "pix", status: "paid", received: 129 },
  { date: 46135, client: "Mari Feijó", product: "Conj. Promoção Amarelo", total: 99, method: "pix", status: "paid", received: 99 },
  { date: 46138, client: "Gabriela Becker", product: "Macaquinho Fabi Bicolor marrom", total: 129, method: "pix", status: "paid", received: 129 },
  { date: 46138, client: "Franciele Nunes", product: "Top Cintia Plus", total: 90, method: "pix", status: "paid", received: 90 },
  { date: 46138, client: "Presente / Sem cadastro", product: "Macaquinho Fabi MARINHO", total: 129, method: "pix", status: "paid", received: 129 },
  { date: 46138, client: "Heidy", product: "Macacão Amanda Compressão Preto", total: 179, method: "pix", status: "paid", received: 179 },
  { date: 46144, client: "Ingrid Bandeira", product: "Legging Preta", total: 89, method: "pix", status: "paid", received: 89 },
  { date: 46145, client: "Ingrid Bandeira", product: "Top Uills preto", total: 59, method: "pix", status: "paid", received: 59 },
  { date: 46149, client: "Daniela Faszank", product: "Macaquinho Cinza c/Rosa + Top Side + Macacão Amanda + Legging Preta", total: 400, method: "pix", status: "paid", received: 400, notes: "4 itens — total 437 com desconto de 37" },
  { date: 46158, client: "Fernanda Brusque", product: "Conj Fernanda Laranja", total: 179, method: "pix", status: "paid", received: 179 },
  { date: 46158, client: "Fernanda Brusque", product: "Conj Fernanda Azul", total: 179, method: "pix", status: "paid", received: 179 },
  { date: 46156, client: "Eduarda Vargas", product: "Conj Aline Vermelho", total: 149, method: "pix", status: "paid", received: 149 },
  { date: 46156, client: "Eduarda Vargas", product: "Conj turquesa", total: 149, method: "pix", status: "paid", received: 149 },
  { date: 46160, client: "Franciele Nunes", product: "Macacão Flare Azul", total: 199, method: "pix", status: "partial", received: 99.5 },
  { date: 46162, client: "Débora Brasil", product: "Macacão Flare Bege", total: 199, method: "pix", status: "partial", received: 100 },
  { date: 46162, client: "Luiza Costa", product: "Macacão Flare Cinza", total: 199, method: "pix", status: "paid", received: 199 },
  { date: 46162, client: "Eduarda Vargas", product: "Macacão Flare Verde", total: 199, method: "pix", status: "paid", received: 199 },
  { date: 46162, client: "Jo Borin", product: "Conj legg e top Jasmin ROSE", total: 170, method: "pix", status: "partial", received: 100 },
  { date: 46172, client: "Eduarda Yago", product: "Conj shorts duplo ziper e top BEGE", total: 160, method: "pix", status: "partial", received: 80 },
  { date: 46172, client: "Fran Pablo", product: "Casaco Slim C/ capuz Verde", total: 149, method: "pix", status: "paid", received: 149 },
  { date: 46172, client: "Fran Pablo", product: "Conjunto Marrom Top grande", total: 170, method: "pix", status: "paid", received: 170 },
  { date: 46172, client: "Jade Rodrigues", product: "Conjunto Flare Marrom", total: 199, method: "pix", status: "paid", received: 199 },
  { date: 46172, client: "Jade Rodrigues", product: "Casaco Slim Longo Preto P/M", total: 149, method: "pix", status: "paid", received: 149 },
  { date: 46172, client: "Jade Rodrigues", product: "Conjunto Shorts Preto+Top", total: 100, method: "pix", status: "paid", received: 100 },
  { date: 46172, client: "Luiza Costa", product: "Casaco Plush Off white", total: 299, method: "pix", status: "paid", received: 299 },
  { date: 46172, client: "Luiza Costa", product: "Casaco slim curto Marrom", total: 149, method: "pix", status: "paid", received: 149 },
  { date: 46172, client: "Virginia", product: "Conj reverse cut Preto", total: 119, method: "pix", status: "paid", received: 119 },
  { date: 46172, client: "Virginia", product: "Casaquinho", total: 149, method: "pix", status: "paid", received: 149 },
  { date: 46172, client: "Daniela Faszank", product: "Casaco Slim curto Preto", total: 149, method: "caderno", status: "pending", received: 0 },
  { date: 46172, client: "Daniela Faszank", product: "Macacão Open Back Azul", total: 150, method: "caderno", status: "pending", received: 0 },
  { date: 46172, client: "Daniela Faszank", product: "Macaquinho Preto Canelado", total: 100, method: "caderno", status: "pending", received: 0 },
  { date: 46172, client: "Camila", product: "Macacão Rib fit canelado Azul", total: 140, method: "pix", status: "paid", received: 140 },
  { date: 46172, client: "Camila", product: "Conj Rosa Canelado", total: 120, method: "pix", status: "paid", received: 120 },
  { date: 46179, client: "Karen RH", product: "Casaco Slim longo Branco", total: 149, method: "pix", status: "paid", received: 149 },
  { date: 46179, client: "Karen RH", product: "Casaco Slim longo Cinza", total: 149, method: "pix", status: "paid", received: 149 },
  { date: 46179, client: "Karen RH", product: "Top Tela Poliamida Cinza", total: 75, method: "pix", status: "paid", received: 75 },
  { date: 46179, client: "Julia Heffner", product: "Casaco Slim curto Azul", total: 149, method: "link", status: "paid", received: 141.58, notes: "Venda por link de pagamento - taxa descontada" },
  { date: 46184, client: "Fernanda Brusque", product: "Conjunto Flare Zara Azul", total: 199, method: "caderno", status: "pending", received: 0, notes: "vai pagar em 2x" },
  { date: 46184, client: "Fernanda Brusque", product: "Conjunto Flare Zara Verde", total: 199, method: "caderno", status: "pending", received: 0 },
  { date: 46184, client: "Fernanda Brusque", product: "Conjunto Flare Zara Nude", total: 199, method: "caderno", status: "pending", received: 0 },
  { date: 46188, client: "Débora Brasil", product: "Conjunto Flare Verde", total: 199, method: "caderno", status: "pending", received: 0, notes: "vai pagar em 2x - pagar 200 dia 05/07" },
  { date: 46190, client: "Stephanie Daitx", product: "Legging Poliamida Cinza", total: 110, method: "pix", status: "paid", received: 110 },
  { date: 46190, client: "Stephanie Daitx", product: "Jaqueta Jessi", total: 149, method: "pix", status: "paid", received: 149 },
  { date: 46190, client: "Luciana", product: "Macacão Open Back Verde militar", total: 75, method: "pix", status: "paid", received: 75 },
  { date: 46190, client: "Luciana", product: "Calça Legging Elite Fit 2.0 Off white", total: 109, method: "pix", status: "paid", received: 109 },
  { date: 46190, client: "Helen", product: "Conjunto Flare Azul", total: 189, method: "link", status: "paid", received: 189 },
  { date: 46190, client: "Francine Pablo", product: "Macacão Open Back Bordô", total: 150, method: "caderno", status: "partial", received: 0 },
  { date: 46190, client: "Gabriela Becker", product: "Zip Back Sculpt Preto", total: 150, method: "caderno", status: "partial", received: 75 },
  { date: 46191, client: "Maria Eduarda Pereira", product: "Calça Legging Elite Fit 2.0 Preto", total: 119, method: "pix", status: "paid", received: 119 },
  { date: 46191, client: "Mari Feijó", product: "Calça Elite Prime 2.0 Preto", total: 109, method: "pix", status: "paid", received: 109 },
  { date: 46191, client: "Denise Jorge", product: "Jaqueta Cozy Balance", total: 120, method: "pix", status: "pending", received: 0, notes: "PENDENTE DE CONFIRMAÇÃO" },
  { date: 46191, client: "Denise Jorge", product: "Jaqueta Duo Preta G", total: 299, method: "pix", status: "pending", received: 0, notes: "PENDENTE DE CONFIRMAÇÃO" },
  { date: 46191, client: "Thame Melo", product: "Legging bolso faca", total: 100, method: "pix", status: "pending", received: 0, notes: "PENDENTE DE CONFIRMAÇÃO" },
  { date: 46191, client: "Thame Melo", product: "Macaquinho Zíper Preto", total: 140, method: "pix", status: "pending", received: 0, notes: "PENDENTE DE CONFIRMAÇÃO" },
];

export async function POST() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const results = { products: 0, expenses: 0, sales: 0, clients: 0, errors: [] as string[] };

  // ── CATEGORIAS ──
  const catSet = new Set(PRODUCTS_RAW.map(p => inferCategory(p.name, p.cat)));
  const catMap: Record<string, string> = {};
  for (const name of catSet) {
    const slug = slugify(name);
    const cat = await prisma.category.upsert({
      where: { slug }, update: {}, create: { name, slug },
    });
    catMap[name] = cat.id;
  }

  // ── VENDA MANUAL ──
  const firstCatId = Object.values(catMap)[0];
  await prisma.product.upsert({
    where: { slug: "venda-manual" },
    update: {},
    create: { name: "Venda Manual", slug: "venda-manual", price: 0, stock: 999, active: false, categoryId: firstCatId },
  });

  // ── PRODUTOS ──
  let skuCounter = 1;
  for (const p of PRODUCTS_RAW) {
    try {
      const catName = inferCategory(p.name, p.cat);
      const prefix = SKU_PREFIX[catName] || "XX";
      const sku = `${prefix}${String(skuCounter).padStart(3, "0")}`;
      skuCounter++;
      const slug = slugify(`${p.name}-${p.size || "unico"}`);
      const sizes = p.size && p.size.toUpperCase() !== "ÚNICO" ? JSON.stringify([p.size]) : JSON.stringify([]);
      const categoryId = catMap[catName] || firstCatId;

      await prisma.product.upsert({
        where: { slug },
        update: { price: p.price, costPrice: p.cost, stock: p.qty, sizes, active: true, sku, supplierCode: p.sc },
        create: { name: p.name, slug, price: p.price, costPrice: p.cost, stock: p.qty, sizes, active: true, sku, supplierCode: p.sc, categoryId },
      });
      results.products++;
    } catch (e: any) {
      results.errors.push(`Produto "${p.name}": ${e.message}`);
    }
  }

  // ── GASTOS ──
  for (const e of EXPENSES_DATA) {
    try {
      const supplier = await prisma.supplier.upsert({
        where: { name: e.supplier }, update: {}, create: { name: e.supplier },
      });
      await prisma.expense.create({
        data: {
          date: excelDateToJS(e.date), description: e.desc,
          amount: e.value, category: e.cat, paymentMethod: e.method,
          supplierId: supplier.id,
          notes: e.fatura ? `Fatura cartão: ${e.fatura}` : null,
        },
      });
      results.expenses++;
    } catch (e: any) {
      results.errors.push(`Gasto: ${e.message}`);
    }
  }

  // ── VENDAS ──
  const vendaManual = await prisma.product.findFirst({ where: { slug: "venda-manual" } });
  if (vendaManual) {
    for (const s of SALES_DATA) {
      try {
        let user = await prisma.user.findFirst({
          where: { name: { equals: s.client.trim(), mode: "insensitive" }, role: "customer" },
        });
        if (!user) {
          user = await prisma.user.create({
            data: { name: s.client.trim(), email: `${slugify(s.client)}.${Date.now()}@cliente.accessfit.com.br`, role: "customer" },
          });
          results.clients++;
        }
        const order = await prisma.order.create({
          data: {
            userId: user.id, status: "delivered",
            paymentMethod: s.method,
            paymentStatus: s.status === "paid" ? "paid" : s.status === "partial" ? "partial" : "pending",
            amountPaid: s.received || 0, total: s.total, subtotal: s.total,
            shipping: 0, discount: 0, notes: (s as any).notes || null,
            createdAt: excelDateToJS(s.date), installmentCount: 1,
            items: { create: [{ productId: vendaManual.id, quantity: 1, price: s.total, size: s.product }] },
          },
        });
        if (s.received > 0) {
          await prisma.payment.create({
            data: { orderId: order.id, amount: s.received, paymentMethod: s.method, receivedAt: order.createdAt },
          });
        }
        results.sales++;
      } catch (e: any) {
        results.errors.push(`Venda ${s.client}: ${e.message}`);
      }
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
