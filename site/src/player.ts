/**
 * Vídeos de quem visitou: tocam dentro da página, numa janela sobre o conteúdo.
 *
 * Nada de vídeo é baixado até o clique. Cada card com arquivo próprio é um link
 * para o MP4 (public/video), marcado com data-player; aqui o clique abre a janela,
 * aponta o <video> para o arquivo e dá o play. Ao fechar ou trocar de vídeo, a
 * fonte é removida para o navegador interromper o download e liberar a memória.
 * Sem JavaScript ou sem <dialog>, o link abre o arquivo direto no navegador.
 *
 * Mensuração: video_click, com location = "visitou-<id>".
 */
import { track } from "./tracking.ts";

export function initPlayer(): void {
  const dialog = document.querySelector<HTMLDialogElement>("[data-player-dialog]");
  const video = dialog?.querySelector<HTMLVideoElement>("[data-player-video]");
  const triggers = [...document.querySelectorAll<HTMLAnchorElement>("a[data-player]")];
  if (!dialog || !video || !triggers.length || typeof dialog.showModal !== "function") return;

  const part = <T extends HTMLElement>(name: string): T | null => dialog.querySelector<T>(`[data-player-${name}]`);
  const creator = part("creator");
  const handle = part("handle");
  const title = part("title");
  const post = part<HTMLAnchorElement>("post");
  const prev = part<HTMLButtonElement>("prev");
  const next = part<HTMLButtonElement>("next");
  const count = part("count");

  let current = -1;

  /** Para o vídeo e solta o arquivo: sem isso o navegador continua baixando em segundo plano. */
  const unload = (): void => {
    video.pause();
    video.removeAttribute("src");
    video.load();
  };

  const show = (index: number): void => {
    const data = triggers[index]?.dataset;
    if (!data) return;
    current = index;
    unload();
    dialog.style.setProperty("--ar", `${data.w ?? 9} / ${data.h ?? 16}`);
    video.poster = data.poster ?? "";
    video.src = triggers[index].href;
    if (creator) creator.textContent = data.creator ?? "";
    if (handle) handle.textContent = data.handle ?? "";
    if (title) title.textContent = data.title ?? "";
    if (post) post.href = data.post ?? "#";
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === triggers.length - 1;
    if (count) count.textContent = `Vídeo ${index + 1} de ${triggers.length}`;
    track("video_click", `visitou-${data.id ?? index}`);
    video.play().catch(() => {
      /* se o navegador bloquear o início automático, os controles continuam na tela */
    });
  };

  triggers.forEach((trigger, index) =>
    trigger.addEventListener("click", (e) => {
      // Ctrl, Shift ou botão do meio: a pessoa pediu outra aba; o link segue normal.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      dialog.showModal();
      show(index);
      video.focus({ preventScroll: true });
    }),
  );

  prev?.addEventListener("click", () => show(current - 1));
  next?.addEventListener("click", () => show(current + 1));
  part("close")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close(); // clique fora do vídeo fecha
  });
  // Esc, botão de fechar ou clique fora: tudo passa por aqui.
  dialog.addEventListener("close", () => {
    unload();
    video.removeAttribute("poster");
    current = -1;
  });
}
