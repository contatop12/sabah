import { defineConfig } from "vitest/config";

// Testes do Worker (recebimento do Rankeando, páginas do blog, vídeo e portas do cPanel): nada de rede nem de Cloudflare.
export default defineConfig({ test: { include: ["tests/**/*.test.ts"], environment: "node" } });
