/**
 * Gera as imagens otimizadas do site a partir de media-src/.
 *
 *   npm run media
 *
 * Para cada imagem do MANIFESTO cria variantes AVIF + WebP (várias larguras)
 * e um JPEG de fallback em public/img/, e grava src/media.json com as
 * dimensões reais. O HTML usa <x-img name="..."> e o build (vite.config.ts)
 * expande para <picture> com srcset, width e height corretos.
 *
 * Trocar uma foto = substituir o arquivo em media-src/ e rodar o script.
 * Arquivos de public/img que saíram do manifesto são apagados no fim.
 */
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(ROOT, "media-src");
const OUT = resolve(ROOT, "public/img");

/** Cards de prato: foto horizontal 4:3, recorte centrado no assunto. */
const card = (name, src, extra = {}) => ({ name, src, widths: [400, 800], ratio: 4 / 3, ...extra });
/** Capas dos vídeos de criadores, em 9:16: miniatura do post ou quadro do vídeo com o criador. */
const cover = (id) => ({ name: `criador-${id}`, src: `criador-${id}.jpg`, widths: [360] });

/**
 * name: nome público | src: arquivo em media-src | widths: larguras alvo
 * crop: recorte opcional em fração da imagem {left, top, width, height} (0–1)
 * ratio: proporção final opcional (largura/altura), corte centrado em `position`
 */
const MANIFEST = [
  // Hero: recortes aprovados no briefing de 24/11/2026 (mesa com esfihas ao fundo
  // e homus sem grãos por cima). Desktop e mobile têm arquivos próprios.
  { name: "hero-desktop", src: "sabah-banner-desktop.webp", widths: [600, 1037] },
  { name: "hero-mobile", src: "sabah-banner-mobile.webp", widths: [480, 750, 1036] },

  { name: "buffet-bancada", src: "buffet-bancada.jpg", widths: [640, 1024, 1600, 2400], ratio: 16 / 9, position: "centre" },
  // Cartões de almoço e jantar
  { name: "buffet-almoco", src: "buffet-almoco.jpg", widths: [480, 800, 1200, 1600] },
  { name: "esfihas-mesa", src: "esfihas-mesa.jpg", widths: [480, 720] },
  { name: "salao", src: "salao.jpg", widths: [640, 1024, 1600, 2400] },

  // Bancada do buffet: 12 cards (acervo 2026 e fotos do cardápio)
  card("bancada-trio", "prato-homus.jpg"),
  card("bancada-tabule", "prato-tabule.jpg"),
  card("bancada-kafta", "prato-kafta.jpg"),
  card("bancada-michui", "prato-michui.jpg"),
  card("bancada-mjadara", "bancada-mjadara.jpg"), // DSC00014
  card("bancada-chairie", "bancada-chairie.jpg"), // DSC00474
  card("bancada-charuto-uva", "bancada-charuto-uva.jpg"), // DSC00440
  card("bancada-charuto-repolho", "bancada-charuto-repolho.jpg"), // DSC00458
  // Os três kibes na mesma foto, sem divisões: cru, assado e frito. Feita a partir da montagem
  // aprovada (kibes-cru-assado-frito.png), com as linhas removidas e as emendas igualadas.
  card("bancada-kibes", "bancada-kibes.jpg", { widths: [400, 800, 1200] }),
  card("bancada-legumes", "bancada-legumes.jpg"), // DSC00523: abobrinha e berinjela
  card("bancada-falafel", "prato-falafel.jpg"),
  card("bancada-esfihas", "bancada-esfihas.jpg"), // DSC00073: esfihas abertas de carne

  // Sr. Nilton com a placa "Sahtein": recorte da referência visual do bloco (fundo creme).
  { name: "nilton-sahtein", src: "nilton-sahtein.png", widths: [320, 640] },

  // Sobremesas
  card("sobremesa-doces", "sobremesa-doces.jpg"), // foto enviada pela P12 em 26/11/2026
  card("sobremesa-pudim", "sobremesa-pudim.jpg"), // DSC00080
  card("sobremesa-frutas", "sobremesa-frutas.jpg"), // DSC00084
  card("sobremesa-esfiha-doce", "sobremesa-esfiha-doce.jpg"), // DSC01361

  // À la carte
  card("alacarte-combinado", "alacarte-combinado.jpg"), // DSC01096 (indicada no briefing)
  card("alacarte-kebab", "kebab.jpg"),
  card("alacarte-beirute", "alacarte-beirute.jpg"), // DSC01155
  card("alacarte-esfihas", "alacarte-esfihas.jpg"), // DSC00999 (indicada no briefing)
  card("alacarte-kibe-frito", "kibe-frito-2026.jpg"), // DSC00701
  card("alacarte-batata", "alacarte-batata.jpg"), // DSC00828

  // Esfiha fechada de carne (campeã no SBT): uma inteira e outra cortada. Acervo 2026, DSC00801.
  { name: "esfiha-fechada-carne", src: "esfiha-fechada-carne.jpg", widths: [480, 800, 1200, 1600] },
  { name: "kebab", src: "kebab.jpg", widths: [480, 720] },

  { name: "familia-sabbag", src: "familia-sabbag.jpg", widths: [480, 957] },
  { name: "club-homs", src: "club-homs.jpg", widths: [400, 616] },
  { name: "como-chegar-poster", src: "como-chegar-poster.jpg", widths: [360, 720] },
  { name: "evento-mesa", src: "evento-mesa.jpg", widths: [480, 800, 1068] },

  // Vídeos de quem visitou, na ordem em que aparecem no carrossel
  ...["mohamad", "sampa-dicas", "desbrava", "paulistano", "turistando", "mustache", "dicas-em-sp", "juliana-mendes", "jornaliz", "aline-souza"].map(cover),
];

const AVIF = { quality: 52, effort: 6, chromaSubsampling: "4:2:0" };
const WEBP = { quality: 74, effort: 6 };
const JPEG = { quality: 78, mozjpeg: true };

async function prepared(item) {
  const input = resolve(SRC, item.src);
  const meta = await sharp(input).metadata();
  let img = sharp(input);
  let w = meta.width;
  let h = meta.height;
  if (item.crop) {
    const box = {
      left: Math.round(item.crop.left * w),
      top: Math.round(item.crop.top * h),
      width: Math.round(item.crop.width * w),
      height: Math.round(item.crop.height * h),
    };
    img = img.extract(box);
    w = box.width;
    h = box.height;
  }
  if (item.ratio) {
    const current = w / h;
    if (Math.abs(current - item.ratio) > 0.01) {
      const tw = current > item.ratio ? Math.round(h * item.ratio) : w;
      const th = current > item.ratio ? h : Math.round(w / item.ratio);
      const buf = await img.toBuffer();
      img = sharp(buf).resize(tw, th, { fit: "cover", position: item.position ?? "attention" });
      w = tw;
      h = th;
    }
  }
  return { buffer: await img.toBuffer(), w, h };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const media = {};
  const keep = new Set(["og-sabah.jpg"]);
  let total = 0;
  for (const item of MANIFEST) {
    const { buffer, w, h } = await prepared(item);
    const widths = [...new Set(item.widths.map((x) => Math.min(x, w)))].sort((a, b) => a - b);
    for (const width of widths) {
      const base = sharp(buffer).resize({ width });
      const a = await base.clone().avif(AVIF).toFile(resolve(OUT, `${item.name}-${width}.avif`));
      const p = await base.clone().webp(WEBP).toFile(resolve(OUT, `${item.name}-${width}.webp`));
      keep.add(`${item.name}-${width}.avif`).add(`${item.name}-${width}.webp`);
      total += a.size + p.size;
    }
    const fallbackWidth = widths[Math.min(1, widths.length - 1)];
    const j = await sharp(buffer).resize({ width: fallbackWidth }).jpeg(JPEG).toFile(resolve(OUT, `${item.name}.jpg`));
    keep.add(`${item.name}.jpg`);
    total += j.size;
    media[item.name] = { width: w, height: h, widths, fallbackWidth };
    console.log(`${item.name.padEnd(26)} ${w}x${h}  [${widths.join(", ")}]`);
  }

  // Logos (PNG com transparência -> WebP sem perdas + PNG)
  for (const logo of ["logo-vermelho", "logo-branco"]) {
    const input = resolve(SRC, `${logo}.png`);
    const meta = await sharp(input).metadata();
    await sharp(input).webp({ lossless: true, effort: 6 }).toFile(resolve(OUT, `${logo}.webp`));
    await sharp(input).png({ compressionLevel: 9, palette: true }).toFile(resolve(OUT, `${logo}.png`));
    keep.add(`${logo}.webp`).add(`${logo}.png`);
    media[logo] = { width: meta.width, height: meta.height, widths: [meta.width], fallbackWidth: meta.width };
  }

  // Imagem de compartilhamento (Open Graph) 1200x630, a partir do banner da hero
  const og = await sharp(resolve(SRC, "sabah-banner-desktop.webp"))
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(resolve(OUT, "og-sabah.jpg"));
  total += og.size;

  // Limpeza: tira de public/img o que não está mais no manifesto
  let removed = 0;
  for (const file of await readdir(OUT)) {
    if (!keep.has(file)) {
      await unlink(resolve(OUT, file));
      removed++;
    }
  }

  await writeFile(resolve(ROOT, "src/media.json"), JSON.stringify(media, null, 2) + "\n");
  console.log(`\n${Object.keys(media).length} imagens, ${(total / 1024 / 1024).toFixed(2)} MB em public/img (${removed} arquivos antigos removidos)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
