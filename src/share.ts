/**
 * Botão "compartilhar": usa a Web Share API quando disponível (mobile);
 * senão copia o link e mostra um aviso curto.
 */

const TOAST_MS = 2200;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

function showToast(toast: HTMLElement | null, message: string): void {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), TOAST_MS);
}

function pageUrl(): string {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  return canonical?.href || location.href;
}

export function initShare(button: HTMLElement | null, toast: HTMLElement | null): void {
  if (!button) return;

  button.addEventListener("click", async () => {
    const data: ShareData = { title: document.title, url: pageUrl() };

    try {
      if (typeof navigator.share === "function") {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(data.url ?? "");
      showToast(toast, "Link copiado");
    } catch (err) {
      // Usuário fechou a folha de compartilhamento: não é erro.
      if (err instanceof DOMException && err.name === "AbortError") return;
      showToast(toast, "Não foi possível compartilhar");
    }
  });
}
