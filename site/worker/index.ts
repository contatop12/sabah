/**
 * Worker do sabah-site. Só entra nos caminhos de "assets.run_worker_first" (wrangler.jsonc); o resto do site sai direto dos arquivos
 * estáticos, sem passar por aqui.
 *
 *   portas do cPanel         sabah.com.br:2096 etc. levam ao subdomínio do serviço (worker/video.ts)
 *   /video/*                 vídeos em trechos (206), que o Safari exige (worker/video.ts)
 *   POST /api/p12/webhook    recebimento dos posts do Rankeando, contrato v3 (worker/p12/webhook.ts)
 *   /blog, /sitemap.xml, /feed.xml, /, /p12-kit/*   o blog do Rankeando (worker/p12/site.ts)
 *
 * Segredo (NÃO vai para o git): npx wrangler secret put RANKEANDO_WEBHOOK_SECRET
 * Local: copie .dev.vars.example para .dev.vars.
 * Tipos de Env: worker/worker-configuration.d.ts (gerado por `npm run cf:types`) e worker/env.d.ts (segredos).
 */
import { limparCaches } from './p12/cache';
import { segredoDoRankeando } from './p12/assinatura';
import { categoriasDoSite, fonteDoSite, servirSite, slugDoSite } from './p12/site';
import { D1Store } from './p12/store';
import { handleP12Webhook, P12_WEBHOOK_PATH } from './p12/webhook';
import { redirecionarPorta, servirVideo } from './video';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    const porta = redirecionarPorta(url);
    if (porta) return porta;

    if (url.pathname.startsWith('/video/')) return servirVideo(request, env, ctx);

    // Recebimento dos posts do Rankeando (contrato v3): a assinatura é a autenticação e é conferida antes de qualquer outra coisa.
    if (url.pathname === P12_WEBHOOK_PATH || url.pathname === `${P12_WEBHOOK_PATH}/`) {
      return handleP12Webhook(request, {
        segredo: segredoDoRankeando({ RANKEANDO_WEBHOOK_SECRET: env.RANKEANDO_WEBHOOK_SECRET, P12_WEBHOOK_SECRET: env.P12_WEBHOOK_SECRET }),
        store: new D1Store(env.DB),
        site: fonteDoSite(),
        slugDoSite,
        categoriasDoSite,
        agora: Math.floor(Date.now() / 1000),
        aoMudarTrocas: () => ctx.waitUntil(limparCaches()),
      });
    }
    if (url.pathname.startsWith('/api/')) return json({ ok: false, erro: 'nao_encontrado' }, 404);

    // Blog, sitemap, feed, home com o blog e o resto (que sai como o build fez, inclusive o que só passou aqui para conferir a porta).
    return servirSite(request, env);
  },
} satisfies ExportedHandler<Env>;
