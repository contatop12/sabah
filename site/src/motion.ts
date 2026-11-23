/** Revelação ao rolar. Sem bibliotecas: IntersectionObserver. */
export function initMotion(): void {
  const items = document.querySelectorAll<HTMLElement>("[data-reveal]");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
  } else {
    // Irmãos revelados juntos entram em sequência (ex.: os pratos da bancada).
    const seen = new Map<Element, number>();
    items.forEach((el) => {
      const parent = el.parentElement;
      if (!parent) return;
      const index = seen.get(parent) ?? 0;
      seen.set(parent, index + 1);
      el.style.setProperty("--i", String(Math.min(index, 5)));
    });
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    items.forEach((el) => io.observe(el));
  }
  // Confirma para o script do <head> que a revelação está armada. Sem isso ele
  // remove a classe "js" e mostra tudo sem animação.
  document.documentElement.classList.add("ready");
}
