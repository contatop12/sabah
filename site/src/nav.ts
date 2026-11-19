/** Menu mobile, cabeçalho que some ao descer, destaque da seção atual e âncoras antigas. */

/** Âncoras do site anterior (WordPress) -> seções novas. Mantém links antigos funcionando. */
const LEGACY: Record<string, string> = {
  pratosprincipais: "buffet",
  comochegar: "como-chegar",
  quemsomos: "historia",
  ifood: "delivery",
  parceiros: "reconhecimentos",
  guiasgastronomicos: "reconhecimentos",
  guiagastronomico: "reconhecimentos",
  elesrecomendam: "avaliacoes",
};

export function initNav(): void {
  const header = document.querySelector<HTMLElement>("[data-header]");
  const nav = document.querySelector<HTMLElement>("[data-nav]");
  const toggle = document.querySelector<HTMLButtonElement>("[data-nav-toggle]");
  if (!header || !nav || !toggle) return;

  const setOpen = (open: boolean): void => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    const label = toggle.querySelector(".top__toggle-label");
    if (label) label.textContent = open ? "Fechar" : "Menu";
  };
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      toggle.focus();
    }
  });

  // Cabeçalho: sombra depois de rolar; some ao descer e volta ao subir.
  let last = window.scrollY;
  let ticking = false;
  const onScroll = (): void => {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 8);
    const menuOpen = toggle.getAttribute("aria-expanded") === "true";
    if (!menuOpen && Math.abs(y - last) > 6) {
      header.classList.toggle("is-hidden", y > last && y > 420);
      last = y;
    }
    ticking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true },
  );
  header.addEventListener("focusin", () => header.classList.remove("is-hidden"));

  // Destaque do item de menu da seção visível.
  const links = new Map<string, HTMLAnchorElement>();
  document.querySelectorAll<HTMLAnchorElement>("[data-spy]").forEach((a) => links.set(a.dataset.spy!, a));
  const sections = [...links.keys()].map((id) => document.getElementById(id)).filter((s): s is HTMLElement => !!s);
  if (sections.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          links.forEach((a, id) => {
            const on = id === entry.target.id;
            a.classList.toggle("is-current", on);
            if (on) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
          });
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.forEach((s) => spy.observe(s));
  }

  // Âncoras antigas (#comochegar, #quemsomos…) levam à seção nova.
  const alias = LEGACY[location.hash.slice(1).toLowerCase()];
  const target = alias ? document.getElementById(alias) : null;
  if (alias && target) {
    history.replaceState(null, "", `#${alias}`);
    target.scrollIntoView();
  }
}
