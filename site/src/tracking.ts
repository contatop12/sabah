/**
 * Mensuração: consentimento (LGPD + Consent Mode v2), Google Tag Manager e eventos.
 *
 * Eventos enviados ao dataLayer (parâmetro `location` = onde foi o clique):
 *   route_click             clique em rota / Como chegar
 *   menu_view               acesso ao cardápio (completo, salão ou delivery)
 *   ifood_click             clique em iFood
 *   quote_submit            envio do orçamento de eventos
 *   whatsapp_selector_open  abertura do painel de WhatsApp (src/whatsapp.ts)
 *   whatsapp_click          clique num assunto de WhatsApp; `topic` leva só o
 *                           identificador (almoco, jantar, domicilio, grupo,
 *                           retirada, midia, fornecedores), sem número nem mensagem
 * e, de apoio: instagram_click, video_click, video_play, award_click,
 * reviews_click, quote_open.
 */
import { CONFIG } from "./config.ts";

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

const STORAGE_KEY = "sabah-consent";
type Choice = "granted" | "denied";

/** Mesmo formato do snippet oficial: o GTM espera o objeto `arguments`. */
function gtag(..._args: unknown[]): void {
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

export function track(event: string, location: string, extra: Record<string, unknown> = {}): void {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, location, ...extra });
}

function readChoice(): Choice | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

/** Recusa feita nesta visita: vale mesmo que o navegador não deixe gravar no localStorage. */
let refusedNow = false;

function isRefused(): boolean {
  return refusedNow || readChoice() === "denied";
}

function applyChoice(choice: Choice): void {
  gtag("consent", "update", {
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
    analytics_storage: choice,
  });
}

/** Apaga os cookies próprios de medição (host e domínios pais), pois só o navegador os limpa. */
const TRACKING_COOKIE = /^(_ga|_gid|_gat|_gcl|_gac|_fbp|_fbc)/;
function clearTrackingCookies(): void {
  const parts = location.hostname.split(".");
  const domains: (string | null)[] = [null];
  for (let i = 0; i <= parts.length - 2; i++) {
    const d = parts.slice(i).join(".");
    domains.push(d, `.${d}`);
  }
  for (const pair of document.cookie.split(";")) {
    const name = pair.split("=")[0]?.trim();
    if (!name || !TRACKING_COOKIE.test(name)) continue;
    for (const d of domains) {
      document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ""}`;
    }
  }
}

let gtmLoaded = false;
function loadGtm(): void {
  // Com recusa guardada nada é carregado, em nenhuma página.
  if (gtmLoaded || !CONFIG.gtmId || isRefused()) return;
  gtmLoaded = true;
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${CONFIG.gtmId}`;
  document.head.append(s);
}

export function initTracking(): void {
  window.dataLayer = window.dataLayer || [];

  // 1) Consentimento: medição ligada desde a primeira visita (padrão da agência);
  //    só fica negada se a pessoa já recusou.
  const saved = readChoice();
  const initial: Choice = saved === "denied" ? "denied" : "granted";
  gtag("consent", "default", {
    ad_storage: initial,
    ad_user_data: initial,
    ad_personalization: initial,
    analytics_storage: initial,
  });

  const banner = document.querySelector<HTMLElement>("[data-consent]");
  // Enquanto o aviso está na tela, o botão flutuante de WhatsApp sobe para não
  // ficar atrás dele (o CSS usa a classe e a altura medida aqui).
  const root = document.documentElement;
  const setBanner = (visible: boolean): void => {
    if (!banner) return;
    banner.hidden = !visible;
    root.classList.toggle("has-consent", visible);
    if (visible) root.style.setProperty("--consent-h", `${banner.offsetHeight}px`);
    else root.style.removeProperty("--consent-h");
  };
  const choose = (choice: Choice): void => {
    let persisted = false;
    try {
      localStorage.setItem(STORAGE_KEY, choice);
      persisted = localStorage.getItem(STORAGE_KEY) === choice;
    } catch {
      /* navegação privada: vale só para esta visita */
    }
    if (choice === "denied") {
      refusedNow = true;
      applyChoice("denied");
      clearTrackingCookies();
      setBanner(false);
      // Um contêiner já carregado só sai da página recarregando. Sem armazenamento,
      // recarregar traria a tag de volta, então não recarrega.
      if (gtmLoaded && persisted) location.reload();
      return;
    }
    refusedNow = false;
    applyChoice("granted");
    setBanner(false);
    // Depois de uma recusa, aceitar liga a medição na hora, sem recarregar.
    loadGtm();
  };
  if (banner) {
    // Sem escolha salva: o aviso aparece na primeira rolagem (ou após 6 s), para não
    // cobrir a primeira dobra. A medição não espera a escolha.
    if (!saved) {
      let shown = false;
      const show = (): void => {
        if (shown) return;
        shown = true;
        setBanner(true);
      };
      window.addEventListener("scroll", show, { once: true, passive: true });
      window.setTimeout(show, 6000);
    }
    window.addEventListener(
      "resize",
      () => {
        if (!banner.hidden) root.style.setProperty("--consent-h", `${banner.offsetHeight}px`);
      },
      { passive: true },
    );
    banner.querySelector("[data-consent-accept]")?.addEventListener("click", () => choose("granted"));
    banner.querySelector("[data-consent-deny]")?.addEventListener("click", () => choose("denied"));
    document.querySelectorAll("[data-consent-open]").forEach((b) =>
      b.addEventListener("click", () => {
        setBanner(true);
        banner.querySelector<HTMLElement>("button")?.focus();
      }),
    );
  }

  // 2) GTM fora do caminho crítico: carrega com a página ociosa ou na primeira interação.
  const idle = (): void => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(loadGtm, { timeout: 3500 });
    else window.setTimeout(loadGtm, 2000);
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
  for (const type of ["pointerdown", "keydown", "scroll"] as const) {
    window.addEventListener(type, loadGtm, { once: true, passive: true });
  }

  // 3) Eventos de clique declarados no HTML com data-track / data-loc.
  document.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-track]");
    if (!el) return;
    const href = el instanceof HTMLAnchorElement ? el.href : undefined;
    track(el.dataset.track ?? "click", el.dataset.loc ?? "pagina", href ? { link_url: href } : {});
  });

  // 4) Pré-conexão por intenção: ao tocar ou passar o mouse num link externo,
  //    abre a conexão antes do clique.
  const warmed = new Set<string>();
  const warm = (e: Event): void => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const a = target.closest<HTMLAnchorElement>("a[href^='http']");
    if (!a || a.origin === location.origin || warmed.has(a.origin)) return;
    warmed.add(a.origin);
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = a.origin;
    document.head.append(link);
  };
  document.addEventListener("pointerover", warm, { passive: true });
  document.addEventListener("touchstart", warm, { passive: true });
}
