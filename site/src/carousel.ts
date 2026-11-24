/**
 * Carrossel dos vídeos de quem visitou. A lista rola na horizontal por conta
 * própria (toque, trackpad ou teclado); aqui só entram os botões de anterior
 * e próximo, que aparecem quando há mais cards do que cabem na tela.
 */
export function initCarousel(): void {
  document.querySelectorAll<HTMLElement>("[data-carousel]").forEach((list) => {
    const nav = list.closest("section")?.querySelector<HTMLElement>("[data-carousel-nav]");
    const prev = nav?.querySelector<HTMLButtonElement>("[data-carousel-prev]");
    const next = nav?.querySelector<HTMLButtonElement>("[data-carousel-next]");
    if (!nav || !prev || !next) return;

    /** Avança o tanto de cards inteiros que cabe na largura visível. */
    const step = (): number => {
      const item = list.querySelector<HTMLElement>(":scope > li");
      const gap = parseFloat(getComputedStyle(list).columnGap) || 16;
      const width = (item?.offsetWidth ?? 230) + gap;
      return Math.max(width, Math.floor(list.clientWidth / width) * width);
    };
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

    let ticking = false;
    const update = (): void => {
      ticking = false;
      const max = list.scrollWidth - list.clientWidth;
      nav.hidden = max <= 4;
      prev.disabled = list.scrollLeft <= 4;
      next.disabled = list.scrollLeft >= max - 4;
    };
    const request = (): void => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    prev.addEventListener("click", () => list.scrollBy({ left: -step(), behavior }));
    next.addEventListener("click", () => list.scrollBy({ left: step(), behavior }));
    list.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });
    window.addEventListener("load", request, { once: true });
    update();
  });
}
