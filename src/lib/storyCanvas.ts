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
  const area = { x: 0, y: 0, w: L, h: Math.round(A * 0.74) };
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

  // logo e endereço
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
