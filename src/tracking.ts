/**
 * Eventos para Google Tag Manager / GA4.
 *
 * Todo clique em elemento com data-track="nome" gera:
 *   window.dataLayer.push({ event: "bio_link_click", link_name: "nome" })
 *
 * O GTM em si é injetado no build quando CONFIG.gtmId está preenchido
 * (ver vite.config.ts). Sem GTM, o dataLayer continua sendo alimentado
 * e pode ser lido por qualquer outra tag.
 */

type DataLayerEvent = { event: "bio_link_click"; link_name: string };

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function track(linkName: string): void {
  window.dataLayer = window.dataLayer ?? [];
  const payload: DataLayerEvent = { event: "bio_link_click", link_name: linkName };
  window.dataLayer.push(payload);
}

export function initTracking(root: ParentNode): void {
  for (const link of root.querySelectorAll<HTMLAnchorElement>("a[data-track]")) {
    link.addEventListener("click", () => {
      if (link.dataset.track) track(link.dataset.track);
    });
  }
}
