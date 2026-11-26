// Testes do que o Worker já fazia antes do blog (vídeo em trechos, portas do cPanel) e do roteamento do blog que não depende de HTMLRewriter:
// /p12-kit/* fechado a visitantes, redirecionamentos, home e sitemap iguais ao build enquanto não há posts (ou o D1 falha), cache de leitura.
import { beforeEach, describe, expect, it } from 'vitest';
import { chaveDoCache, comCache, limparCaches, TTL_FALHA_MS, TTL_MS } from '../worker/p12/cache';
import { servirSite } from '../worker/p12/site';
import { CPANEL_PORTS, parseRange, redirecionarPorta, servirVideo } from '../worker/video';

describe('vídeo: parseRange', () => {
  it('lê um intervalo simples, sem fim e dos últimos bytes', () => {
    expect(parseRange('bytes=0-99', 1000)).toEqual([0, 99]);
    expect(parseRange('bytes=500-', 1000)).toEqual([500, 999]);
    expect(parseRange('bytes=-200', 1000)).toEqual([800, 999]);
    expect(parseRange('bytes=900-5000', 1000)).toEqual([900, 999]);
    expect(parseRange(' bytes=0-0 ', 1000)).toEqual([0, 0]);
  });

  it('devolve "fora" quando o intervalo não existe no arquivo (416)', () => {
    expect(parseRange('bytes=1000-', 1000)).toBe('fora');
    expect(parseRange('bytes=50-10', 1000)).toBe('fora');
    expect(parseRange('bytes=-0', 1000)).toBe('fora');
  });

  it('devolve null (arquivo inteiro) quando não é um intervalo simples', () => {
    expect(parseRange('bytes=0-10,20-30', 1000)).toBeNull();
    expect(parseRange('bytes=-', 1000)).toBeNull();
    expect(parseRange('items=0-10', 1000)).toBeNull();
  });
});

describe('portas do cPanel', () => {
  it('redireciona as portas do webmail, do cPanel e do WHM para os subdomínios (302) e deixa as outras seguirem', () => {
    const esperado: Record<string, string> = { 2096: 'webmail', 2095: 'webmail', 2083: 'cpanel', 2082: 'cpanel', 2087: 'whm', 2086: 'whm' };
    expect(CPANEL_PORTS).toEqual(esperado);
    for (const [porta, servico] of Object.entries(esperado)) {
      const r = redirecionarPorta(new URL(`https://sabah.com.br:${porta}/`))!;
      expect(r.status).toBe(302);
      expect(r.headers.get('location')).toBe(`https://${servico}.sabah.com.br/`);
    }
    expect(redirecionarPorta(new URL('https://sabah.com.br/'))).toBeNull();
    expect(redirecionarPorta(new URL('https://sabah.com.br:8443/blog/'))).toBeNull();
  });
});

describe('vídeo em trechos (/video/*)', () => {
  it('sem Range devolve o arquivo como está; arquivo fora da lista de tamanhos não vira 206', async () => {
    const env = { ASSETS: { fetch: async () => new Response('video', { status: 200, headers: { etag: '"x"' } }) } as unknown as Fetcher };
    const ctx = { waitUntil: () => {} };
    const r = await servirVideo(new Request('https://sabah.com.br/video/nao-existe.mp4', { headers: { Range: 'bytes=0-1' } }), env, ctx);
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('video');
  });
});

// ------------------------------------------------------------------------------------------------ roteamento

/** Um D1 de mentira: sempre vazio (sem posts), ou que sempre falha. */
function bancoVazio(): D1Database {
  const stmt = { bind: () => stmt, all: async () => ({ results: [] }), first: async () => null, run: async () => ({}) };
  return { prepare: () => stmt, batch: async () => [] } as unknown as D1Database;
}
function bancoQueFalha(): D1Database {
  return { prepare: () => { throw new Error('D1 fora'); }, batch: async () => { throw new Error('D1 fora'); } } as unknown as D1Database;
}

const HOME = '<!doctype html><html><body><nav class="nav"><a data-spy="perguntas" href="/#perguntas">FAQ</a></nav><section class="closing"></section></body></html>';
function ambiente(db: D1Database) {
  const pedidos: string[] = [];
  const ASSETS = {
    fetch: async (req: Request) => {
      const { pathname } = new URL(req.url);
      pedidos.push(pathname);
      if (pathname === '/') return new Response(HOME, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
      if (pathname === '/sitemap.xml') return new Response('<urlset></urlset>', { status: 200, headers: { 'content-type': 'application/xml' } });
      if (pathname === '/p12-nao-existe/') return new Response('nao achei', { status: 404, headers: { 'content-type': 'text/html' } });
      if (pathname === '/p12-kit/config.json') return new Response('{"graphBase":[]}', { status: 200 });
      return new Response('arquivo', { status: 200 });
    },
  } as unknown as Fetcher;
  return { env: { ASSETS, DB: db }, pedidos };
}

describe('roteamento do blog', () => {
  beforeEach(async () => {
    await limparCaches();
  });

  it('o modelo do build (/p12-kit/*) é 404 para visitantes', async () => {
    const { env } = ambiente(bancoVazio());
    for (const caminho of ['/p12-kit/modelo/', '/p12-kit/config.json', '/p12-kit/']) {
      const r = await servirSite(new Request(`https://sabah.com.br${caminho}`), env);
      expect(r.status, caminho).toBe(404);
    }
  });

  it('/blog sem a barra vai para /blog/ (301), e o que não é post sob /blog/ é 404', async () => {
    const { env } = ambiente(bancoVazio());
    const r = await servirSite(new Request('https://sabah.com.br/blog?page=2'), env);
    expect(r.status).toBe(301);
    expect(r.headers.get('location')).toBe('/blog/?page=2');
    // sem posts, nenhum slug existe
    const post = await servirSite(new Request('https://sabah.com.br/blog/nao-existe/'), env);
    expect(post.status).toBe(404);
    const fundo = await servirSite(new Request('https://sabah.com.br/blog/a/b/c/'), env);
    expect(fundo.status).toBe(404);
    const categoria = await servirSite(new Request('https://sabah.com.br/blog/categoria/receitas/'), env);
    expect(categoria.status).toBe(404);
    const semBarra = await servirSite(new Request('https://sabah.com.br/blog/categoria/receitas'), env);
    expect(semBarra.status).toBe(301);
  });

  it('o feed não existe enquanto não há posts', async () => {
    const { env } = ambiente(bancoVazio());
    expect((await servirSite(new Request('https://sabah.com.br/feed.xml'), env)).status).toBe(404);
  });

  it('sem posts a home e o sitemap saem exatamente como o build fez', async () => {
    const { env } = ambiente(bancoVazio());
    const home = await servirSite(new Request('https://sabah.com.br/'), env);
    expect(home.status).toBe(200);
    expect(await home.text()).toBe(HOME);
    const sitemap = await servirSite(new Request('https://sabah.com.br/sitemap.xml'), env);
    expect(await sitemap.text()).toBe('<urlset></urlset>');
  });

  it('com o D1 fora a home e o sitemap continuam estáticos, e a segunda visita não espera o banco de novo', async () => {
    const { env } = ambiente(bancoQueFalha());
    const home = await servirSite(new Request('https://sabah.com.br/'), env);
    expect(home.status).toBe(200);
    expect(await home.text()).toBe(HOME);
    const sitemap = await servirSite(new Request('https://sabah.com.br/sitemap.xml'), env);
    expect(await sitemap.text()).toBe('<urlset></urlset>');
  });

  it('páginas fora do blog e outros métodos seguem para os arquivos estáticos', async () => {
    const { env, pedidos } = ambiente(bancoVazio());
    expect((await servirSite(new Request('https://sabah.com.br/login/'), env)).status).toBe(200);
    expect((await servirSite(new Request('https://sabah.com.br/blog/', { method: 'POST' }), env)).status).toBe(200);
    expect(pedidos).toEqual(['/login/', '/blog/']);
  });
});

describe('cache de leitura', () => {
  beforeEach(async () => {
    await limparCaches();
  });

  it('lê o banco uma vez dentro do TTL e de novo depois dele, e limparCaches esquece tudo', async () => {
    let t = 1_000;
    let leituras = 0;
    const ler = async () => ++leituras;
    const get = () => comCache<number>('blog', ler, () => {}, 0, () => t);
    expect(await get()).toBe(1);
    t += TTL_MS - 1;
    expect(await get()).toBe(1);
    t += 2;
    expect(await get()).toBe(2);
    await limparCaches();
    expect(await get()).toBe(3);
  });

  it('falha do banco devolve o vazio, avisa, e só tenta de novo depois de 10 s', async () => {
    let t = 1_000;
    let tentativas = 0;
    const erros: unknown[] = [];
    const get = () => comCache<number[]>('trocas', async () => { tentativas++; throw new Error('D1 fora'); }, (e) => erros.push(e), [], () => t);
    expect(await get()).toEqual([]);
    expect(await get()).toEqual([]);
    expect(tentativas).toBe(1);
    t += TTL_FALHA_MS + 1;
    await get();
    expect(tentativas).toBe(2);
    expect(erros).toHaveLength(2);
  });

  it('a chave da Cache API é interna ao domínio do site e nunca uma página', () => {
    expect(chaveDoCache('blog')).toBe('https://sabah.com.br/__p12-cache/blog-v1');
  });
});
