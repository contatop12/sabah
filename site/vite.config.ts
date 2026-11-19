import { defineConfig, type Plugin } from "vite";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CONFIG } from "./src/config.ts";
import { FAQS, REVIEWS } from "./src/content.ts";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const OUT = resolve(ROOT, "dist");

interface MediaEntry {
  width: number;
  height: number;
  widths: number[];
  fallbackWidth: number;
}
const MEDIA = JSON.parse(readFileSync(resolve(ROOT, "src/media.json"), "utf8")) as Record<string, MediaEntry>;

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
      "Restaurante árabe da família Sabbag, fundado em 1993, com buffet árabe à vontade no almoço e buffet com rodízio de esfihas no jantar. Fica dentro do Club Homs, na Avenida Paulista, em São Paulo.",
    url: `${site.origin}/`,
    image: [site.ogImage, `${site.origin}/img/buffet-bancada.jpg`, `${site.origin}/img/prato-kafta.jpg`],
    logo: `${site.origin}/img/logo-vermelho.png`,
    telephone: phone.tel,
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
        telephone: phone.reservasE164,
        availableLanguage: "pt-BR",
        url: links.reservation,
      },
      { "@type": "ContactPoint", contactType: "customer service", telephone: phone.whatsappE164, availableLanguage: "pt-BR" },
    ],
    potentialAction: [
      { "@type": "ReserveAction", target: links.reservation, name: "Reservar mesa pelo WhatsApp" },
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

> Restaurante árabe da família Sabbag, fundado em ${site.foundingYear}, dentro do ${address.place}, na Avenida Paulista, em São Paulo. Serve buffet árabe à vontade no almoço e buffet com rodízio de esfihas no jantar. Também faz delivery pelo iFood e buffet para eventos.

Este arquivo resume as informações oficiais do restaurante para assistentes e mecanismos de busca com IA. Em caso de divergência, vale o que está em ${site.origin}/.

## Dados essenciais

- Nome: ${site.legalName} ("${site.slogan}")
- Endereço: ${address.full}, CEP ${address.postalCode}, dentro do ${address.place}
- Como entrar: entre no ${address.place}, avise na portaria que vai ao Sabah; o restaurante fica no fim do corredor, à esquerda. Não é preciso ser sócio do clube.
- Metrô: ${address.metro}
- Telefone: ${phone.display}
- WhatsApp de reservas: ${phone.reservasDisplay}
- WhatsApp geral (eventos e encomendas): ${phone.whatsappDisplay}
- E-mail: ${CONFIG.email}

## Horários

- Almoço, segunda a sexta: ${hours.lunchWeekdays}
- Almoço, sábados, domingos e feriados: ${hours.lunchWeekend}
- Jantar, todos os dias: ${hours.dinner} (mediante reserva)
- Delivery (iFood), todos os dias: ${hours.delivery}

## O que o Sabah serve

- Almoço: buffet árabe à vontade com sobremesa. No salão também há à la carte, pratos executivos, combinados, kebabs e esfihas.
- Jantar: buffet árabe à vontade com rodízio de esfihas, sobremesa e bebidas, além de opções à la carte.
- Pratos do buffet: homus, coalhada seca, babaganuche, tabule, kibe cru, kafta, michui de frango, faláfel, charutinhos de folha de uva e de repolho, m'jadara (arroz com lentilhas e cebola dourada), arroz chairie e doces árabes. Os pratos podem variar conforme o dia.
- Eventos: buffet árabe para aproximadamente 50 a 200 convidados em São Paulo e região.

## Reconhecimentos

- 1º lugar na categoria Árabe do prêmio Campeões da Gastronomia 2026, por voto popular, premiação da GoWhere em parceria com a Jovem Pan: ${links.gowhereResult}
- Vencedor da disputa pela melhor esfiha de São Paulo no programa Chega Mais, do SBT, em 2024. A receita criada para a final entrou no cardápio como Esfiha SBT.

## Páginas

${PAGES.map((p) => `- [${p.title}](${site.origin}${p.path})`).join("\n")}

## Links oficiais

- [Cardápio](${links.menu})
- [Reservar mesa pelo WhatsApp](${links.reservation})
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
      },
    },
  },
});
