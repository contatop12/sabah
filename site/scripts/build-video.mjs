/**
 * VÍDEOS DE QUEM VISITOU: prepara os arquivos que tocam dentro da página.
 *
 *   npm run video
 *
 * Lê os originais em media-src/video/<id>.mp4 (o <id> é o mesmo de VISITOR_VIDEOS,
 * em src/content.ts) e grava a versão para a web em public/video/visitou-<id>.mp4:
 * H.264 em até 720 x 1280, qualidade constante, áudio preservado e índice no começo
 * do arquivo ("faststart"), para o vídeo começar a tocar enquanto ainda baixa.
 * As medidas de cada vídeo vão para src/videos.json, que o build usa para montar
 * o carrossel: card com arquivo toca na página; card sem arquivo abre o Instagram.
 *
 * Os originais não vão para o git (são pesados). Sem o original, o vídeo já
 * publicado em public/video continua valendo. Precisa de ffmpeg e ffprobe no PATH.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { basename, resolve } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC = resolve(ROOT, "media-src/video");
const OUT = resolve(ROOT, "public/video");
const INDEX = resolve(ROOT, "src/videos.json");

const MAX_HEIGHT = 1280;
const CRF = "29"; // testado em 26/11/2026: 37% menor que o original, sem perda visível

function probe(file) {
  const out = execFileSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file],
    { encoding: "utf8" },
  );
  const data = JSON.parse(out);
  return {
    width: data.streams[0].width,
    height: data.streams[0].height,
    duration: Math.round(Number(data.format.duration)),
  };
}

try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
} catch {
  console.error("ffmpeg não encontrado. Instale o ffmpeg e rode de novo.");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, "utf8")) : {};
const masters = existsSync(SRC) ? readdirSync(SRC).filter((f) => f.endsWith(".mp4")).sort() : [];

for (const file of masters) {
  const id = basename(file, ".mp4");
  const name = `visitou-${id}.mp4`;
  const target = resolve(OUT, name);
  execFileSync(
    "ffmpeg",
    [
      "-v", "error", "-y", "-i", resolve(SRC, file),
      "-map", "0:v:0", "-map", "0:a:0?",
      "-c:v", "libx264", "-preset", "slow", "-crf", CRF, "-maxrate", "1400k", "-bufsize", "2800k",
      "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p",
      "-vf", `scale=-2:'min(${MAX_HEIGHT},ih)':flags=lanczos`,
      "-g", "90",
      "-c:a", "copy",
      "-map_metadata", "-1", "-movflags", "+faststart",
      target,
    ],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
  const before = statSync(resolve(SRC, file)).size;
  const bytes = statSync(target).size;
  index[id] = { src: `/video/${name}`, ...probe(target), bytes };
  const mb = (n) => (n / 1048576).toFixed(2).padStart(6);
  console.log(`${id.padEnd(16)} ${index[id].width}x${index[id].height}  ${String(index[id].duration).padStart(3)} s  ${mb(before)} MB -> ${mb(bytes)} MB`);
}

// Tira do índice o que não existe mais em public/video.
for (const id of Object.keys(index)) {
  if (!existsSync(resolve(ROOT, "public", index[id].src.slice(1)))) delete index[id];
}

const sorted = Object.fromEntries(Object.keys(index).sort().map((id) => [id, index[id]]));
writeFileSync(INDEX, JSON.stringify(sorted, null, 2) + "\n");
const total = Object.values(sorted).reduce((sum, v) => sum + v.bytes, 0);
console.log(`\n${Object.keys(sorted).length} vídeos, ${(total / 1048576).toFixed(1)} MB em public/video (${masters.length} processados agora)`);
