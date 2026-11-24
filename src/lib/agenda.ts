import { bastidorDoDia, type PecaDaPauta } from "@/lib/pauta";

/**
 * A agenda da semana: que categoria em que dia, e o roteiro de cada dia.
 *
 * POR QUE AGENDA E NÃO LISTA DE SUGESTÕES. A tela antiga entregava ideias
 * boas e deixava a escolha com ele — e escolher, todo dia, é o trabalho que
 * fazia o Instagram parar. Aqui o dia já está decidido: ele abre e executa.
 *
 * O QUE É FIXO E O QUE NÃO É. Fixo é o TIPO do dia (segunda é dia de
 * conjuntos) e a forma do roteiro. A PEÇA é resolvida na hora, com o estoque
 * de verdade — uma semana inteira gerada na segunda estaria mentindo na
 * quinta, quando a peça das "últimas 2" já esgotou.
 *
 * CATEGORIA PEQUENA NUNCA VAI SOZINHA. Quatro peças por dia numa categoria de
 * quatro repete toda semana. Jaquetas e Camisetas entram emparelhadas; o
 * sábado não tem categoria, é o dia das campeãs.
 */

export type DiaDaAgenda = {
  /** 0 = domingo, como o JavaScript conta. */
  diaDaSemana: number;
  nome: string;
  /** Vazio no sábado (campeãs) e no domingo (bastidor). */
  categorias: string[];
  tema: string;
  /** Quantas peças o dia pede. */
  pecas: number;
};

export const AGENDA: DiaDaAgenda[] = [
  { diaDaSemana: 0, nome: "Domingo", categorias: [], tema: "Só bastidor", pecas: 0 },
  { diaDaSemana: 1, nome: "Segunda", categorias: ["Conjuntos"], tema: "Dia de conjuntos", pecas: 4 },
  { diaDaSemana: 2, nome: "Terça", categorias: ["Tops", "Camisetas básicas"], tema: "O que usar em cima", pecas: 4 },
  { diaDaSemana: 3, nome: "Quarta", categorias: ["Leggings"], tema: "Dia de legging", pecas: 4 },
  { diaDaSemana: 4, nome: "Quinta", categorias: ["Shorts"], tema: "Dia de short", pecas: 4 },
  { diaDaSemana: 5, nome: "Sexta", categorias: ["Macaquinhos", "Macacão"], tema: "Vestiu e saiu", pecas: 4 },
  { diaDaSemana: 6, nome: "Sábado", categorias: [], tema: "As campeãs da semana", pecas: 4 },
];

/** O dia da agenda, no fuso de Brasília. */
export function diaDaAgenda(agora: Date = new Date()): DiaDaAgenda {
  const brasilia = new Date(agora.getTime() - 3 * 3600000);
  return AGENDA[brasilia.getUTCDay()];
}

export type PassoDoRoteiro = {
  /** 1 a 7: a ordem em que ele posta. */
  slot: number;
  tipo: "abertura" | "peca" | "enquete" | "fechamento" | "conversa";
  etiqueta: string;
  /** O que ele precisa saber para executar sem pensar. */
  instrucao: string;
  texto: string;
  peca?: PecaDaPauta;
  duelo?: { a: PecaDaPauta; b: PecaDaPauta };
  /** Abertura e fechamento têm imagem própria, com o logo da loja. */
  capa?: { sobretitulo: string; titulo: string; subtitulo: string; chamada: string };
  /** Quando a peça já foi postada há pouco e mesmo assim precisou voltar. */
  avisoDeRepeticao?: string;
};

const DIA = 86400000;
export const DESCANSO_DA_PECA = 14;

/**
 * Escolhe as peças do dia: as que estão há mais tempo fora do ar primeiro.
 *
 * NÃO É SORTEIO. Sorteio devolve a mesma peça duas vezes na semana e some com
 * outra por um mês, e nenhum dos dois é visível para quem está postando. Aqui
 * a ordem é "nunca postada, depois a mais antiga" — o catálogo gira inteiro
 * sozinho, e sem ninguém precisar controlar nada.
 *
 * Quando a categoria é pequena demais para o dia, ele repete a menos recente e
 * DIZ que está repetindo, em vez de fingir que é novidade.
 */
export function pecasDoDia(
  candidatas: PecaDaPauta[],
  ultimoPost: Map<string, Date>,
  quantas: number,
  agora: Date = new Date(),
): { peca: PecaDaPauta; aviso?: string }[] {
  const quando = (p: PecaDaPauta) => ultimoPost.get(p.id)?.getTime() ?? 0;
  const ordenadas = [...candidatas].sort((a, b) => {
    const d = quando(a) - quando(b);
    return d !== 0 ? d : a.id.localeCompare(b.id);
  });

  return ordenadas.slice(0, quantas).map(peca => {
    const t = quando(peca);
    if (!t) return { peca };
    const dias = Math.floor((agora.getTime() - t) / DIA);
    return dias < DESCANSO_DA_PECA
      ? { peca, aviso: `repetindo: foi ao ar há ${dias === 0 ? "menos de um dia" : `${dias} dia${dias === 1 ? "" : "s"}`}` }
      : { peca };
  });
}

/** Duas peças da mesma categoria para a enquete, fora das que já abriram o dia. */
export function duploDoDia(
  candidatas: PecaDaPauta[],
  jaUsadas: Set<string>,
  ultimoPost: Map<string, Date>,
): { a: PecaDaPauta; b: PecaDaPauta } | null {
  const sobra = candidatas.filter(p => !jaUsadas.has(p.id));
  const fonte = sobra.length >= 2 ? sobra : candidatas;
  if (fonte.length < 2) return null;

  const porCategoria = new Map<string, PecaDaPauta[]>();
  for (const p of fonte) {
    const c = p.category?.name?.trim() || "";
    porCategoria.set(c, [...(porCategoria.get(c) || []), p]);
  }
  const grupo = [...porCategoria.values()].filter(l => l.length >= 2).sort((x, y) => y.length - x.length)[0];
  if (!grupo) return null;

  const quando = (p: PecaDaPauta) => ultimoPost.get(p.id)?.getTime() ?? 0;
  const [a, b] = [...grupo].sort((x, y) => quando(x) - quando(y) || x.id.localeCompare(y.id));
  return { a, b };
}

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * O roteiro do dia, numerado na ordem de postar.
 *
 * ABERTURA E FECHAMENTO NÃO SÃO ENFEITE. Sem a abertura, a seguidora cai no
 * meio de quatro fotos de roupa sem saber que é uma sequência e sai na
 * segunda. Sem o fechamento, ela gostou de uma peça e não sabe o que fazer
 * com isso — e "o que fazer com isso" é a venda.
 *
 * A ENQUETE FICA NO 6, não no fim: quem responde faz o Instagram entregar o
 * story de amanhã para mais gente, e no 7 metade já saiu.
 */
export function montarRoteiro(
  dia: DiaDaAgenda,
  doDia: PecaDaPauta[],
  todas: PecaDaPauta[],
  ultimoPost: Map<string, Date>,
  precoDe: (p: PecaDaPauta) => { preco: number; desconto: number },
  agora: Date = new Date(),
): PassoDoRoteiro[] {
  const passos: PassoDoRoteiro[] = [];
  const candidatas = doDia.length ? doDia : todas;

  if (dia.pecas === 0) {
    // Domingo: nenhuma peça. Perfil que vende sete dias por semana cansa.
    return [{
      slot: 1, tipo: "conversa", etiqueta: "Bastidor",
      instrucao: "Um story só, do que está acontecendo: a loja, a separação, o fim de semana. Sem peça, sem preço.",
      texto: bastidorDoDia(agora),
    }];
  }

  passos.push({
    slot: 1, tipo: "abertura", etiqueta: "Abertura",
    instrucao: "Avisa que hoje tem sequência. Sem isso ela cai no meio de quatro fotos sem saber que é um conjunto de stories.",
    texto: dia.categorias.length
      ? `Hoje é dia de ${dia.categorias.join(" e ").toUpperCase()} 🖤 ${candidatas.length} peças pra você escolher. Vem ver 👇`
      : `As campeãs da semana 🏆 O que mais saiu por aqui. Vem ver 👇`,
    capa: dia.categorias.length
      ? {
          sobretitulo: "hoje é dia de",
          titulo: dia.categorias.join(" e "),
          subtitulo: `${candidatas.length} peças pra você escolher`,
          chamada: "VEM VER 👇",
        }
      : {
          sobretitulo: "as campeãs da semana",
          titulo: "o que mais saiu",
          subtitulo: "as que voaram por aqui",
          chamada: "VEM VER 👇",
        },
  });

  const escolhidas = pecasDoDia(candidatas, ultimoPost, dia.pecas, agora);
  escolhidas.forEach(({ peca, aviso }, i) => {
    const { preco, desconto } = precoDe(peca);
    passos.push({
      slot: 2 + i, tipo: "peca", etiqueta: `Peça ${i + 1}`,
      instrucao: desconto > 0
        ? "Imagem pronta. Cola o link do WhatsApp no sticker — com desconto, a dúvida dela é tamanho, não preço."
        : "Imagem pronta. Cola o link do WhatsApp no sticker.",
      texto: desconto > 0
        ? `${peca.name.trim()} com ${desconto}% OFF — ${moeda(preco)} 🖤`
        : `${peca.name.trim()} — ${moeda(preco)} 💛`,
      peca, avisoDeRepeticao: aviso,
    });
  });

  const duelo = duploDoDia(candidatas, new Set(escolhidas.map(e => e.peca.id)), ultimoPost);
  if (duelo) {
    passos.push({
      slot: 2 + escolhidas.length, tipo: "enquete", etiqueta: "Enquete",
      instrucao: "Põe a enquete do Instagram por cima, opções 1 e 2. Quem responde faz o story de amanhã alcançar mais gente.",
      texto: "Qual dessas duas você levaria? 👇 (a mais votada eu posto amanhã com um mimo)",
      duelo,
    });
  }

  passos.push({
    slot: passos.length + 1, tipo: "fechamento", etiqueta: "Fechamento",
    instrucao: "Imagem com o logo. Fecha dizendo o que fazer — ela gostou de uma peça e sem isto não sabe o que fazer com isso.",
    texto: "Gostou de alguma? Me chama no direct que eu te digo o tamanho certo e já separo 💛",
    capa: {
      sobretitulo: "gostou de alguma?",
      titulo: "me chama no direct",
      subtitulo: "eu digo o tamanho certo e já separo",
      // "responde esse story" e não o endereço do site: responder o story ABRE
      // o direct, que é exatamente para onde esta imagem quer levar. O site já
      // está na assinatura embaixo — repetir ali seria dizer duas vezes a
      // mesma coisa e nenhuma vez o que fazer.
      chamada: "RESPONDE ESSE STORY 💛",
    },
  });

  return passos;
}
