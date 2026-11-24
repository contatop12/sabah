/**
 * Abas de "O que você encontra no salão" (Bancada do buffet e À la carte).
 * Padrão de abas acessível: setas, Home e End trocam de aba; só a aba ativa
 * fica na ordem do Tab. Sem JavaScript, os dois painéis ficam visíveis.
 */
export function initTabs(): void {
  document.querySelectorAll<HTMLElement>("[data-tabs]").forEach((root) => {
    const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    if (!tabs.length) return;
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls") ?? ""));

    const select = (index: number, focus = false): void => {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute("aria-selected", String(on));
        tab.tabIndex = on ? 0 : -1;
        const panel = panels[i];
        if (panel) panel.hidden = !on;
      });
      if (focus) tabs[index]?.focus();
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(i));
      tab.addEventListener("keydown", (e) => {
        let next = -1;
        if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = tabs.length - 1;
        if (next < 0) return;
        e.preventDefault();
        select(next, true);
      });
    });

    select(Math.max(0, tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true")));
    root.classList.add("is-ready");
  });
}
