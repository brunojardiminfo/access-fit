/**
 * Monta o story 1080×1920 no navegador, em canvas.
 *
 * POR QUE NO NAVEGADOR E NÃO NO SERVIDOR. O Bruno pediu sem custos novos.
 * Desenhar aqui não gasta função da Vercel nem serviço de imagem: o celular
 * dele faz a conta. O Cloudinary serve as fotos com `access-control-allow-origin: *`,
 * então o canvas consegue LER os pixels e exportar o arquivo — sem isso o
 * `toBlob` falharia com o canvas "sujo" e nada disso funcionaria.
 *
 * O ALVO É O COMPARTILHAMENTO DIRETO. O problema dele é procurar a foto na
 * galeria. Gerar a imagem e abrir o menu de compartilhar do celular corta a
 * galeria inteira do caminho: da tela do admin para o Instagram, sem escala.
 */

export type PecaDoStory = {
  nome: string;
  categoria?: string | null;
  foto: string;
  preco: number;
  precoCheio: number;
  desconto: number;
};

const L = 1080, A = 1920;
const OURO = "#e8c766";
const PRETO = "#07060a";

/** Carrega a imagem já pronta para o canvas ler os pixels dela. */
function carregar(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const img = new Image();
    // Sem isto o canvas fica "sujo" e o toBlob lança — a imagem até desenha,
    // mas não dá para exportar, que é justamente o ponto.
    img.crossOrigin = "anonymous";
    img.onload = () => ok(img);
    img.onerror = () => erro(new Error("não deu para carregar a foto"));
    img.src = src;
  });
}

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Texto que não estoura a largura: diminui a fonte até caber. */
function escreverCabendo(
  ctx: CanvasRenderingContext2D, texto: string, x: number, y: number,
  larguraMax: number, tamanhoInicial: number, peso = 900,
) {
  let t = tamanhoInicial;
  do {
    ctx.font = `${peso} ${t}px Inter, system-ui, sans-serif`;
    if (ctx.measureText(texto).width <= larguraMax) break;
    t -= 4;
  } while (t > 28);
  ctx.fillText(texto, x, y);
  return t;
}

type Area = { x: number; y: number; w: number; h: number };

/**
 * A peça INTEIRA dentro da área, sobre uma cópia desfocada dela mesma.
 *
 * Cortar para preencher decapitava a modelo nas fotos verticais — num story
 * que vende roupa, a roupa tem que caber na tela. O desfoque atrás existe só
 * para a sobra não virar faixa preta.
 */
function pecaNaArea(ctx: CanvasRenderingContext2D, foto: HTMLImageElement, area: Area) {
  const escalaFundo = Math.max(area.w / foto.width, area.h / foto.height);
  ctx.save();
  ctx.beginPath(); ctx.rect(area.x, area.y, area.w, area.h); ctx.clip();
  // `filter` do canvas não existe em todo navegador: sem ele o fundo fica só
  // escurecido, que continua legível.
  try { ctx.filter = "blur(36px) brightness(0.45)"; } catch { /* segue sem desfoque */ }
  ctx.drawImage(foto,
    area.x + (area.w - foto.width * escalaFundo) / 2 - 40,
    area.y + (area.h - foto.height * escalaFundo) / 2 - 40,
    foto.width * escalaFundo + 80, foto.height * escalaFundo + 80);
  ctx.filter = "none";

  const escala = Math.min(area.w / foto.width, area.h / foto.height);
  ctx.drawImage(foto,
    area.x + (area.w - foto.width * escala) / 2,
    area.y + (area.h - foto.height * escala) / 2,
    foto.width * escala, foto.height * escala);
  ctx.restore();
}

/**
 * A peça PREENCHENDO a área, cortada só dos lados.
 *
 * Na enquete cada coluna é alta e estreita (540×1060), e a foto é quase
 * quadrada: colocá-la inteira deixava metade da coluna em borrão cinza, e a
 * peça — que é o que se está escolhendo — aparecia pequena no meio. Aqui a
 * escala é mandada pela ALTURA, então o corpo cabe de cima a baixo e o corte
 * acontece nas laterais, onde só tem fundo de estúdio.
 *
 * Quando a foto é alta demais para isso (mais estreita que a coluna), cai no
 * corte vertical puxado para cima, que é onde está o rosto.
 */
function pecaPreenchendo(ctx: CanvasRenderingContext2D, foto: HTMLImageElement, area: Area) {
  const escala = Math.max(area.w / foto.width, area.h / foto.height);
  const larg = foto.width * escala, alt = foto.height * escala;
  ctx.save();
  ctx.beginPath(); ctx.rect(area.x, area.y, area.w, area.h); ctx.clip();
  ctx.drawImage(foto,
    area.x + (area.w - larg) / 2,
    // 35% da sobra em cima e 65% embaixo: corta pé antes de cortar cabeça
    area.y + (area.h - alt) * 0.35,
    larg, alt);
  ctx.restore();
}

/** Logo no canto e o endereço embaixo — o rodapé é igual nos dois formatos. */
function assinatura(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null) {
  if (logo) {
    const d = 112;
    ctx.save();
    ctx.beginPath();
    ctx.arc(L - 64 - d / 2, A - 118 - d / 2, d / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, L - 64 - d, A - 118 - d, d, d);
    ctx.restore();
  }
  ctx.fillStyle = "rgba(246,241,230,0.6)";
  ctx.font = "700 34px Inter, system-ui, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText("ACCESSFIT.COM.BR", 64, A - 92);
  ctx.letterSpacing = "0px";
}

export async function desenharStory(peca: PecaDoStory): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = L; canvas.height = A;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");

  ctx.fillStyle = PRETO;
  ctx.fillRect(0, 0, L, A);

  const [foto, logo] = await Promise.all([
    carregar(peca.foto),
    carregar("/logo-story.png").catch(() => null as any),
  ]);

  /**
   * A peça aparece INTEIRA, sobre ela mesma desfocada.
   *
   * Cortar para preencher decapitava a modelo nas fotos verticais — num story
   * que vende roupa, a roupa tem que caber na tela.
   */
  pecaNaArea(ctx, foto, { x: 0, y: 0, w: L, h: Math.round(A * 0.74) });

  // véu para o texto descolar da foto
  const veu = ctx.createLinearGradient(0, A * 0.50, 0, A);
  veu.addColorStop(0, "rgba(7,6,10,0)");
  veu.addColorStop(0.42, "rgba(7,6,10,0.85)");
  veu.addColorStop(1, PRETO);
  ctx.fillStyle = veu;
  ctx.fillRect(0, A * 0.50, L, A * 0.50);

  // selo do desconto
  if (peca.desconto > 0) {
    const texto = `${peca.desconto}% OFF`;
    ctx.font = "900 46px Inter, system-ui, sans-serif";
    const larg = ctx.measureText(texto).width + 76;
    const x = 64, y = 74, h = 92;
    ctx.fillStyle = OURO;
    ctx.beginPath(); ctx.roundRect(x, y, larg, h, 46); ctx.fill();
    ctx.fillStyle = PRETO;
    ctx.textBaseline = "middle";
    ctx.fillText(texto, x + 38, y + h / 2 + 2);
  }

  // nome e categoria
  ctx.textBaseline = "alphabetic";
  let y = Math.round(A * 0.805);
  if (peca.categoria) {
    ctx.fillStyle = OURO;
    ctx.font = "700 32px Inter, system-ui, sans-serif";
    ctx.letterSpacing = "6px";
    ctx.fillText(peca.categoria.toUpperCase(), 64, y - 70);
    ctx.letterSpacing = "0px";
  }
  ctx.fillStyle = "#f6f1e6";
  escreverCabendo(ctx, peca.nome.trim(), 64, y, L - 128, 84);

  // preço: o novo grande, o antigo riscado ao lado
  y += 112;
  ctx.fillStyle = peca.desconto > 0 ? OURO : "#f6f1e6";
  ctx.font = "900 110px Inter, system-ui, sans-serif";
  const txtPreco = moeda(peca.preco);
  ctx.fillText(txtPreco, 64, y);

  if (peca.desconto > 0) {
    const larguraPreco = ctx.measureText(txtPreco).width;
    ctx.font = "600 44px Inter, system-ui, sans-serif";
    ctx.fillStyle = "rgba(246,241,230,0.55)";
    const antigo = moeda(peca.precoCheio);
    const xAntigo = 64 + larguraPreco + 28;
    ctx.fillText(antigo, xAntigo, y - 14);
    const w = ctx.measureText(antigo).width;
    ctx.strokeStyle = "rgba(246,241,230,0.55)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(xAntigo, y - 28); ctx.lineTo(xAntigo + w, y - 28); ctx.stroke();
  }

  assinatura(ctx, logo);

  return await new Promise<Blob>((ok, erro) =>
    canvas.toBlob(b => (b ? ok(b) : erro(new Error("não deu para gerar a imagem"))), "image/jpeg", 0.92));
}

/**
 * Manda o story para onde o celular souber mandar.
 *
 * `navigator.share` com arquivo é o que corta a galeria do caminho: abre o
 * menu do sistema e o Instagram está lá. No computador isso não existe, então
 * cai no download — e o retorno diz qual dos dois aconteceu, para a tela
 * poder explicar o que fazer em seguida.
 */
export async function enviarStory(blob: Blob, nome: string): Promise<"compartilhado" | "baixado"> {
  const arquivo = new File([blob], `${nome}.jpg`, { type: "image/jpeg" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };

  if (nav.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo] });
      return "compartilhado";
    } catch (e) {
      // Cancelar não é erro: a pessoa desistiu, e baixar por cima seria
      // encher a galeria dela de arquivo que ela não quis.
      if ((e as Error)?.name === "AbortError") return "compartilhado";
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${nome}.jpg`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "baixado";
}

/**
 * A enquete: duas peças da mesma categoria, lado a lado.
 *
 * POR QUE LADO A LADO E NÃO UMA EM CIMA DA OUTRA. A enquete do Instagram tem
 * dois botões, um à esquerda e outro à direita. A imagem imita essa divisão,
 * então o "1" da foto é o "1" do botão sem ninguém precisar explicar. Empilhar
 * obrigaria a seguidora a traduzir "de cima" para "esquerda" antes de votar, e
 * cada segundo de tradução é um voto a menos.
 *
 * MESMA CATEGORIA, de propósito: "legging preta ou legging verde" é escolha;
 * "legging ou top" é pergunta sem resposta, porque as duas servem para coisas
 * diferentes.
 *
 * O PREÇO FICA. Sem ele a enquete vira brincadeira; com ele, quem votou já
 * sabe quanto custa o que escolheu.
 */
export async function desenharEnquete(
  a: PecaDoStory, b: PecaDoStory, titulo = "QUAL VOCÊ LEVARIA?",
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = L; canvas.height = A;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");

  ctx.fillStyle = PRETO;
  ctx.fillRect(0, 0, L, A);

  const [fa, fb, logo] = await Promise.all([
    carregar(a.foto), carregar(b.foto),
    carregar("/logo-story.png").catch(() => null as any),
  ]);

  // ── título ──
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  if (a.categoria) {
    ctx.fillStyle = OURO;
    ctx.font = "700 30px Inter, system-ui, sans-serif";
    ctx.letterSpacing = "8px";
    ctx.fillText(a.categoria.toUpperCase(), L / 2, 150);
    ctx.letterSpacing = "0px";
  }
  ctx.fillStyle = "#f6f1e6";
  escreverCabendo(ctx, titulo, L / 2, 232, L - 120, 78);

  // ── as duas colunas ──
  const topo = 290, alturaFoto = 1060, meio = L / 2;
  pecaPreenchendo(ctx, fa, { x: 0, y: topo, w: meio, h: alturaFoto });
  pecaPreenchendo(ctx, fb, { x: meio, y: topo, w: meio, h: alturaFoto });

  /**
   * O véu fica no PÉ das colunas, não na cabeça.
   *
   * Os números nasceram no topo e o "2" caiu bem em cima do rosto da modelo.
   * Embaixo é fundo de estúdio em praticamente toda foto de catálogo, então
   * ali o número não tapa nada do que se está escolhendo.
   */
  const base = topo + alturaFoto;
  const veuPe = ctx.createLinearGradient(0, base - 240, 0, base);
  veuPe.addColorStop(0, "rgba(7,6,10,0)");
  veuPe.addColorStop(1, "rgba(7,6,10,0.8)");
  ctx.fillStyle = veuPe;
  ctx.fillRect(0, base - 240, L, 240);

  // risco de ouro separando: sem ele as duas fotos viram uma só
  ctx.strokeStyle = OURO; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(meio, topo); ctx.lineTo(meio, topo + alturaFoto); ctx.stroke();

  // ── o número de cada lado, no mesmo lugar dos botões da enquete ──
  for (const [i, x] of [[1, meio / 2], [2, meio + meio / 2]] as const) {
    const r = 62, cy = topo + alturaFoto - 88;
    ctx.fillStyle = OURO;
    ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PRETO;
    ctx.font = "900 70px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i), x, cy + 3);
    ctx.textBaseline = "alphabetic";
  }

  // ── nome e preço de cada uma ──
  for (const [peca, x] of [[a, meio / 2], [b, meio + meio / 2]] as const) {
    let y = topo + alturaFoto + 92;
    ctx.fillStyle = "#f6f1e6";
    escreverCabendo(ctx, peca.nome.trim(), x, y, meio - 70, 52, 800);

    y += 86;
    ctx.fillStyle = peca.desconto > 0 ? OURO : "#f6f1e6";
    ctx.font = "900 68px Inter, system-ui, sans-serif";
    ctx.fillText(moeda(peca.preco), x, y);

    if (peca.desconto > 0) {
      ctx.font = "600 34px Inter, system-ui, sans-serif";
      ctx.fillStyle = "rgba(246,241,230,0.55)";
      const antigo = moeda(peca.precoCheio);
      ctx.fillText(antigo, x, y + 50);
      const w = ctx.measureText(antigo).width;
      ctx.strokeStyle = "rgba(246,241,230,0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y + 38); ctx.lineTo(x + w / 2, y + 38); ctx.stroke();
    }
  }

  // ── a chamada para votar ──
  ctx.fillStyle = "rgba(246,241,230,0.75)";
  ctx.font = "700 36px Inter, system-ui, sans-serif";
  ctx.fillText("vota aí na enquete 👆", L / 2, A - 190);

  ctx.textAlign = "left";
  assinatura(ctx, logo);

  return await new Promise<Blob>((ok, erro) =>
    canvas.toBlob(b2 => (b2 ? ok(b2) : erro(new Error("não deu para gerar a imagem"))), "image/jpeg", 0.92));
}
