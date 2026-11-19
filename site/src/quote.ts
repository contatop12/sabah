/** Orçamento de eventos: valida, monta a mensagem e abre o WhatsApp do Sabah. */
import { CONFIG } from "./config.ts";
import { track } from "./tracking.ts";

export function initQuote(): void {
  const dialog = document.querySelector<HTMLDialogElement>("[data-quote]");
  const form = document.querySelector<HTMLFormElement>("[data-quote-form]");
  const error = document.querySelector<HTMLElement>("[data-quote-error]");
  if (!dialog || !form || !error) return;

  document.querySelectorAll<HTMLElement>("[data-quote-open]").forEach((btn) =>
    btn.addEventListener("click", () => {
      // Sem suporte a <dialog>, o botão leva direto ao WhatsApp.
      if (typeof dialog.showModal !== "function") {
        window.open(CONFIG.links.eventsWhatsapp, "_blank", "noopener");
        return;
      }
      dialog.showModal();
      track("quote_open", "eventos");
    }),
  );
  dialog.querySelector("[data-quote-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close(); // clique fora fecha
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const value = (name: string): string => String(data.get(name) ?? "").trim();

    let firstInvalid: HTMLElement | null = null;
    for (const name of ["nome", "tipo", "convidados"]) {
      const field = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
      const bad = !value(name);
      field.classList.toggle("is-invalid", bad);
      field.setAttribute("aria-invalid", String(bad));
      if (bad && !firstInvalid) firstInvalid = field;
    }
    if (firstInvalid) {
      error.textContent = "Preencha nome, tipo de evento e número de convidados para continuar.";
      error.hidden = false;
      firstInvalid.focus();
      return;
    }
    error.hidden = true;

    const date = value("data");
    const details = value("detalhes");
    const lines = [
      "Olá! Vim pelo site do Sabah e gostaria de um orçamento de buffet árabe para evento.",
      "",
      `Nome: ${value("nome")}`,
      `Evento: ${value("tipo")}`,
      ...(date ? [`Data prevista: ${date.split("-").reverse().join("/")}`] : []),
      `Convidados: ${value("convidados")}`,
      ...(details ? [`Pratos e restrições: ${details}`] : []),
    ];
    const url = `https://wa.me/${CONFIG.links.eventsNumber}?text=${encodeURIComponent(lines.join("\n"))}`;

    track("quote_submit", "eventos", { event_type: value("tipo"), guests: Number(value("convidados")) });
    window.open(url, "_blank", "noopener");
    dialog.close();
    form.reset();
  });
}
