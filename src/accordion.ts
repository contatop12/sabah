/**
 * Blocos expansíveis (Almoço, Jantar, Eventos, Cardápio).
 *
 * Markup esperado:
 *   <button aria-expanded="false" aria-controls="ID" data-track="nome">…</button>
 *   <div class="acc__panel" id="ID"> <div class="acc__inner">…</div> </div>
 *
 * A animação é só CSS (grid-template-rows 0fr -> 1fr). Aqui só trocamos
 * aria-expanded e a classe is-open, e registramos o evento de abertura.
 */

import { track } from "./tracking";

const OPEN_CLASS = "is-open";

function setOpen(button: HTMLButtonElement, panel: HTMLElement, open: boolean): void {
  button.setAttribute("aria-expanded", String(open));
  panel.classList.toggle(OPEN_CLASS, open);
}

export function initAccordions(buttons: Iterable<HTMLButtonElement>): void {
  for (const button of buttons) {
    const id = button.getAttribute("aria-controls");
    const panel = id ? document.getElementById(id) : null;
    if (!panel) continue;

    setOpen(button, panel, button.getAttribute("aria-expanded") === "true");

    button.addEventListener("click", () => {
      const willOpen = button.getAttribute("aria-expanded") !== "true";
      setOpen(button, panel, willOpen);
      if (willOpen && button.dataset.track) track(button.dataset.track);
    });
  }
}
