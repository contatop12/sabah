// Segredos do Worker (não aparecem no wrangler.jsonc, então `wrangler types` não os conhece).
interface Env {
  /** Chave do recebimento dos posts do Rankeando: npx wrangler secret put RANKEANDO_WEBHOOK_SECRET */
  RANKEANDO_WEBHOOK_SECRET?: string;
  /** Nome antigo da mesma chave (pacotes antigos): só é lido se a nova não existir. */
  P12_WEBHOOK_SECRET?: string;
}
