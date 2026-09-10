/**
 * Registro da sacola antes de virar pedido.
 *
 * A cliente e anonima enquanto navega: o site so descobre quem ela e quando
 * ela digita nome e telefone no checkout. Entao a mesma linha serve para dois
 * momentos — primeiro como interesse sem nome, depois como contato para voce
 * chamar no WhatsApp.
 *
 * Uma linha por visita, identificada por um id sorteado no navegador.
 */
const CHAVE = "accessfit_visita";

export function idDaVisita(): string {
  if (typeof window === "undefined") return "";
  try {
    const guardado = localStorage.getItem(CHAVE);
    if (guardado) return guardado;
    const novo = (crypto?.randomUUID?.() || `v${Date.now()}${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(CHAVE, novo);
    return novo;
  } catch {
    // Navegador sem armazenamento: a sacola nao e registrada, e a loja
    // continua funcionando normalmente
    return "";
  }
}

export type ItemRegistrado = {
  nome: string;
  slug?: string;
  cor?: string;
  tamanho?: string;
  peca?: string;
  quantidade: number;
  preco: number;
};

/** Manda a sacola para o servidor sem travar a tela nem quebrar a compra. */
export function registrarSacola(dados: {
  itens: ItemRegistrado[];
  total: number;
  nome?: string;
  telefone?: string;
  email?: string;
}) {
  const sessionId = idDaVisita();
  if (!sessionId) return;
  fetch("/api/carrinho", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, ...dados }),
    keepalive: true,
  }).catch(() => {});
}
