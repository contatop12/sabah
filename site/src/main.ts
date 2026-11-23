import "./styles/main.css";
import { initNav } from "./nav.ts";
import { initMotion } from "./motion.ts";
import { initOpenStatus } from "./hours.ts";
import { initVideo } from "./video.ts";
import { initQuote } from "./quote.ts";
import { initTracking } from "./tracking.ts";

// Cada parte inicia isolada: uma falha no menu não pode impedir as fotos de aparecer.
for (const init of [initNav, initMotion, initOpenStatus, initVideo, initQuote, initTracking]) {
  try {
    init();
  } catch (error) {
    console.error(error);
  }
}
