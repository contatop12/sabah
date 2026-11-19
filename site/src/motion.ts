/** Revelação ao rolar e barra fixa do celular. Sem bibliotecas: IntersectionObserver. */
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

  // Barra fixa: aparece quando a primeira dobra sai da tela e some perto do rodapé.
  const dock = document.querySelector<HTMLElement>("[data-dock]");
  const hero = document.querySelector<HTMLElement>(".hero");
  const foot = document.querySelector<HTMLElement>(".foot");
  if (dock && hero && "IntersectionObserver" in window) {
    dock.hidden = false;
    let pastHero = false;
    let atFoot = false;
    const update = (): void => {
      dock.classList.toggle("is-on", pastHero && !atFoot);
    };
    new IntersectionObserver((entries) => {
      pastHero = !entries[0]!.isIntersecting;
      update();
    }).observe(hero);
    if (foot) {
      new IntersectionObserver(
        (entries) => {
          atFoot = entries[0]!.isIntersecting;
          update();
        },
        { threshold: 0.35 },
      ).observe(foot);
    }
  }
}
