import "./styles/main.css";
import { initNav } from "./nav.ts";
import { initMotion } from "./motion.ts";
import { initOpenStatus } from "./hours.ts";
import { initVideo } from "./video.ts";
import { initQuote } from "./quote.ts";
import { initTracking } from "./tracking.ts";
import { initWhatsapp } from "./whatsapp.ts";
import { initTabs } from "./tabs.ts";
import { initCarousel } from "./carousel.ts";
import { initPlayer } from "./player.ts";

// Cada parte inicia isolada: uma falha no menu não pode impedir as fotos de aparecer.
for (const init of [initNav, initMotion, initTabs, initCarousel, initPlayer, initOpenStatus, initVideo, initQuote, initWhatsapp, initTracking]) {
  try {
    init();
  } catch (error) {
    console.error(error);
  }
}
