import { prisma } from "@/lib/prisma";

/**
 * Modelos de mensagem por tipo de tarefa.
 *
 * O botao "Chamar" nao envia nada sozinho: ele abre o WhatsApp no seu celular
 * com o texto ja escrito, e quem aperta enviar e voce. Por isso nao ha template
 * aprovado pela Meta aqui e nao ha risco de bloqueio — para o WhatsApp e uma
 * mensagem sua, digitada por voce.
 */

export type Variaveis = {
  nome?: string | null;
  peca?: string | null;
  valor?: string | null;
  pedido?: string | null;
  cupom?: string | null;
  dias?: number | null;
};

export const TIPOS_DE_TAREFA: { kind: string; titulo: string; emoji: string }[] = [
  { kind: "carrinho", titulo: "Carrinho abandonado", emoji: "🛒" },
  { kind: "cobranca", titulo: "Cobrar pagamento", emoji: "💰" },
  { kind: "pos24h", titulo: "Agradecer a compra", emoji: "💌" },
  { kind: "entrega3d", titulo: "Confirmar que chegou", emoji: "📦" },
  { kind: "feedback7d", titulo: "Pedir foto ou opinião", emoji: "⭐" },
  { kind: "reengaja30d", titulo: "Voltar a conversar", emoji: "🔁" },
  { kind: "aniversario", titulo: "Aniversário hoje", emoji: "🎂" },
  { kind: "aniversario-breve", titulo: "Aniversário chegando", emoji: "🎁" },
  { kind: "espera", titulo: "Chegou o que ela esperava", emoji: "🔔" },
  { kind: "inativa", titulo: "Sumiu", emoji: "🌙" },
  { kind: "vip-frio", titulo: "VIP esfriando", emoji: "👑" },
  { kind: "troca-parada", titulo: "Troca parada", emoji: "🔄" },
];

/** Usados quando voce ainda nao escreveu nenhum modelo para aquele tipo. */
export const MODELOS_PADRAO: Record<string, string[]> = {
  carrinho: [
    "Oi {nome}! Aqui é a Brus, da Access Fit 💛 Vi que você separou {peca} e não finalizou. Ainda tem no seu tamanho, quer que eu guarde?",
    "Oi {nome}, tudo bem? Ficou {peca} no seu carrinho. Posso tirar alguma dúvida sobre tamanho ou caimento?",
  ],
  cobranca: [
    "Oi {nome}! Passando pra lembrar do pedido {pedido}, de {valor}. Te mando a chave Pix de novo?",
    "Oi {nome}, tudo bem? Só confirmando o pagamento do pedido {pedido} ({valor}) pra eu já separar tudo pra você 💛",
  ],
  pos24h: [
    "Oi {nome}! Seu pedido já está separadinho aqui 💛 Qualquer coisa é só me chamar.",
    "{nome}, obrigada pela compra! Já estou cuidando do seu pedido, qualquer dúvida me chama.",
  ],
  entrega3d: [
    "Oi {nome}! Chegou tudo certinho? Serviu bem?",
    "{nome}, passando pra saber se o pedido chegou e se ficou do jeito que você queria 🥰",
  ],
  feedback7d: [
    "Oi {nome}! Já deu pra treinar com {peca}? Se tirar uma foto, eu amo repostar 💛",
    "{nome}, e aí, o que você achou? Sua opinião me ajuda demais.",
  ],
  reengaja30d: [
    "Oi {nome}! Chegaram peças novas que combinam com o que você levou. Quer que eu te mande?",
    "{nome}, saudades! Separei umas novidades no seu tamanho, posso te mostrar?",
  ],
  aniversario: [
    "Parabéns, {nome}! 🎂 Te deixei o cupom {cupom} de presente, 15% até o fim do mês 💛",
    "{nome}, feliz aniversário! Use o cupom {cupom} pra se presentear, 15% até o fim do mês 🎁",
  ],
  "aniversario-breve": [
    "Oi {nome}! Seu aniversário está chegando 🎁 Já separei o cupom {cupom}, 15% até o fim do mês.",
  ],
  espera: [
    "Oi {nome}! Aqui é a Brus, da Access Fit 💛 Chegou {peca}, a que você estava esperando 🔔 Quer que eu separe?",
    "{nome}, repus {peca} no seu tamanho! Guardo pra você?",
  ],
  inativa: [
    "Oi {nome}! Aqui é a Brus, da Access Fit. Faz {dias} dias que a gente não se fala e chegou coisa nova que é a sua cara 💛",
    "{nome}, sumiu! Quer ver as novidades que chegaram?",
  ],
  "vip-frio": [
    "Oi {nome}! Você é uma das nossas clientes queridas 💛 Separei umas peças antes de subir pro site, quer ver?",
  ],
  "troca-parada": [
    "Oi {nome}! Sua troca ainda está em aberto aqui. Me conta como você prefere resolver?",
  ],
};

export function aplicarVariaveis(modelo: string, v: Variaveis): string {
  const primeiro = (v.nome || "").trim().split(/\s+/)[0] || "";
  return modelo
    .replace(/\{nome\}/g, primeiro || "tudo bem")
    .replace(/\{nomeCompleto\}/g, v.nome || "")
    .replace(/\{peca\}/g, v.peca || "a peça")
    .replace(/\{valor\}/g, v.valor || "")
    .replace(/\{pedido\}/g, v.pedido || "")
    .replace(/\{cupom\}/g, v.cupom || "")
    .replace(/\{dias\}/g, v.dias != null ? String(v.dias) : "");
}

/**
 * Escolhe um modelo do tipo pedido. O sorteio e estavel por `semente` (a chave
 * da tarefa): a mesma tarefa mostra sempre o mesmo texto, mas duas clientes no
 * mesmo dia recebem mensagens diferentes.
 */
export function escolherModelo(modelos: string[], semente: string): string {
  if (!modelos.length) return "";
  let soma = 0;
  for (let i = 0; i < semente.length; i++) soma = (soma * 31 + semente.charCodeAt(i)) >>> 0;
  return modelos[soma % modelos.length];
}

export async function modelosPorTipo(): Promise<Record<string, string[]>> {
  const salvos = await prisma.messageTemplate.findMany({ where: { active: true } });
  const mapa: Record<string, string[]> = {};
  for (const m of salvos) (mapa[m.kind] ||= []).push(m.body);
  for (const [kind, padroes] of Object.entries(MODELOS_PADRAO)) {
    if (!mapa[kind]?.length) mapa[kind] = padroes;
  }
  return mapa;
}

/** Numero brasileiro no formato que o wa.me aceita. Devolve null se nao der. */
export function numeroWhats(telefone: string | null | undefined): string | null {
  const digitos = (telefone || "").replace(/\D/g, "");
  if (digitos.length < 10) return null;
  if (digitos.startsWith("55")) return digitos.length >= 12 ? digitos : null;
  return `55${digitos}`;
}

export function linkWhats(telefone: string | null | undefined, texto: string): string | null {
  const numero = numeroWhats(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
