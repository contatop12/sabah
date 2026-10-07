import { initAccordions } from "./accordion";
import { initTracking } from "./tracking";

initAccordions(document.querySelectorAll<HTMLButtonElement>("button[aria-controls]"));
initTracking(document);
