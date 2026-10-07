import { initAccordions } from "./accordion";
import { initTracking } from "./tracking";
import { initVoteModal } from "./modal";

initAccordions(document.querySelectorAll<HTMLButtonElement>("button[aria-controls]"));
initTracking(document);
initVoteModal(document.querySelector<HTMLDialogElement>("#vote-modal"));
