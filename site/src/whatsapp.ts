/**
 * WhatsApp por assunto: botão flutuante, painel "Como podemos ajudar?" e mensuração.
 *
 * Os links (número + mensagem) já vêm prontos no HTML, gerados no build a partir
 * de WHATSAPP_TOPICS (src/config.ts). Aqui ficam só abrir/fechar, foco e eventos:
 *   whatsapp_selector_open  abertura do painel (location = de onde foi aberto)
 *   whatsapp_click          clique num assunto (topic = identificador do assunto)
 * O clique conta como abertura de conversa: o envio acontece no aplicativo.
 */
import { track } from "./tracking.ts";

export function initWhatsapp(): void {
  // Qualquer link de WhatsApp, no painel ou nas seções: registra só o identificador do assunto.
  document.addEventListener("click", (e) => {
    const link = (e.target as HTMLElement).closest<HTMLElement>("[data-wa-topic]");
    if (link) track("whatsapp_click", link.dataset.loc ?? "pagina", { topic: link.dataset.waTopic });
  });

  const root = document.querySelector<HTMLElement>("[data-wa]");
  const panel = root?.querySelector<HTMLElement>("[data-wa-panel]") ?? null;
  const fab = root?.querySelector<HTMLButtonElement>(".wa__fab") ?? null;
  if (!root || !panel || !fab) return;

  /** Botão que abriu o painel: recebe o foco de volta ao fechar. */
  let opener: HTMLElement | null = null;
  const isOpen = (): boolean => !panel.hidden;

  const open = (from: HTMLElement): void => {
    opener = from;
    panel.hidden = false;
    root.classList.add("is-open");
    fab.setAttribute("aria-expanded", "true");
    track("whatsapp_selector_open", from.dataset.loc ?? "pagina");
    panel.focus(); // o leitor de tela anuncia o título do painel
  };
  const close = (returnFocus = true): void => {
    if (!isOpen()) return;
    panel.hidden = true;
    root.classList.remove("is-open");
    fab.setAttribute("aria-expanded", "false");
    if (returnFocus) (opener ?? fab).focus();
    opener = null;
  };

  document.querySelectorAll<HTMLElement>("[data-wa-open]").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (!isOpen()) open(btn);
      else if (btn === fab) close();
      else panel.focus();
    }),
  );
  panel.querySelector("[data-wa-close]")?.addEventListener("click", () => close());
  // Ao escolher um assunto a conversa abre em outra aba; o painel fecha.
  panel.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) close(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) close();
  });
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (isOpen() && !root.contains(target) && !target.closest("[data-wa-open]")) close(false);
  });

  // O botão não pode cobrir os botões da primeira dobra: enquanto estiver sobre eles
  // (telas baixas), ele se recolhe e volta assim que a pessoa rola a página.
  const heroButtons = [...document.querySelectorAll<HTMLElement>(".hero__ctas .btn")];
  if (heroButtons.length) {
    let ticking = false;
    const check = (): void => {
      ticking = false;
      const box = root.getBoundingClientRect();
      const covers = heroButtons.some((b) => {
        const r = b.getBoundingClientRect();
        return r.bottom > box.top - 8 && r.top < box.bottom && r.right > box.left - 8 && r.left < box.right;
      });
      root.classList.toggle("is-tucked", covers && !isOpen());
    };
    const request = (): void => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    };
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });
    window.addEventListener("load", request, { once: true });
    request();
  }
}
