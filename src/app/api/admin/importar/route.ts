export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { slugify } from "@/lib/utils";

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function col(row: Record<string, unknown>, ...keys: string[]): string {
  const normRow: Record<string, unknown> = {};
  for (const k of Object.keys(row)) normRow[norm(k)] = row[k];
  for (const k of keys) {
    const v = normRow[norm(k)];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function parsePrice(raw: string) {
  return parseFloat(raw.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", "."));
}

type GroupedProduct = {
  nome: string;
  categoria: string;
  categoryId: string;
  preco: number;
  custo: number | null;
  estoque: number;
  tamanhos: string[];
  descricao: string;
  imagem: string;
  rows: number[];
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rows.length === 0)
    return NextResponse.json({ error: "Planilha vazia ou formato inválido." }, { status: 400 });

  const categories = await prisma.category.findMany();
  const catMap = Object.fromEntries(categories.map(c => [norm(c.name), c.id]));

  const results = [];
  // Agrupa produtos pelo nome — linhas com mesmo nome = mesmo produto com tamanhos diferentes
  const grouped = new Map<string, GroupedProduct>();
  const rowErrors: { row: number; name: string; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const nome = col(row, "Produto", "produto", "nome", "Nome").replace(/\s+/g, " ").trim();
    const categoria = col(row, "Categoria", "categoria");
    const preco = parsePrice(col(row, "Preco venda", "Preço venda", "Preço Venda", "preco venda", "Valor venda", "Preço"));
    const custo = parsePrice(col(row, "Preco unitario", "Preço unitário", "Preço Unitário", "preco unitario", "custo")) || null;

    if (!nome) { rowErrors.push({ row: rowNum, name: "(vazio)", message: "Coluna 'Produto' obrigatória" }); continue; }
    if (!categoria) { rowErrors.push({ row: rowNum, name: nome, message: "Coluna 'Categoria' obrigatória" }); continue; }
    if (isNaN(preco) || preco <= 0) {
      const raw = col(row, "Preco venda", "Preço venda", "Preço Venda", "preco venda", "Valor venda", "Preço");
      rowErrors.push({ row: rowNum, name: nome, message: `Preço inválido: "${raw || "(vazio)"}"` }); continue;
    }
    const categoryId = catMap[norm(categoria)];
    if (!categoryId) { rowErrors.push({ row: rowNum, name: nome, message: `Categoria "${categoria}" não encontrada` }); continue; }

    const tamanhoRaw = col(row, "Tamanho", "tamanho", "tamanhos", "Tamanhos") || "";
    const tamanho = tamanhoRaw.toUpperCase().trim();
    const estoque = parseInt(col(row, "Qtd Estoque", "qtd estoque", "Estoque", "estoque", "quantidade").replace(",", "")) || 0;
    const descricao = col(row, "Descricao", "Descrição", "descricao", "Observacao");
    const imagem = col(row, "imagem", "Imagem", "foto", "Foto");

    const key = norm(nome);
    if (grouped.has(key)) {
      const g = grouped.get(key)!;
      // Adiciona tamanho se for novo e não for ÚNICO
      if (tamanho && tamanho !== "ÚNICO" && tamanho !== "UNICO" && !g.tamanhos.includes(tamanho)) {
        g.tamanhos.push(tamanho);
      }
      g.estoque += estoque;
      g.rows.push(rowNum);
      // Usa o maior preço de venda se houver variação
      if (preco > g.preco) g.preco = preco;
    } else {
      const tamanhos = (tamanho && tamanho !== "ÚNICO" && tamanho !== "UNICO") ? [tamanho] : [];
      grouped.set(key, { nome, categoria, categoryId, preco, custo, estoque, tamanhos, descricao, imagem, rows: [rowNum] });
    }
  }

  // Erros de validação
  for (const e of rowErrors) {
    results.push({ row: e.row, name: e.name, status: "erro", message: e.message });
  }

  // Cria ou atualiza produtos agrupados
  for (const [, g] of grouped) {
    const slug = slugify(g.nome);
    const existing = await prisma.product.findFirst({ where: { OR: [{ slug }, { name: g.nome }] } });

    try {
      if (existing) {
        // Atualiza: soma estoque, mescla tamanhos
        const existingSizes: string[] = JSON.parse(existing.sizes || "[]");
        const mergedSizes = [...new Set([...existingSizes, ...g.tamanhos])];
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            stock: existing.stock + g.estoque,
            price: g.preco,
            costPrice: g.custo,
            sizes: JSON.stringify(mergedSizes),
            // Planilha que soma estoque é reposição como qualquer outra: a
            // mercadoria é nova, então o relógio do SALE recomeça aqui também.
            ...(g.estoque > 0 ? { restockedAt: new Date() } : {}),
          },
        });
        results.push({ row: g.rows.join("+"), name: g.nome, status: "atualizado", message: `Estoque somado (+${g.estoque})` });
      } else {
        await prisma.product.create({
          data: {
            name: g.nome,
            slug,
            description: g.descricao || null,
            price: g.preco,
            costPrice: g.custo,
            compareAt: null,
            images: JSON.stringify(g.imagem ? [g.imagem] : []),
            sizes: JSON.stringify(g.tamanhos),
            colors: JSON.stringify([]),
            stock: g.estoque,
            featured: false,
            active: true,
            categoryId: g.categoryId,
          },
        });
        results.push({ row: g.rows.join("+"), name: g.nome, status: "ok" });
      }
    } catch (e: any) {
      results.push({ row: g.rows[0], name: g.nome, status: "erro", message: e.message?.slice(0, 80) });
    }
  }

  return NextResponse.json({ results });
}
