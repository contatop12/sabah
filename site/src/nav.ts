/** Menu compacto, submenu do Cardápio, cabeçalho que some ao descer, destaque da seção atual e âncoras antigas. */

/** Âncoras do site anterior (WordPress) -> seções novas. Mantém links antigos funcionando. */
const LEGACY: Record<string, string> = {
  pratosprincipais: "buffet",
  comochegar: "como-chegar",
  quemsomos: "historia",
  ifood: "delivery",
  parceiros: "reconhecimentos",
  guiasgastronomicos: "reconhecimentos",
  guiagastronomico: "reconhecimentos",
  elesrecomendam: "quem-visitou",
};

/** Largura a partir da qual o menu aparece inteiro no cabeçalho (igual ao CSS). */
const WIDE = "(min-width: 1180px)";

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
  // Tocar num link (âncora ou externo) fecha o menu compacto.
  nav.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) setOpen(false);
  });

  // Submenu do Cardápio. O texto "Cardápio" é um link para a página completa;
  // a seta é um botão separado que abre e fecha os subitens.
  const sub = nav.querySelector<HTMLElement>("[data-submenu]");
  const subToggle = sub?.querySelector<HTMLButtonElement>("[data-submenu-toggle]") ?? null;
  const subLabel = sub?.querySelector<HTMLElement>("[data-submenu-label]") ?? null;
  const subIsOpen = (): boolean => subToggle?.getAttribute("aria-expanded") === "true";
  const setSub = (open: boolean): void => {
    if (!sub || !subToggle) return;
    sub.classList.toggle("is-open", open);
    subToggle.setAttribute("aria-expanded", String(open));
    if (subLabel) subLabel.textContent = open ? "Fechar submenu do cardápio" : "Abrir submenu do cardápio";
  };
  if (sub && subToggle) {
    subToggle.addEventListener("click", () => setSub(!subIsOpen()));
    // Com mouse, no menu inteiro: abre ao passar o ponteiro e fica aberto enquanto ele estiver sobre o item ou o submenu.
    const hoverable = window.matchMedia(`${WIDE} and (hover: hover)`);
    sub.addEventListener("pointerenter", (e) => {
      if (hoverable.matches && e.pointerType === "mouse") setSub(true);
    });
    sub.addEventListener("pointerleave", (e) => {
      if (hoverable.matches && e.pointerType === "mouse") setSub(false);
    });
    // No menu inteiro, sair do item com o teclado ou clicar fora fecha o submenu.
    sub.addEventListener("focusout", (e) => {
      const next = e.relatedTarget as Node | null;
      if (window.matchMedia(WIDE).matches && (!next || !sub.contains(next))) setSub(false);
    });
    document.addEventListener("click", (e) => {
      if (subIsOpen() && !sub.contains(e.target as Node)) setSub(false);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    // Esc fecha primeiro o submenu e devolve o foco à seta; depois, o menu compacto.
    if (subIsOpen() && subToggle) {
      setSub(false);
      subToggle.focus();
      return;
    }
    if (toggle.getAttribute("aria-expanded") === "true") {
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
  // A primeira dobra apresenta o almoço e o jantar: enquanto ela está na tela, esse item fica ativo.
  const hero = document.getElementById("inicio");
  const sectionId = (el: Element): string => (el === hero ? "buffet" : el.id);
  if (hero && links.has("buffet")) sections.unshift(hero);
  if (sections.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          links.forEach((a, id) => {
            const on = id === sectionId(entry.target);
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
