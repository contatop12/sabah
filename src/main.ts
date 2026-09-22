import { initBlurUp } from "./blur-up";
import { initShare } from "./share";

initBlurUp(document.querySelectorAll<HTMLImageElement>("img.blur-up"));
initShare(document.getElementById("share"), document.getElementById("toast"));
