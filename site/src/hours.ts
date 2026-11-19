/** "Aberto agora": calcula pelo horário de São Paulo a partir de CONFIG.hours.spec. */
import { CONFIG } from "./config.ts";

function saoPauloNow(): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function toMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function pretty(hhmm: string): string {
  return hhmm.replace(":", "h").replace(/h00$/, "h");
}

export function initOpenStatus(): void {
  const targets = document.querySelectorAll<HTMLElement>("[data-open-status]");
  if (!targets.length) return;

  const render = (): void => {
    const { day, minutes } = saoPauloNow();
    if (day < 0) return;
    const today = CONFIG.hours.spec.filter((s) => (s.days as readonly number[]).includes(day));
    const current = today.find((s) => minutes >= toMinutes(s.opens) && minutes < toMinutes(s.closes));
    const next = today.find((s) => minutes < toMinutes(s.opens));
    let text: string;
    if (current) text = `Aberto agora: ${current.label.toLowerCase()} até ${pretty(current.closes)}`;
    else if (next) text = `Abre hoje às ${pretty(next.opens)} para o ${next.label.toLowerCase()}`;
    else text = "Fechado agora. Amanhã tem almoço";
    targets.forEach((el) => {
      el.classList.toggle("is-open-now", !!current);
      const dot = document.createElement("span");
      dot.className = "status-dot";
      dot.setAttribute("aria-hidden", "true");
      el.replaceChildren(dot, text);
    });
  };
  render();
  window.setInterval(render, 60_000);
}
