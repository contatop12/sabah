/** Vídeo por clique: nada é baixado até a pessoa pedir. */
export function initVideo(): void {
  document.querySelectorAll<HTMLElement>("[data-video]").forEach((box) => {
    const video = box.querySelector<HTMLVideoElement>("video");
    const cover = box.querySelector<HTMLButtonElement>("[data-video-play]");
    if (!video || !cover) return;
    cover.addEventListener("click", () => {
      video.hidden = false;
      cover.hidden = true;
      video.preload = "auto";
      video.play().catch(() => {
        /* se o navegador bloquear, os controles nativos continuam visíveis */
      });
      video.focus();
    });
  });
}
