import { defineConfig, type Plugin } from "vite";
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CONFIG } from "./src/config.ts";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const OUT_ROOT = resolve(ROOT, "dist");
// base "/" -> dist/ ; base "/bio/" -> dist/bio (a raiz de dist/ sempre recebe _headers e robots.txt)
const OUT_DIR = resolve(OUT_ROOT, CONFIG.basePath.replace(/^\/|\/$/g, ""));

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Adiciona UTMs apenas a links do próprio domínio (sabah.com.br). */
function withUtm(url: string): string {
  try {
    const u = new URL(url);
    if (!/(^|\.)sabah\.com\.br$/i.test(u.hostname)) return url;
    u.searchParams.set("utm_source", CONFIG.utm.source);
    u.searchParams.set("utm_medium", CONFIG.utm.medium);
    u.searchParams.set("utm_campaign", CONFIG.utm.campaign);
    return u.toString();
  } catch {
    return url;
  }
}

/** Resolve {{a.b.c}} contra CONFIG. {{base}} = basePath. */
function lookup(key: string): string {
  if (key === "base") return CONFIG.basePath;
  let value: unknown = CONFIG;
  for (const part of key.split(".")) {
    if (value && typeof value === "object" && part in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[part];
    } else {
      throw new Error(`[sabah-template] chave desconhecida em CONFIG: {{${key}}}`);
    }
  }
  if (typeof value !== "string") throw new Error(`[sabah-template] {{${key}}} não é texto`);
  return key.startsWith("links.") ? withUtm(value) : value;
}

function gtmSnippets(id: string): { head: string; body: string } {
  return {
    head:
      `<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':` +
      `new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],` +
      `j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=` +
      `'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);` +
      `})(window,document,'script','dataLayer','${id}');</script>\n<!-- End Google Tag Manager -->`,
    body:
      `<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}" ` +
      `height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n<!-- End Google Tag Manager (noscript) -->`,
  };
}

/**
 * Plugin de template:
 *  - substitui {{tokens}} por valores de CONFIG (com UTM em links sabah.com.br);
 *  - remove o bloco <!-- if:gowhere --> ... <!-- endif:gowhere --> quando a campanha está desligada;
 *  - injeta o GTM quando CONFIG.gtmId está preenchido;
 *  - copia cf/* para a raiz de dist/ após o build.
 */
function sabahTemplate(): Plugin {
  const showCampaign = CONFIG.showGoWhereCampaign;
  if (showCampaign && !CONFIG.links.gowhere) {
    console.warn("\n[sabah] showGoWhereCampaign=true, mas links.gowhere está vazio em src/config.ts.\n");
  }

  return {
    name: "sabah-template",
    buildStart() {
      // Limpa arquivos antigos da raiz de dist/ (dist/bio é esvaziado pelo próprio Vite).
      // Item a item, com retry: no Windows a pasta pode estar momentaneamente travada.
      if (!existsSync(OUT_ROOT)) return;
      for (const entry of readdirSync(OUT_ROOT)) {
        try {
          rmSync(resolve(OUT_ROOT, entry), { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
        } catch (err) {
          this.warn(`[sabah] não foi possível remover dist/${entry}: ${(err as Error).message}`);
        }
      }
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        html = html.replace(
          /<!--\s*if:gowhere\s*-->([\s\S]*?)<!--\s*endif:gowhere\s*-->/g,
          (_m, inner: string) => (showCampaign ? inner : ""),
        );
        html = html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => escapeHtml(lookup(key)));
        if (CONFIG.gtmId) {
          const gtm = gtmSnippets(CONFIG.gtmId);
          html = html
            .replace("</head>", `${gtm.head}\n</head>`)
            .replace(/<body([^>]*)>/, `<body$1>\n${gtm.body}`);
        }
        return html;
      },
    },
    closeBundle() {
      // cf/* vai para a raiz de dist/ com {{base}} resolvido.
      const cf = resolve(ROOT, "cf");
      mkdirSync(OUT_ROOT, { recursive: true });
      for (const file of readdirSync(cf)) {
        const text = readFileSync(resolve(cf, file), "utf8").replaceAll("{{base}}", CONFIG.basePath);
        writeFileSync(resolve(OUT_ROOT, file), text);
      }
      // Quando a página não está na raiz, a raiz redireciona para ela.
      if (CONFIG.basePath !== "/") {
        writeFileSync(resolve(OUT_ROOT, "_redirects"), `/  ${CONFIG.basePath}  302\n`);
      }
    },
  };
}

export default defineConfig({
  base: CONFIG.basePath,
  plugins: [sabahTemplate()],
  build: {
    outDir: OUT_DIR,
    // A limpeza de dist/ é feita em buildStart (tolerante a locks do Windows).
    emptyOutDir: false,
    target: "es2022",
    rollupOptions: {
      input: {
        main: resolve(ROOT, "index.html"),
        cardapio: resolve(ROOT, "cardapio.html"),
        notFound: resolve(ROOT, "404.html"),
      },
    },
  },
});
