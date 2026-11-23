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
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(ROOT, "media-src");
const OUT = resolve(ROOT, "public/img");

/**
 * name: nome público | src: arquivo em media-src | widths: larguras alvo
 * crop: recorte opcional em fração da imagem {left, top, width, height} (0–1)
 * ratio: proporção final opcional (largura/altura), corte centrado em `position`
 */
const MANIFEST = [
  // Hero: fotos aprovadas (briefing de 23/11/2026). Mesa com homus e pão, tabule,
  // m'jadara e o prato com kafta, charutinho, coalhada, kibe cru e espeto de frango.
  //   desktop = rodizio-arabe-sabah.png (1672 x 941, horizontal)
  //   mobile  = buffet-arabe-a-vontade-sabah.png (1122 x 1402, vertical)
  // No celular a foto aparece em faixa: o recorte tira o topo (cadeiras e fundo)
  // e mantém o homus, o pão e o prato principal.
  { name: "hero-desktop", src: "rodizio-arabe-sabah.png", widths: [900, 1400, 1672] },
  { name: "hero-mobile", src: "buffet-arabe-a-vontade-sabah.png", widths: [480, 750, 1122], crop: { left: 0, top: 0.28, width: 1, height: 0.72 } },

  { name: "buffet-bancada", src: "buffet-bancada.jpg", widths: [640, 1024, 1600, 2400], ratio: 16 / 9, position: "centre" },
  { name: "buffet-salao", src: "buffet-salao-vertical.jpg", widths: [480, 800, 1200], ratio: 4 / 5, position: "centre" },
  // Cartão do almoço: close da bancada (kibe cru, salada e cubas). Acervo 2026, DSC00050.
  { name: "buffet-almoco", src: "buffet-almoco.jpg", widths: [480, 800, 1200, 1600] },
  { name: "buffet-cubas", src: "buffet-cubas.jpg", widths: [453] },
  { name: "prato-montado", src: "prato-montado.jpg", widths: [455] },
  { name: "salao", src: "salao.jpg", widths: [640, 1024, 1600, 2400] },

  { name: "prato-homus", src: "prato-homus.jpg", widths: [320, 480], ratio: 4 / 5 },
  { name: "prato-tabule", src: "prato-tabule.jpg", widths: [320, 600], ratio: 4 / 5 },
  { name: "prato-mjadara", src: "prato-mjadara.jpg", widths: [320, 600], ratio: 4 / 5 },
  { name: "prato-charutos", src: "prato-charutos.jpg", widths: [320, 600], ratio: 4 / 5 },
  { name: "prato-kafta", src: "prato-kafta.jpg", widths: [320, 640, 960], ratio: 4 / 5 },
  { name: "prato-michui", src: "prato-michui.jpg", widths: [320, 560], ratio: 4 / 5 },
  { name: "prato-kibe-cru", src: "prato-kibe-cru.jpg", widths: [320, 640, 960], ratio: 4 / 5 },
  { name: "prato-falafel", src: "prato-falafel.jpg", widths: [320, 372], ratio: 4 / 5 },
  { name: "prato-doces", src: "prato-doces.jpg", widths: [320, 480] },

  // Esfiha fechada de carne (campeã no SBT): uma inteira e outra cortada. Acervo 2026, DSC00801.
  { name: "esfiha-fechada-carne", src: "esfiha-fechada-carne.jpg", widths: [480, 800, 1200, 1600] },
  { name: "esfihas-mesa", src: "esfihas-mesa.jpg", widths: [480, 720] },
  { name: "esfihas-salgadas", src: "esfihas-salgadas.jpg", widths: [320, 480] },
  { name: "kibe-frito", src: "kibe-frito.jpg", widths: [320, 600] },
  { name: "kebab", src: "kebab.jpg", widths: [480, 720] },

  { name: "familia-sabbag", src: "familia-sabbag.jpg", widths: [480, 957] },
  { name: "placa-sabah", src: "placa-sabah.jpg", widths: [480, 800, 1260] },
  { name: "club-homs", src: "club-homs.jpg", widths: [400, 616] },
  { name: "como-chegar-poster", src: "como-chegar-poster.jpg", widths: [360, 720] },
  { name: "evento-mesa", src: "evento-mesa.jpg", widths: [480, 800, 1068] },
  { name: "evento-dabke", src: "evento-dabke.jpg", widths: [480, 800, 1068] },
  { name: "evento-buffet", src: "evento-buffet.jpg", widths: [480, 800, 1068] },

  // Capas dos vídeos de quem visitou: área da foto dos cards "Eles Recomendam"
  // do site anterior (260 x 366). Trocar por capas em alta quando o Sabah enviar.
  { name: "criador-turistando", src: "criador-turistando.jpg", widths: [260] },
  { name: "criador-sampa-dicas", src: "criador-sampa-dicas.jpg", widths: [260] },
  { name: "criador-mohamad", src: "criador-mohamad.jpg", widths: [260] },
];

const AVIF = { quality: 52, effort: 6, chromaSubsampling: "4:2:0" };
const WEBP = { quality: 74, effort: 6 };
const JPEG = { quality: 78, mozjpeg: true };

async function prepared(item) {
  const input = resolve(SRC, item.src);
  let meta = await sharp(input).metadata();
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
  let total = 0;
  for (const item of MANIFEST) {
    const { buffer, w, h } = await prepared(item);
    const widths = [...new Set(item.widths.map((x) => Math.min(x, w)))].sort((a, b) => a - b);
    for (const width of widths) {
      const base = sharp(buffer).resize({ width });
      const a = await base.clone().avif(AVIF).toFile(resolve(OUT, `${item.name}-${width}.avif`));
      const p = await base.clone().webp(WEBP).toFile(resolve(OUT, `${item.name}-${width}.webp`));
      total += a.size + p.size;
    }
    const fallbackWidth = widths[Math.min(1, widths.length - 1)];
    const j = await sharp(buffer).resize({ width: fallbackWidth }).jpeg(JPEG).toFile(resolve(OUT, `${item.name}.jpg`));
    total += j.size;
    media[item.name] = { width: w, height: h, widths, fallbackWidth };
    console.log(`${item.name.padEnd(22)} ${w}x${h}  [${widths.join(", ")}]`);
  }

  // Logos (PNG com transparência -> WebP sem perdas + PNG)
  for (const logo of ["logo-vermelho", "logo-branco"]) {
    const input = resolve(SRC, `${logo}.png`);
    const meta = await sharp(input).metadata();
    await sharp(input).webp({ lossless: true, effort: 6 }).toFile(resolve(OUT, `${logo}.webp`));
    await sharp(input).png({ compressionLevel: 9, palette: true }).toFile(resolve(OUT, `${logo}.png`));
    media[logo] = { width: meta.width, height: meta.height, widths: [meta.width], fallbackWidth: meta.width };
  }

  // Imagem de compartilhamento (Open Graph) 1200x630
  const og = await sharp(resolve(SRC, "rodizio-arabe-sabah.png"))
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(resolve(OUT, "og-sabah.jpg"));
  total += og.size;

  await writeFile(resolve(ROOT, "src/media.json"), JSON.stringify(media, null, 2) + "\n");
  console.log(`\n${Object.keys(media).length} imagens, ${(total / 1024 / 1024).toFixed(2)} MB em public/img`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
