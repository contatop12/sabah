import { defineConfig, type Plugin } from "vite";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CONFIG, WHATSAPP_TOPICS } from "./src/config.ts";
import { FAQS, REVIEWS, VISITOR_VIDEOS } from "./src/content.ts";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const OUT = resolve(ROOT, "dist");

interface MediaEntry {
  width: number;
  height: number;
  widths: number[];
  fallbackWidth: number;
}
const MEDIA = JSON.parse(readFileSync(resolve(ROOT, "src/media.json"), "utf8")) as Record<string, MediaEntry>;

/** Vídeos de quem visitou com arquivo próprio em public/video (gerado por `npm run video`). */
interface VideoEntry {
  src: string;
  width: number;
  height: number;
  duration: number;
  bytes: number;
}
const VIDEOS = JSON.parse(readFileSync(resolve(ROOT, "src/videos.json"), "utf8")) as Record<string, VideoEntry>;

/** Páginas indexáveis (entram no sitemap e no llms.txt). */
const PAGES = [
  { path: "/", title: "Sabah: buffet árabe na Avenida Paulista", priority: "1.0", changefreq: "weekly" },
  { path: "/politicasdeprivacidade/", title: "Política de privacidade", priority: "0.2", changefreq: "yearly" },
  { path: "/termosdeuso/", title: "Termos de uso", priority: "0.2", changefreq: "yearly" },
];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Resolve {{a.b.c}} contra CONFIG. */
function lookup(key: string): string {
  let value: unknown = CONFIG;
  for (const part of key.split(".")) {
    if (value && typeof value === "object" && part in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[part];
    } else {
      throw new Error(`[sabah] chave desconhecida em CONFIG: {{${key}}}`);
    }
  }
  if (typeof value !== "string") throw new Error(`[sabah] {{${key}}} não é texto`);
  return value;
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) out[m[1]!] = m[2] ?? "";
  return out;
}

/**
 * <x-img name="prato-kafta" alt="…" sizes="…" class="…" eager></x-img>
 * vira <picture> com AVIF + WebP, fallback JPEG, width/height reais e lazy por padrão.
 */
function picture(tag: string): string {
  const a = attrs(tag.replace(/^<x-img/, ""));
  const m = MEDIA[a.name ?? ""];
  if (!m) throw new Error(`[sabah] imagem desconhecida: ${a.name}`);
  const set = (ext: string) => m.widths.map((w) => `/img/${a.name}-${w}.${ext} ${w}w`).join(", ");
  const sizes = a.sizes || "100vw";
  const eager = "eager" in a;
  const cls = a.class ? ` class="${a.class}"` : "";
  const h = Math.round((m.fallbackWidth * m.height) / m.width);
  return (
    `<picture>` +
    `<source type="image/avif" srcset="${set("avif")}" sizes="${sizes}">` +
    `<source type="image/webp" srcset="${set("webp")}" sizes="${sizes}">` +
    `<img${cls} src="/img/${a.name}.jpg" width="${m.fallbackWidth}" height="${h}" alt="${a.alt ?? ""}"` +
    (eager ? ` fetchpriority="high" decoding="async"` : ` loading="lazy" decoding="async"`) +
    `></picture>`
  );
}

const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function jsonLd(kind: string, pagePath: string, pageTitle: string): string {
  const { site, address, phone, links, hours } = CONFIG;
  const url = site.origin + pagePath;
  const restaurant = {
    "@type": "Restaurant",
    "@id": `${site.origin}/#restaurant`,
    name: site.legalName,
    alternateName: [site.name, "Sabah Restaurante Árabe"],
    slogan: site.slogan,
    description:
      "Restaurante árabe da família Sabbag, fundado em 1993, com buffet árabe à vontade no almoço e no jantar. No jantar, tem também rodízio de esfihas à mesa e bebidas à vontade. Fica dentro do Club Homs, na Avenida Paulista, em São Paulo.",
    url: `${site.origin}/`,
    image: [site.ogImage, `${site.origin}/img/buffet-bancada.jpg`, `${site.origin}/img/esfiha-fechada-carne.jpg`],
    logo: `${site.origin}/img/logo-vermelho.png`,
    telephone: phone.whatsappE164,
    email: CONFIG.email,
    servesCuisine: ["Árabe", "Libanesa", "Sírio-libanesa", "Esfihas"],
    foundingDate: site.foundingDate,
    founder: { "@type": "Person", name: site.founder },
    address: {
      "@type": "PostalAddress",
      streetAddress: `${address.streetLong}, ${address.place}`,
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.postalCode,
      addressCountry: "BR",
    },
    containedInPlace: { "@type": "Place", name: address.place },
    hasMap: links.maps,
    areaServed: { "@type": "City", name: "São Paulo" },
    openingHoursSpecification: hours.spec.map((s) => ({
      "@type": "OpeningHoursSpecification",
      name: s.label,
      dayOfWeek: s.days.map((d) => `https://schema.org/${DAY[d]}`),
      opens: s.opens,
      closes: s.closes,
    })),
    hasMenu: links.menu,
    acceptsReservations: true,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "reservations",
        description: "Reservas para grupos grandes",
        telephone: phone.whatsappE164,
        availableLanguage: "pt-BR",
        url: links.waGrupo,
      },
      { "@type": "ContactPoint", contactType: "customer service", telephone: phone.whatsappE164, availableLanguage: "pt-BR" },
    ],
    potentialAction: [
      { "@type": "ReserveAction", target: links.waGrupo, name: "Reservar para um grupo grande pelo WhatsApp" },
      { "@type": "OrderAction", target: links.ifood, name: "Pedir no iFood" },
    ],
    award: [
      "1º lugar na categoria Árabe · Campeões da Gastronomia 2026 (GoWhere e Jovem Pan)",
      "Melhor esfiha de São Paulo · programa Chega Mais, SBT (2024)",
    ],
    sameAs: [links.instagram, links.facebook, links.tiktok, links.ifood, links.bio],
  };
  const website = {
    "@type": "WebSite",
    "@id": `${site.origin}/#website`,
    url: `${site.origin}/`,
    name: site.legalName,
    inLanguage: "pt-BR",
    publisher: { "@id": `${site.origin}/#restaurant` },
  };
  const webpage = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: pageTitle,
    inLanguage: "pt-BR",
    isPartOf: { "@id": `${site.origin}/#website` },
    about: { "@id": `${site.origin}/#restaurant` },
    dateModified: CONFIG.updated,
  };
  const graph: unknown[] = [website, webpage];
  if (kind === "home") {
    graph.push(
      { ...restaurant, mainEntityOfPage: { "@id": `${url}#webpage` } },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`,
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    );
  } else {
    graph.push(
      { "@type": "Restaurant", "@id": `${site.origin}/#restaurant`, name: site.legalName, url: `${site.origin}/` },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: `${site.origin}/` },
          { "@type": "ListItem", position: 2, name: pageTitle, item: url },
        ],
      },
    );
  }
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

/** Nós do JSON-LD comuns a todas as páginas internas (WebSite e Restaurant), para o Worker juntar ao grafo das páginas do blog. */
function p12GraphBase(): unknown[] {
  const { site } = CONFIG;
  return [
    { "@type": "WebSite", "@id": `${site.origin}/#website`, url: `${site.origin}/`, name: site.legalName, inLanguage: "pt-BR", publisher: { "@id": `${site.origin}/#restaurant` } },
    { "@type": "Restaurant", "@id": `${site.origin}/#restaurant`, name: site.legalName, url: `${site.origin}/` },
  ];
}

function faqHtml(): string {
  return FAQS.map(
    (f, i) =>
      `<details class="faq__item"${i === 0 ? " open" : ""}>` +
      `<summary><h3 class="faq__q">${esc(f.q)}</h3><span class="faq__mark" aria-hidden="true"></span></summary>` +
      `<p class="faq__a">${esc(f.a)}</p></details>`,
  ).join("\n");
}

function reviewsHtml(): string {
  return REVIEWS.map(
    (r) =>
      `<figure class="review" data-reveal>` +
      `<blockquote><p>${r.excerpt ? "[…] " : ""}${esc(r.text)}</p></blockquote>` +
      `<figcaption><span class="review__name">${esc(r.author)}</span><span class="review__src">Avaliação no Google</span></figcaption>` +
      `</figure>`,
  ).join("\n");
}

/**
 * Cards de "O Sabah pelos olhos de quem visitou" (lista em src/content.ts).
 * Com arquivo em src/videos.json, o card toca o vídeo na própria página (src/player.ts);
 * sem arquivo, continua abrindo a publicação no Instagram.
 */
function visitorsHtml(): string {
  for (const id of Object.keys(VIDEOS)) {
    if (!VISITOR_VIDEOS.some((v) => v.id === id)) throw new Error(`[sabah] vídeo sem card em VISITOR_VIDEOS: ${id}`);
  }
  const clock = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return VISITOR_VIDEOS.map((v) => {
    const house = v.postedBy !== v.handle;
    const file = VIDEOS[v.id];
    const about = `<span class="sr">: ${esc(v.title)}, de ${esc(v.creator)}</span>`;
    const cta = file
      ? `<a class="link visitor__cta" href="${file.src}" aria-haspopup="dialog" data-player data-id="${v.id}" ` +
        `data-w="${file.width}" data-h="${file.height}" data-poster="/img/${v.cover}.jpg" data-creator="${esc(v.creator)}" ` +
        `data-handle="${esc(v.handle)}" data-title="${esc(v.title)}" data-post="${v.url}">` +
        `Assistir ao vídeo${about}</a>`
      : `<a class="link visitor__cta" href="${v.url}" target="_blank" rel="noopener" data-track="video_click" data-loc="visitou-${v.id}">` +
        `Assistir no Instagram${about}<svg aria-hidden="true"><use href="#i-out"/></svg></a>`;
    return (
      `<li class="visitor" data-reveal>` +
      `<div class="visitor__cover">` +
      `<x-img name="${v.cover}" class="visitor__img" sizes="(min-width: 900px) 230px, 58vw" alt="${esc(v.coverAlt)}"></x-img>` +
      (v.play !== undefined
        ? `<span class="visitor__play" style="--play-y: ${v.play}%" aria-hidden="true"><svg viewBox="0 0 24 24">` +
          `<path fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linejoin="round" d="M8 5.5v13l10.5-6.5z"/></svg></span>`
        : "") +
      (file ? `<span class="visitor__time"><span class="sr">Duração: </span>${clock(file.duration)}</span>` : "") +
      `</div>` +
      `<p class="visitor__who"><strong>${esc(v.creator)}</strong> <span>${esc(v.handle)}</span></p>` +
      `<h3 class="visitor__title">${esc(v.title)}</h3>` +
      (house ? `<p class="visitor__note">Publicado no perfil ${esc(v.postedBy)}.</p>` : "") +
      cta +
      `</li>`
    );
  }).join("\n");
}

/** Opções do painel de WhatsApp (lista em src/config.ts). */
function whatsappHtml(): string {
  return WHATSAPP_TOPICS.map(
    (t) =>
      `<li><a class="wa__opt" href="https://wa.me/${t.number}?text=${encodeURIComponent(t.message)}" target="_blank" rel="noopener" ` +
      `data-wa-topic="${t.id}" data-loc="painel">${esc(t.label)}<svg aria-hidden="true"><use href="#i-out"/></svg></a></li>`,
  ).join("\n");
}

function sitemap(): string {
  const urls = PAGES.map(
    (p) =>
      `  <url>\n    <loc>${CONFIG.site.origin}${p.path}</loc>\n    <lastmod>${CONFIG.updated}</lastmod>\n` +
      `    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function robots(): string {
  const ai = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-SearchBot",
    "Claude-User",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "Applebot-Extended",
    "CCBot",
    "Bingbot",
  ];
  return (
    `# robots.txt de ${CONFIG.site.origin}\n# Buscadores e assistentes de IA podem ler todo o site.\n\n` +
    `User-agent: *\nAllow: /\n\n` +
    ai.map((b) => `User-agent: ${b}\nAllow: /\n`).join("\n") +
    `\nSitemap: ${CONFIG.site.origin}/sitemap.xml\n`
  );
}

function llms(): string {
  const { site, address, phone, hours, links } = CONFIG;
  return `# ${site.legalName}

> Restaurante árabe da família Sabbag, fundado em ${site.foundingYear}, dentro do ${address.place}, na Avenida Paulista, em São Paulo. Serve buffet árabe à vontade no almoço e no jantar. O jantar inclui também rodízio de esfihas à mesa e bebidas à vontade, incluindo Heineken. Para jantar, é só chegar; o Sabah pede reserva só para grupos grandes. A entrega é feita pelo iFood, as encomendas para retirada são atendidas pelo WhatsApp e há buffet a domicílio para eventos.

Este arquivo resume as informações oficiais do restaurante para assistentes e mecanismos de busca com IA. Em caso de divergência, vale o que está em ${site.origin}/.

## Dados essenciais

- Nome: ${site.legalName} ("${site.slogan}")
- Endereço: ${address.full}, CEP ${address.postalCode}, dentro do ${address.place}
- Como entrar: entre no ${address.place}, avise na portaria que vai ao Sabah; o restaurante fica no fim do corredor, à esquerda. Não é preciso ser sócio do clube.
- Metrô: ${address.metro}
- WhatsApp do Sabah (dúvidas, reservas para grupos grandes, encomendas para retirada, buffet a domicílio e fornecedores): ${phone.whatsappDisplay}. O atendimento é feito pelo WhatsApp; o Sabah não divulga telefone fixo.
- WhatsApp exclusivo para influenciadores, imprensa e parcerias: ${phone.midiaDisplay}
- E-mail: ${CONFIG.email}

## Horários

- Almoço, segunda a sexta: ${hours.lunchWeekdays}
- Almoço, sábados, domingos e feriados: ${hours.lunchWeekend}
- Jantar, todos os dias: ${hours.dinner}
- Entrega pelo iFood, todos os dias: ${hours.delivery}

## O que o Sabah serve

- Almoço: buffet árabe à vontade. As esfihas salgadas também ficam disponíveis na bancada do almoço.
- Jantar: a mesma bancada de buffet árabe, com rodízio de esfihas à mesa e bebidas à vontade, incluindo Heineken. Para jantar, é só chegar. Para grupos grandes, o Sabah pede reserva pelo WhatsApp.
- Pratos da bancada: trio de pastas (homus, coalhada seca e babaganuche), tabule, kafta, michui de frango, arroz m'jadara, arroz chairie, charutinhos de uva e de repolho, kibes cru, assado e frito, abobrinha e berinjela recheadas, faláfel e esfihas salgadas.
- Sobremesas: doces árabes, pudim, frutas da estação e esfiha doce (inclusa no rodízio do jantar).
- À la carte: combinado montado pela pessoa, kebabs, beirute de kafta, esfihas, kibe frito e batata frita com zátar. Os pratos da bancada podem variar conforme o dia.
- Entrega em casa: pelo iFood.
- Encomendas para retirada no restaurante: pelo WhatsApp do Sabah.
- Buffet a domicílio: buffet árabe para eventos de aproximadamente 50 a 200 convidados em São Paulo e região, com orçamento pelo WhatsApp do Sabah.

## Reconhecimentos

- 1º lugar na categoria Árabe do prêmio Campeões da Gastronomia 2026, por voto popular, premiação da GoWhere em parceria com a Jovem Pan: ${links.gowhereResult}
- Em 2024, a esfiha fechada de carne do Sabah venceu a disputa pela melhor esfiha de São Paulo no programa Chega Mais, do SBT.

## Páginas

${PAGES.map((p) => `- [${p.title}](${site.origin}${p.path})`).join("\n")}

## Links oficiais

- [Cardápio](${links.menu})
- [Cardápio do salão](${links.menuSalao})
- [Cardápio de delivery e encomendas](${links.menuDelivery})
- [Reservar para um grupo grande pelo WhatsApp](${links.waGrupo})
- [Como chegar (Google Maps)](${links.maps})
- [Pedir no iFood](${links.ifood})
- [Instagram @sabahcozinhaarabe](${links.instagram})
- [Links do Sabah](${links.bio})

Atualizado em ${CONFIG.updated}.
`;
}

function sabahSite(): Plugin {
  return {
    name: "sabah-site",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        const pagePath = ctx.path.replace(/index\.html$/, "");
        // 1) parciais
        html = html.replace(/<!--@include ([\w-]+)-->/g, (_m, name: string) =>
          readFileSync(resolve(ROOT, "src/partials", `${name}.html`), "utf8"),
        );
        // 2) blocos gerados
        html = html
          .replace("<!--@faq-->", faqHtml)
          .replace("<!--@reviews-->", reviewsHtml)
          .replace("<!--@visitors-->", visitorsHtml)
          .replace("<!--@whatsapp-->", whatsappHtml)
          .replace(/<!--@jsonld (\w+) "([^"]+)"-->/g, (_m, kind: string, title: string) => jsonLd(kind, pagePath, title))
          .replaceAll("{{page.url}}", CONFIG.site.origin + pagePath)
          .replaceAll("{{year}}", String(new Date().getFullYear()));
        // 3) imagens
        html = html.replace(/<x-img[^>]*>(?:\s*<\/x-img>)?/g, picture);
        // 4) tokens de CONFIG
        html = html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => esc(lookup(key)));
        return html;
      },
    },
    closeBundle() {
      if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
      writeFileSync(resolve(OUT, "sitemap.xml"), sitemap());
      writeFileSync(resolve(OUT, "robots.txt"), robots());
      writeFileSync(resolve(OUT, "llms.txt"), llms());
      for (const file of readdirSync(resolve(ROOT, "cf"))) {
        writeFileSync(resolve(OUT, file), readFileSync(resolve(ROOT, "cf", file)));
      }
      // Tamanho de cada vídeo publicado: o Worker (worker/video.ts) usa para responder
      // pedidos de trecho (206), que o Safari exige para tocar vídeo.
      const videoDir = resolve(ROOT, "public/video");
      const sizes: Record<string, number> = {};
      for (const file of existsSync(videoDir) ? readdirSync(videoDir).sort() : []) {
        sizes[`/video/${file}`] = statSync(resolve(videoDir, file)).size;
      }
      // Kit do Rankeando: o que o Worker precisa do build para montar as páginas do blog (nós comuns do JSON-LD, iguais aos das outras páginas internas).
      // A página-modelo (p12-kit/modelo/index.html) sai do próprio Vite; o Worker responde 404 a visitantes em /p12-kit/*.
      mkdirSync(resolve(OUT, "p12-kit"), { recursive: true });
      writeFileSync(resolve(OUT, "p12-kit/config.json"), JSON.stringify({ graphBase: p12GraphBase() }));
      writeFileSync(resolve(ROOT, "worker/sizes.json"), JSON.stringify(sizes, null, 2) + "\n");
    },
  };
}

export default defineConfig({
  plugins: [sabahSite()],
  build: {
    outDir: OUT,
    emptyOutDir: true,
    target: "es2022",
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        home: resolve(ROOT, "index.html"),
        privacidade: resolve(ROOT, "politicasdeprivacidade/index.html"),
        termos: resolve(ROOT, "termosdeuso/index.html"),
        notFound: resolve(ROOT, "404.html"),
        // Modelo das páginas do blog do Rankeando (ver worker/p12/pagina.ts); sai em dist/p12-kit/modelo/.
        p12Modelo: resolve(ROOT, "p12-kit/modelo/index.html"),
      },
    },
  },
});
