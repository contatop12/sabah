/**
 * Popup da campanha de votação (GoWhere).
 *
 * Markup esperado: <dialog id="vote-modal" class="modal"> … <button data-close>…</button> </dialog>
 *
 * - Abre sozinho pouco depois do carregamento, uma vez por sessão (sessionStorage).
 * - Fecha por botão, Esc (nativo do <dialog>) ou clique no fundo.
 * - Elementos com data-open="vote-modal" reabrem o popup.
 */

const SEEN_KEY = "sabah-vote-popup";
const OPEN_DELAY_MS = 900;

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // sessionStorage indisponível (modo privado etc.): só não lembra.
  }
}

export function initVoteModal(modal: HTMLDialogElement | null): void {
  if (!modal || typeof modal.showModal !== "function") return;

  const open = (): void => {
    if (!modal.open) modal.showModal();
  };
  const close = (): void => {
    if (modal.open) modal.close();
  };

  for (const btn of modal.querySelectorAll<HTMLElement>("[data-close]")) {
    btn.addEventListener("click", close);
  }

  // Clique no fundo (fora da caixa) fecha.
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });

  // Clique no link de votar fecha o popup (o link abre em nova aba).
  for (const link of modal.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    link.addEventListener("click", close);
  }

  for (const trigger of document.querySelectorAll<HTMLElement>('[data-open="vote-modal"]')) {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      open();
    });
  }

  if (!alreadySeen()) {
    markSeen();
    window.setTimeout(open, OPEN_DELAY_MS);
  }
}
