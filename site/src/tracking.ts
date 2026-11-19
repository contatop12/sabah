/**
 * Mensuração: consentimento (LGPD + Consent Mode v2), Google Tag Manager e eventos.
 *
 * Eventos enviados ao dataLayer (parâmetro `location` = onde foi o clique):
 *   route_click        clique em rota / Como chegar
 *   reservation_click  clique em reserva (WhatsApp)
 *   menu_view          acesso ao cardápio
 *   quote_submit       envio do orçamento de eventos
 *   ifood_click        clique em iFood
 * e, de apoio: whatsapp_click, instagram_click, video_click, video_play,
 * award_click, reviews_click, quote_open.
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

function applyChoice(choice: Choice): void {
  gtag("consent", "update", {
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
    analytics_storage: choice,
  });
}

let gtmLoaded = false;
function loadGtm(): void {
  if (gtmLoaded || !CONFIG.gtmId) return;
  gtmLoaded = true;
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${CONFIG.gtmId}`;
  document.head.append(s);
}

export function initTracking(): void {
  window.dataLayer = window.dataLayer || [];

  // 1) Consentimento: tudo negado até a pessoa escolher.
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    wait_for_update: 500,
  });
  const saved = readChoice();
  if (saved) applyChoice(saved);

  const banner = document.querySelector<HTMLElement>("[data-consent]");
  const choose = (choice: Choice): void => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* navegação privada: vale só para esta visita */
    }
    applyChoice(choice);
    if (banner) banner.hidden = true;
  };
  if (banner) {
    // Sem escolha salva: o aviso aparece na primeira rolagem (ou após 6 s), para não
    // cobrir a primeira dobra. Até lá, medição e anúncios continuam negados.
    if (!saved) {
      let shown = false;
      const show = (): void => {
        if (shown) return;
        shown = true;
        banner.hidden = false;
      };
      window.addEventListener("scroll", show, { once: true, passive: true });
      window.setTimeout(show, 6000);
    }
    banner.querySelector("[data-consent-accept]")?.addEventListener("click", () => choose("granted"));
    banner.querySelector("[data-consent-deny]")?.addEventListener("click", () => choose("denied"));
    document.querySelectorAll("[data-consent-open]").forEach((b) =>
      b.addEventListener("click", () => {
        banner.hidden = false;
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
