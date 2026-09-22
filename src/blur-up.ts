/**
 * Efeito "blur-up": a imagem começa desfocada (classe `.blur-up`) e recebe
 * `.is-loaded` assim que termina de carregar. Replica o comportamento do
 * lazysizes usado no site original, sem dependência externa.
 */

const LOADED_CLASS = "is-loaded";

function markLoaded(img: HTMLImageElement): void {
  img.classList.add(LOADED_CLASS);
}

export function initBlurUp(images: Iterable<HTMLImageElement>): void {
  for (const img of images) {
    // Já veio do cache: não faz sentido mostrar o blur.
    if (img.complete && img.naturalWidth > 0) {
      markLoaded(img);
      continue;
    }

    img.addEventListener("load", () => markLoaded(img), { once: true });
    // Em caso de erro, remove o blur para não deixar o alt desfocado.
    img.addEventListener("error", () => markLoaded(img), { once: true });
  }
}
