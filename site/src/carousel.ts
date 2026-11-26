/**
 * Carrossel dos vídeos de quem visitou. A lista rola na horizontal por conta
 * própria (toque, trackpad ou teclado), sem barra de rolagem à vista. Aqui entram
 * os botões de anterior e próximo, que aparecem quando há mais cards do que cabem
 * na tela, e a rotação automática, que passa um card de cada vez e volta ao começo.
 *
 * A rotação só anda com o carrossel na tela e ninguém mexendo nele: para com o
 * mouse em cima, com foco de teclado dentro, com um vídeo aberto e por alguns
 * segundos depois de um toque ou clique. O botão de pausa desliga até ser tocado
 * de novo. Com "reduzir movimento" ligado no sistema, a troca é seca, sem deslizar.
 */
const AUTO_MS = 4500; // tempo de cada card na rotação
const HOLD_MS = 8000; // espera depois de a pessoa mexer no carrossel

export function initCarousel(): void {
  document.querySelectorAll<HTMLElement>("[data-carousel]").forEach((list) => {
    const nav = list.closest("section")?.querySelector<HTMLElement>("[data-carousel-nav]");
    const prev = nav?.querySelector<HTMLButtonElement>("[data-carousel-prev]");
    const next = nav?.querySelector<HTMLButtonElement>("[data-carousel-next]");
    const toggle = nav?.querySelector<HTMLButtonElement>("[data-carousel-toggle]");
    if (!nav || !prev || !next) return;

    /** Largura de um card mais o espaço até o seguinte. */
    const card = (): number => {
      const item = list.querySelector<HTMLElement>(":scope > li");
      const gap = parseFloat(getComputedStyle(list).columnGap) || 16;
      return (item?.offsetWidth ?? 230) + gap;
    };
    /** Avança o tanto de cards inteiros que cabe na largura visível. */
    const step = (): number => Math.max(card(), Math.floor(list.clientWidth / card()) * card());
    /** Quanto a lista ainda tem para rolar, do começo ao fim. */
    const room = (): number => list.scrollWidth - list.clientWidth;
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

    let ticking = false;
    const update = (): void => {
      ticking = false;
      const max = room();
      nav.hidden = max <= 4;
      prev.disabled = list.scrollLeft <= 4;
      next.disabled = list.scrollLeft >= max - 4;
    };
    const request = (): void => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    // Rotação automática
    let paused = false; // pausa escolhida no botão
    let onScreen = false;
    let hovering = false;
    let holdUntil = 0;
    const hold = (): void => {
      holdUntil = performance.now() + HOLD_MS;
    };
    const busy = (): boolean => {
      const focused = document.activeElement;
      const keyboard =
        focused instanceof HTMLElement && (list.contains(focused) || nav.contains(focused)) && focused.matches(":focus-visible");
      return (
        paused || !onScreen || hovering || keyboard || document.hidden ||
        performance.now() < holdUntil || document.querySelector("dialog[open]") !== null
      );
    };
    const advance = (): void => {
      const max = room();
      if (max <= 4 || busy()) return;
      if (list.scrollLeft >= max - 4) list.scrollTo({ left: 0, behavior });
      else list.scrollBy({ left: card(), behavior });
    };

    prev.addEventListener("click", () => {
      hold();
      list.scrollBy({ left: -step(), behavior });
    });
    next.addEventListener("click", () => {
      hold();
      list.scrollBy({ left: step(), behavior });
    });
    list.addEventListener("pointerenter", (event) => {
      hovering = event.pointerType === "mouse";
    });
    list.addEventListener("pointerleave", () => {
      hovering = false;
    });
    for (const type of ["pointerdown", "wheel", "touchstart", "keydown"] as const) {
      list.addEventListener(type, hold, { passive: true });
    }
    list.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });
    window.addEventListener("load", request, { once: true });
    update();

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        (entries) => {
          onScreen = entries[entries.length - 1]?.isIntersecting ?? false;
        },
        { threshold: 0.5 },
      ).observe(list);
      window.setInterval(advance, AUTO_MS);

      if (toggle) {
        const icon = toggle.querySelector("use");
        toggle.hidden = false;
        toggle.addEventListener("click", () => {
          paused = !paused;
          toggle.setAttribute("aria-label", paused ? "Retomar a rotação dos vídeos" : "Pausar a rotação dos vídeos");
          icon?.setAttribute("href", paused ? "#i-play" : "#i-pause");
        });
      }
    }
  });
}
