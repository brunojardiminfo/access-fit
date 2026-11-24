import { getSaleInfo, paradaDesde } from "@/lib/saleHelper";
import { blackNovemberAtiva, chamadaDePrazo, diasRestantes } from "@/lib/blackNovember";

/**
 * O que vale postar hoje, lido do que a loja sabe.
 *
 * POR QUE ISTO NÃO É UM CALENDÁRIO DE CONTEÚDO. Calendário genérico ("segunda:
 * motivacional") envelhece em duas semanas e vira mais uma coisa para
 * lembrar. Aqui cada ideia nasce de um fato do banco — a peça entrou em
 * promoção, restam duas, está parada há 400 dias — e some sozinha quando o
 * fato deixa de ser verdade.
 *
 * URGÊNCIA SÓ QUANDO É VERDADE. "Últimas unidades" só aparece com estoque de
 * 1 ou 2 de verdade; "último dia" só no último dia. Urgência inventada é o
 * que a seguidora aprende a ignorar primeiro, e depois a verdadeira também
 * não funciona.
 */

export type PecaDaPauta = {
  id: string; name: string; slug: string; price: number; images: string;
  stock: number; createdAt: Date | string; restockedAt: Date | string | null;
  onSale?: boolean; saleDiscount?: number | null; saleBlocked?: boolean;
  category?: { name: string } | null;
};

/**
 * A hora do dia em que a ideia serve.
 *
 * Os três stories do dia têm trabalhos diferentes: de manhã a peça (vender),
 * de tarde a conversa (é o que faz o Instagram continuar entregando os teus
 * stories), de noite o movimento (provar que a loja está viva). Uma lista
 * solta de dez ideias boas faz procurar; três decisões, não.
 */
export type Momento = "manha" | "tarde" | "noite";

export type Ideia = {
  tipo: "promo" | "ultimas" | "nova" | "parada" | "prazo" | "bastidor" | "interacao" | "movimento";
  momento: Momento;
  etiqueta: string;
  /** O fato que sustenta a ideia, com número. É o que torna a ideia honesta. */
  porque: string;
  /** Pronto para copiar e colar no story. */
  texto: string;
  peca?: PecaDaPauta;
  /** As duas peças da enquete, quando a ideia é "esse ou esse". */
  duelo?: { a: PecaDaPauta; b: PecaDaPauta };
  /** Quanto isto merece ir primeiro. */
  peso: number;
};

const DIA = 86400000;

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function precoDe(p: PecaDaPauta) {
  const info = getSaleInfo({
    price: p.price, onSale: p.onSale, saleDiscount: p.saleDiscount ?? null,
    saleBlocked: p.saleBlocked, createdAt: p.createdAt, restockedAt: p.restockedAt ?? null,
  });
  return { preco: info ? info.salePrice : p.price, desconto: info ? info.discount : 0 };
}

/**
 * Bastidores: as ideias que não dependem de peça.
 *
 * Giram pelo dia do mês em vez de sorteio, para a pauta de hoje ser a mesma
 * se ele abrir a tela duas vezes — pauta que muda a cada F5 não dá para
 * planejar.
 */
/**
 * Conversa da tarde: o que faz a seguidora TOCAR no story.
 *
 * Enquete e caixinha não vendem direto, e é por isso que entram: o Instagram
 * entrega mais story de quem responde, então o post da manhã seguinte alcança
 * mais gente. Sem isso, a loja fala sozinha.
 */
const INTERACOES: { etiqueta: string; texto: string; duelo?: boolean }[] = [
  { etiqueta: "Enquete", texto: "Qual dessas duas você levaria? 👇 (a mais votada eu posto amanhã com um mimo)", duelo: true },
  { etiqueta: "Caixinha", texto: "Me diz teu objetivo que eu monto teu look 💛 Caixinha aberta — respondo uma por uma." },
  { etiqueta: "Dúvida de tamanho", texto: "Ficou na dúvida do tamanho? Me manda sua altura e peso que eu te digo exatamente qual serve melhor em você. Acerto em cheio, sem troca." },
  { etiqueta: "Esse ou esse", texto: "ESSE ou ESSE? Responde na enquete 👆 Quem acertar o mais votado ganha um desconto extra hoje.", duelo: true },
  { etiqueta: "Prova em casa", texto: "Sabia que dá pra provar em casa antes de decidir? Você escolhe as peças, experimenta com calma e fica só com o que amar. Chama aqui que eu explico 💛" },
  { etiqueta: "Pergunta aberta", texto: "O que você MAIS quer encontrar aqui e ainda não achou? Responde que eu levo pro próximo pedido 👀" },
];

/**
 * Movimento da noite: a prova de que a loja é real.
 *
 * É o conteúdo mais fácil de fazer — foto do que já está acontecendo — e o que
 * mais constrói confiança em quem ainda não comprou.
 */
const MOVIMENTOS: { etiqueta: string; texto: string }[] = [
  { etiqueta: "Pedidos do dia", texto: "Separando os pedidos de hoje por aqui ✨ Cada peça conferida uma a uma antes de sair." },
  { etiqueta: "Print de cliente", texto: "Print do feedback de quem já está usando 💛 Nada que eu falar vende mais que isso." },
  { etiqueta: "Esgotou", texto: "ESGOTOU 🏃‍♀️ Quem avisou, avisou. Me chama pra saber se volta." },
  { etiqueta: "Entrega", texto: "Pedido feito hoje até as 18h eu já separo. Porto Alegre recebe rapidinho 🚚" },
  { etiqueta: "Bastidor", texto: "Fim de dia por aqui. Obrigada a cada uma que confiou hoje 💛" },
  { etiqueta: "Contagem", texto: "Última chamada do dia! Quem tá na dúvida, me chama que eu seguro pra você até amanhã 💛" },
];


/**
 * As duas peças da enquete: mesma categoria, peças diferentes.
 *
 * MESMA CATEGORIA É O QUE FAZ A PERGUNTA TER RESPOSTA. "Legging preta ou
 * legging verde" é escolha; "legging ou top" não é — as duas servem para
 * coisas diferentes, e a seguidora trava em vez de votar.
 *
 * Escolhe a categoria com mais peças, que é onde a dúvida realmente existe, e
 * gira o par pelo dia do mês: a enquete de hoje é a mesma se ele abrir a tela
 * duas vezes, e a de amanhã é outra sem ele precisar pedir.
 *
 * Devolve nada quando nenhuma categoria tem duas peças com foto — e aí a
 * pauta cai para outra conversa, em vez de oferecer um botão que dá erro.
 */
function duploDaEnquete(pecas: PecaDaPauta[], agora: Date): { a: PecaDaPauta; b: PecaDaPauta } | null {
  const porCategoria = new Map<string, PecaDaPauta[]>();
  for (const p of pecas) {
    const c = p.category?.name?.trim();
    if (!c) continue;
    porCategoria.set(c, [...(porCategoria.get(c) || []), p]);
  }

  const candidatas = [...porCategoria.values()]
    .filter(l => l.length >= 2)
    .sort((x, y) => y.length - x.length);
  if (!candidatas.length) return null;

  const dia = new Date(agora).getUTCDate();
  const grupo = candidatas[dia % candidatas.length];
  // ordem estável (pelo id) para o par não dançar entre dois F5
  const ordenado = [...grupo].sort((x, y) => x.id.localeCompare(y.id));
  const i = dia % ordenado.length;
  const j = (i + 1 + Math.floor(dia / ordenado.length)) % ordenado.length;
  return { a: ordenado[i], b: ordenado[j === i ? (i + 1) % ordenado.length : j] };
}

export function montarPauta(pecas: PecaDaPauta[], agora: Date = new Date()): Ideia[] {
  const ideias: Ideia[] = [];
  const visiveis = pecas.filter(p => p.stock > 0);

  // ── prazo: só quando a data aperta de verdade ──
  if (blackNovemberAtiva(agora)) {
    const faltam = diasRestantes(agora);
    if (faltam <= 3) {
      ideias.push({
        tipo: "prazo",
        etiqueta: faltam <= 1 ? "Último dia" : `Faltam ${faltam} dias`,
        porque: `A Black November termina dia 30. ${faltam <= 1 ? "É hoje." : `Faltam ${faltam} dias.`}`,
        texto: faltam <= 1
          ? "ÚLTIMO DIA de Black November 🖤 Depois de hoje os preços voltam ao normal. Corre que ainda dá tempo!"
          : `Faltam ${faltam} dias de Black November 🖤 Depois disso os preços voltam. Não deixa pra última hora!`,
        momento: "manha", peso: 100,
      });
    }
  }

  // ── últimas unidades: urgência que é fato ──
  for (const p of visiveis.filter(p => p.stock <= 2)) {
    const { preco, desconto } = precoDe(p);
    ideias.push({
      tipo: "ultimas",
      etiqueta: p.stock === 1 ? "Última peça" : "Últimas 2",
      porque: `Resta${p.stock === 1 ? "" : "m"} ${p.stock} no estoque.`,
      texto: p.stock === 1
        ? `ÚLTIMA peça da ${p.name.trim()} 🏃‍♀️ É a última mesmo — quando sair, acabou. ${moeda(preco)}${desconto ? ` (de ${moeda(p.price)})` : ""}`
        : `Restam só 2 da ${p.name.trim()}! ${moeda(preco)}${desconto ? ` (de ${moeda(p.price)})` : ""} — me chama antes que acabe 💛`,
      peca: p, momento: "manha" as const, peso: 80 + (p.stock === 1 ? 5 : 0),
    });
  }

  // ── promoção: o preço caiu, e isso é notícia ──
  for (const p of visiveis) {
    const { preco, desconto } = precoDe(p);
    if (desconto >= 20 && p.stock > 2) {
      ideias.push({
        tipo: "promo",
        etiqueta: `${desconto}% OFF`,
        porque: `De ${moeda(p.price)} por ${moeda(preco)} — ${desconto}% de desconto.`,
        texto: `${p.name.trim()} com ${desconto}% OFF 🖤 De ${moeda(p.price)} por ${moeda(preco)}. Black November até dia 30!`,
        peca: p, momento: "manha" as const, peso: 60 + Math.min(desconto, 50) / 5,
      });
    }
  }

  // ── novidade: chegou nos últimos 14 dias ──
  for (const p of visiveis) {
    const nascida = new Date(p.createdAt).getTime();
    const dias = Math.floor((agora.getTime() - nascida) / DIA);
    if (dias <= 14) {
      const { preco } = precoDe(p);
      ideias.push({
        tipo: "nova",
        etiqueta: "Novidade",
        porque: `Entrou no catálogo há ${dias === 0 ? "menos de um dia" : `${dias} dia${dias === 1 ? "" : "s"}`}.`,
        texto: `CHEGOU 🤍 ${p.name.trim()} — ${moeda(preco)}. ${p.category?.name ? `Nova na linha de ${p.category.name.toLowerCase()}.` : ""} Quer ver em você? Me chama.`,
        peca: p, momento: "manha" as const, peso: 70,
      });
    }
  }

  // ── parada: merece aparecer de novo ──
  for (const p of visiveis) {
    /**
     * Há quantos dias a peça está parada. Conta da reposição, igual ao painel
     * de liquidação — mas pela data direto, porque a pauta não sabe o custo da
     * peça (nem precisa saber) e `diasParada` exige a peça inteira.
     */
    const parada = Math.max(0, Math.floor((agora.getTime() - paradaDesde(p).getTime()) / DIA));
    const { preco, desconto } = precoDe(p);
    if (parada >= 120 && desconto > 0) {
      ideias.push({
        tipo: "parada",
        etiqueta: "Merece uma chance",
        porque: `Parada há ${parada} dias e hoje está com ${desconto}% off.`,
        texto: `Essa aqui é injustiçada 👀 ${p.name.trim()} com ${desconto}% OFF — ${moeda(preco)}. Quem leva não larga mais.`,
        peca: p, momento: "manha" as const, peso: 40,
      });
    }
  }

  /**
   * A conversa e o movimento do dia, girando pela data.
   *
   * Pela data e não por sorteio: a pauta de hoje tem que ser a mesma se ele
   * abrir a tela duas vezes. Pauta que muda a cada F5 não dá para planejar.
   */
  const dia = new Date(agora).getUTCDate();
  const duelo = duploDaEnquete(visiveis, agora);

  /**
   * As conversas giram pela data, mas as de enquete só entram se houver par.
   * Oferecer "qual dessas duas" sem as duas peças daria um botão que falha.
   */
  const conversas = INTERACOES.filter(i => !i.duelo || duelo);
  const inter = conversas[dia % conversas.length];
  ideias.push({ tipo: "interacao", momento: "tarde", etiqueta: inter.etiqueta,
    porque: inter.duelo && duelo
      ? `${duelo.a.category?.name ?? "A mesma categoria"}: duas peças parecidas o bastante para a escolha ser real. A imagem da enquete já sai montada.`
      : "O Instagram entrega mais story de quem responde — é isto que faz o post de amanhã alcançar mais gente.",
    texto: inter.texto, peso: 50,
    duelo: inter.duelo ? duelo ?? undefined : undefined });

  const mov = MOVIMENTOS[dia % MOVIMENTOS.length];
  ideias.push({ tipo: "movimento", momento: "noite", etiqueta: mov.etiqueta,
    porque: "Prova de que a loja está viva. É o conteúdo mais fácil de fazer e o que mais constrói confiança.",
    texto: mov.texto, peso: 45 });

  /**
   * Uma peça não aparece duas vezes na pauta.
   *
   * A mesma legging pode ser "últimas 2" E "40% off" E "parada há 300 dias".
   * Postar as três seria a mesma peça três vezes no mesmo dia, e a seguidora
   * lê isso como loja sem novidade. Fica o motivo mais forte.
   */
  const porPeca = new Map<string, Ideia>();
  const soltas: Ideia[] = [];
  for (const i of ideias.sort((a, b) => b.peso - a.peso)) {
    if (!i.peca) { soltas.push(i); continue; }
    if (!porPeca.has(i.peca.id)) porPeca.set(i.peca.id, i);
  }
  return [...soltas, ...porPeca.values()].sort((a, b) => b.peso - a.peso);
}

export { chamadaDePrazo };
