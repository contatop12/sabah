// As páginas do site que passam pelo Worker. Tudo o que não é do Rankeando sai do jeito que o build fez (arquivos estáticos):
//   /blog/                   lista paginada dos posts (sem posts: uma página amigável com noindex)
//   /blog/<slug>/            um post do Rankeando (D1)
//   /blog/categoria/<slug>/  uma categoria do Rankeando (404 sem post)
//   /sitemap.xml, /feed.xml  o sitemap do build com os posts e as categorias; o feed só existe quando há posts
//   /                        a home estática, com o link "Blog" e a seção "Do blog" quando há ao menos um post
//   /p12-kit/*               o modelo de página do build: nenhum visitante o vê (404)
// Sem posts, o site é o que o build fez. Se o D1 ou o modelo falharem, a página estática sai (a home, o sitemap) ou "indisponível" (as do blog).
import { SITE_URL } from './constantes';
import { comCache } from './cache';
import { SLUG } from './contrato';
import { prepararConteudo } from './conteudo';
import { homeComBlog, montarPagina } from './pagina';
import { comTrocaNoCartao, comTrocaNoPost, comTrocaNoResumo, trocaDoPublisher, trocasPorId, urlDoPostDoPublisher, type FonteDoSite } from './posts';
import {
  cartaoHtml, familiaDaCategoria, feedXml, grafoDeLista, metaDoPost, mioloDaLista, mioloDoBlogVazio, mioloDoPost, paginacaoHtml, secaoDaHome, sitemapMesclado, slugsDoPost,
  POR_PAGINA, type CartaoDoRankeando, type ChipDeCategoria, type Passo,
} from './render';
import { D1Store, type CategoriaComPosts, type Resumo, type Substituicao } from './store';

export type SiteEnv = { ASSETS: Fetcher; DB: D1Database };

type Kit = { graphBase: unknown[] };

const asset = (env: SiteEnv, origin: string, path: string) => env.ASSETS.fetch(new Request(new URL(path, origin)));
const log = (message: string, e: unknown) => console.error({ message, error: e instanceof Error ? e.message : String(e) });
// Sem cache no navegador: um slug antigo pode virar outro post depois.
const redirect = (location: string) => new Response(null, { status: 301, headers: { location, 'cache-control': 'no-cache' } });
/** A página 404 do site (not_found_handling), com o status 404. */
const naoExiste = (env: SiteEnv, origin: string) => asset(env, origin, '/p12-nao-existe/');

/** Slugs de uma só parte que o blog usa para outra coisa: um post do Rankeando não pode tomá-los. */
const RESERVADOS = new Set(['categoria', 'page']);

// O kit só muda com um deploy, e um deploy começa isolates novos.
let kitDoDeploy: Kit | null = null;
async function carregarKit(env: SiteEnv, origin: string): Promise<Kit> {
  if (kitDoDeploy) return kitDoDeploy;
  const r = await asset(env, origin, '/p12-kit/config.json');
  if (!r.ok) throw new Error(`kit do Rankeando indisponível (${r.status})`);
  kitDoDeploy = (await r.json()) as Kit;
  return kitDoDeploy;
}

/** O Sabah não tinha posts antes do Rankeando: o conjunto de posts do próprio site é vazio (posts.listar e post.ler só enxergam os do D1). */
export const fonteDoSite = (): FonteDoSite => ({ indice: async () => [], dados: async () => null });
/** O Sabah não tem categorias fixas no código: todas vêm do Rankeando. */
export const categoriasDoSite = async () => [] as { slug: string; nome: string }[];
/** Verdadeiro quando o slug é de uma rota do blog (não há posts do site para colidir). */
export const slugDoSite = async (slug: string) => RESERVADOS.has(slug);

/** O que uma requisição precisa mais de uma vez: as trocas, lidas no máximo uma vez. */
type Contexto = { request: Request; env: SiteEnv; url: URL; trocas: () => Promise<Substituicao[]> };
function contexto(request: Request, env: SiteEnv): Contexto {
  const url = new URL(request.url);
  let lidas: Promise<Substituicao[]> | undefined;
  return {
    request, env, url,
    // Em cache (isolate 60 s, depois a Cache API do colo, depois o D1). Com o D1 fora, nada é trocado e nada é guardado.
    trocas: () => (lidas ??= comCache<Substituicao[]>('trocas', () => new D1Store(env.DB).substituicoes(), (e) => log('p12: trocas indisponíveis, o site sai sem elas', e), [])),
  };
}

/** Uma página montada a partir de outra, com os cabeçalhos dessa outra (_headers: segurança e cache). */
function pagina(corpo: string, modelo: Response, request: Request, extra: Record<string, string> = {}): Response {
  const headers = new Headers(modelo.headers);
  for (const h of ['content-length', 'content-encoding', 'etag', 'last-modified']) headers.delete(h);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return new Response(request.method === 'HEAD' ? null : corpo, { status: 200, headers });
}

const indisponivel = () =>
  new Response('Página temporariamente indisponível. Tente de novo em instantes.', {
    status: 503,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'retry-after': '60' },
  });

/** Os posts do Rankeando como as páginas os mostram: com a troca, se tiverem. */
async function lerPublisher(c: Contexto, store: D1Store) {
  const [brutos, categorias, trocas] = await Promise.all([store.resumos(), store.categorias(), c.trocas()]);
  const mapa = trocasPorId(trocas);
  const resumos: Resumo[] = brutos.map((r) => comTrocaNoResumo(r, trocaDoPublisher(mapa, r.id)));
  const cartoes = async (ids: string[]) => (await store.cartoes(ids)).map((x) => comTrocaNoCartao(x, trocaDoPublisher(mapa, x.id)));
  return { resumos, categorias, mapa, cartoes };
}

const comCats = (c: Awaited<ReturnType<Awaited<ReturnType<typeof lerPublisher>>['cartoes']>>[number], categorias: CategoriaComPosts[]): CartaoDoRankeando => ({
  ...c, cats: slugsDoPost(categorias, c.categoria?.slug ?? null),
});

/** Categorias do Rankeando que têm post (a própria ou alguma filha), para os chips. A mãe conta os posts das filhas. */
function chipsDasCategorias(categorias: CategoriaComPosts[]): ChipDeCategoria[] {
  return categorias
    .filter((c) => !c.pai)
    .map((c) => ({ slug: c.slug, nome: c.nome, posts: familiaDaCategoria(categorias, c.slug).reduce((n, s) => n + (categorias.find((x) => x.slug === s)?.posts ?? 0), 0) }))
    .filter((c) => c.posts > 0);
}

/** Lê o número da página (?page=N): 1 sem o parâmetro, 0 quando é inválido. */
function numeroDaPagina(url: URL): number {
  const bruto = url.searchParams.get('page');
  return bruto === null ? 1 : /^[1-9]\d{0,3}$/.test(bruto) ? Number(bruto) : 0;
}

const RSS = '<link rel="alternate" type="application/rss+xml" title="Blog do Sabah Cozinha Árabe" href="/feed.xml">';

/** O texto da página 2 em diante diz qual é a página. */
const comPagina = (texto: string, numero: number) => (numero > 1 ? `${texto} Página ${numero}.` : texto);

// ---------------------------------------------------------------------------------------------------- /blog/

async function servirBlog(c: Contexto): Promise<Response> {
  const { env, url, request } = c;
  try {
    const modelo = await asset(env, url.origin, '/p12-kit/modelo/');
    if (!modelo.ok) throw new Error(`modelo de página respondeu ${modelo.status}`);
    const [kit, { resumos, categorias, cartoes }] = await Promise.all([carregarKit(env, url.origin), lerPublisher(c, new D1Store(env.DB))]);
    const base = await modelo.text();
    const trilha: Passo[] = [{ name: 'Blog' }];
    const urlBlog = `${SITE_URL}/blog/`;

    if (!resumos.length) {
      // Nenhum post: uma página amigável, fora dos buscadores (nada vazio no Google).
      const html = await montarPagina({
        modelo: base, titulo: 'Blog | Sabah Cozinha Árabe', descricao: 'O blog do Sabah, restaurante árabe na Avenida Paulista, ainda não tem textos publicados.',
        url: urlBlog, noindex: true, ogTipo: 'website', cabecaExtra: '', miolo: mioloDoBlogVazio(),
      });
      return pagina(html, modelo, request, { 'x-robots-tag': 'noindex', 'cache-control': 'no-store' });
    }

    const paginas = Math.ceil(resumos.length / POR_PAGINA);
    const numero = numeroDaPagina(url);
    if (!numero || numero > paginas) return await naoExiste(env, url.origin);
    const cs = (await cartoes(resumos.slice((numero - 1) * POR_PAGINA, numero * POR_PAGINA).map((r) => r.id))).map((x) => comCats(x, categorias));
    // A ordem da página é a das datas (o D1 não garante a ordem do IN)
    cs.sort((a, b) => (a.publicadoEm < b.publicadoEm ? 1 : a.publicadoEm > b.publicadoEm ? -1 : a.slug < b.slug ? -1 : 1));
    const descricao = comPagina('Receitas, histórias e novidades da cozinha árabe do Sabah, restaurante da família Sabbag na Avenida Paulista, em São Paulo.', numero);
    const html = await montarPagina({
      modelo: base,
      titulo: numero > 1 ? `Blog, página ${numero} | Sabah Cozinha Árabe` : 'Blog | Sabah Cozinha Árabe',
      descricao,
      url: numero > 1 ? `${urlBlog}?page=${numero}` : urlBlog,
      canonico: urlBlog,
      ogTipo: 'website',
      cabecaExtra: `<script type="application/ld+json">${grafoDeLista(kit.graphBase, { url: urlBlog, nome: 'Blog do Sabah Cozinha Árabe', descricao, trilha })}</script>${RSS}`,
      miolo: mioloDaLista({
        trilha, titulo: 'Blog do Sabah', texto: 'Receitas, histórias e novidades da cozinha árabe do Sabah, na Avenida Paulista.',
        chips: chipsDasCategorias(categorias), totalGeral: resumos.length, categoriaAtual: null,
        cartoes: cs.map((x) => cartaoHtml(x, 'h2')), paginacao: paginacaoHtml('/blog/', numero, paginas),
      }),
    });
    return pagina(html, modelo, request);
  } catch (e) {
    log('p12: /blog/ indisponível', e);
    return indisponivel();
  }
}

// -------------------------------------------------------------------------------- /blog/categoria/<slug>/

async function servirCategoria(c: Contexto, slug: string): Promise<Response> {
  const { env, url, request } = c;
  try {
    const { resumos, categorias, cartoes } = await lerPublisher(c, new D1Store(env.DB));
    const categoria = categorias.find((x) => x.slug === slug);
    const familia = new Set(familiaDaCategoria(categorias, slug));
    const daCategoria = resumos.filter((r) => r.categoria && familia.has(r.categoria));
    if (!categoria || !daCategoria.length) return await naoExiste(env, url.origin);
    const paginas = Math.ceil(daCategoria.length / POR_PAGINA);
    const numero = numeroDaPagina(url);
    if (!numero || numero > paginas) return await naoExiste(env, url.origin);
    const [modelo, kit] = await Promise.all([asset(env, url.origin, '/p12-kit/modelo/'), carregarKit(env, url.origin)]);
    if (!modelo.ok) throw new Error(`modelo de página respondeu ${modelo.status}`);
    const cs = (await cartoes(daCategoria.slice((numero - 1) * POR_PAGINA, numero * POR_PAGINA).map((r) => r.id))).map((x) => comCats(x, categorias));
    cs.sort((a, b) => (a.publicadoEm < b.publicadoEm ? 1 : a.publicadoEm > b.publicadoEm ? -1 : a.slug < b.slug ? -1 : 1));
    const mae = categoria.pai ? categorias.find((x) => x.slug === categoria.pai && !x.pai) : undefined;
    const path = `/blog/categoria/${slug}/`;
    const trilha: Passo[] = [{ name: 'Blog', path: '/blog/' }, ...(mae ? [{ name: mae.nome, path: `/blog/categoria/${mae.slug}/` }] : []), { name: categoria.nome }];
    const descricao = comPagina(categoria.descricao?.trim() || `${categoria.nome}: textos do blog do Sabah, restaurante árabe na Avenida Paulista.`, numero);
    const html = await montarPagina({
      modelo: await modelo.text(),
      titulo: `${categoria.nome}${numero > 1 ? `, página ${numero}` : ''} | Blog Sabah`,
      descricao,
      url: numero > 1 ? `${SITE_URL}${path}?page=${numero}` : SITE_URL + path,
      canonico: SITE_URL + path,
      ogTipo: 'website',
      cabecaExtra: `<script type="application/ld+json">${grafoDeLista(kit.graphBase, { url: SITE_URL + path, nome: `${categoria.nome} | Blog Sabah`, descricao, trilha })}</script>${RSS}`,
      miolo: mioloDaLista({
        trilha, titulo: categoria.nome,
        texto: categoria.descricao?.trim() || `${daCategoria.length} ${daCategoria.length === 1 ? 'texto' : 'textos'} sobre ${categoria.nome.toLowerCase()}.`,
        chips: chipsDasCategorias(categorias), totalGeral: resumos.length, categoriaAtual: mae ? mae.slug : slug,
        cartoes: cs.map((x) => cartaoHtml(x, 'h2')), paginacao: paginacaoHtml(path, numero, paginas),
      }),
    });
    return pagina(html, modelo, request);
  } catch (e) {
    log('p12: categoria do Rankeando indisponível', e);
    return indisponivel();
  }
}

// --------------------------------------------------------------------------------------- /blog/<slug>/

/** O trecho "Continue lendo": os 3 posts mais novos fora o próprio. */
async function relacionados(resumos: Resumo[], cartoes: (ids: string[]) => Promise<Awaited<ReturnType<D1Store['cartoes']>>>, categorias: CategoriaComPosts[], fora: string) {
  const ids = resumos.filter((r) => r.slug !== fora).slice(0, 3).map((r) => r.id);
  const porId = new Map((await cartoes(ids)).map((x) => [x.id, x]));
  return ids.flatMap((id) => {
    const x = porId.get(id);
    return x ? [cartaoHtml(comCats(x, categorias), 'h3')] : [];
  });
}

/** O post do Rankeando em /blog/<slug>/, um 301 até ele (slug antigo ou endereço sem a barra: `canonico` falso), ou null. */
async function servirPost(c: Contexto, slug: string, canonico: boolean): Promise<Response | null> {
  const { request, env, url } = c;
  const store = new D1Store(env.DB);
  let post: Awaited<ReturnType<D1Store['post']>>;
  try {
    post = await store.post(slug);
    if (!post) {
      const atual = await store.slugAtualDoAntigo(slug);
      return atual ? redirect(`/blog/${atual}/${url.search}`) : null;
    }
  } catch (e) {
    log('p12: consulta do post do Rankeando falhou', e);
    return null;
  }
  if (!canonico) return redirect(`/blog/${slug}/${url.search}`);
  try {
    const [modelo, kit, publisher] = await Promise.all([asset(env, url.origin, '/p12-kit/modelo/'), carregarKit(env, url.origin), lerPublisher(c, store)]);
    if (!modelo.ok) throw new Error(`modelo de página respondeu ${modelo.status}`);
    const final = comTrocaNoPost(post, trocaDoPublisher(publisher.mapa, post.id));
    const cat = final.categoria;
    const trilha: Passo[] = [
      { name: 'Blog', path: '/blog/' },
      ...(cat?.pai && cat.pai_nome ? [{ name: cat.pai_nome, path: `/blog/categoria/${cat.pai}/` }] : []),
      ...(cat ? [{ name: cat.nome, path: `/blog/categoria/${cat.slug}/` }] : []),
      { name: final.titulo },
    ];
    const urlDoPost = urlDoPostDoPublisher(slug);
    const opcoes = {
      post: final,
      conteudo: await prepararConteudo(final.conteudo_html),
      url: urlDoPost,
      trilha,
      categoria: cat ? { href: `/blog/categoria/${cat.slug}/`, nome: cat.nome, mae: cat.pai && cat.pai_nome ? { href: `/blog/categoria/${cat.pai}/`, nome: cat.pai_nome } : null } : null,
      autorNome: final.assinatura?.nome ?? final.autor,
    };
    const m = metaDoPost({ ...opcoes, base: kit.graphBase });
    const extra =
      `<meta property="article:published_time" content="${final.publicado_em}"><meta property="article:modified_time" content="${final.atualizado_em}">` +
      (cat ? `<meta property="article:section" content="${cat.nome.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}">` : '') +
      m.jsonld + RSS;
    const html = await montarPagina({
      modelo: await modelo.text(),
      titulo: final.seo.titulo,
      descricao: m.descricao,
      url: urlDoPost,
      canonico: m.canonico,
      ogTipo: 'article',
      imagem: m.imagem ? { url: m.imagem, alt: final.capa?.alt || final.titulo } : null,
      cabecaExtra: extra,
      miolo: mioloDoPost({ ...opcoes, relacionados: await relacionados(publisher.resumos, publisher.cartoes, publisher.categorias, slug) }),
    });
    return pagina(html, modelo, request);
  } catch (e) {
    log('p12: post do Rankeando indisponível', e);
    return indisponivel();
  }
}

// ------------------------------------------------------------------------------------ sitemap e feed

async function servirSitemap(c: Contexto): Promise<Response> {
  const { env, request } = c;
  try {
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 200) return res;
    const { resumos, categorias } = await lerPublisher(c, new D1Store(env.DB));
    if (!resumos.length) return res;
    const ultima = (slug: string) => {
      const familia = new Set(familiaDaCategoria(categorias, slug));
      return resumos.filter((r) => r.categoria && familia.has(r.categoria)).map((r) => r.atualizadoEm).sort().at(-1) ?? null;
    };
    const xml = sitemapMesclado(await res.text(), {
      posts: resumos.map((r) => ({ slug: r.slug, atualizadoEm: r.atualizadoEm })),
      categorias: categorias.flatMap((x) => { const u = ultima(x.slug); return u ? [{ slug: x.slug, ultima: u }] : []; }),
    });
    return pagina(xml, res, request);
  } catch (e) {
    log('p12: sitemap sem os posts do Rankeando (arquivo estático)', e);
    return env.ASSETS.fetch(request);
  }
}

async function servirFeed(c: Contexto): Promise<Response> {
  const { env, url, request } = c;
  try {
    const { resumos, categorias } = await lerPublisher(c, new D1Store(env.DB));
    // Sem posts o feed não existe (nada vazio para descobrir)
    if (!resumos.length) return await naoExiste(env, url.origin);
    const xml = feedXml(resumos.map((r) => ({ slug: r.slug, titulo: r.titulo, descricao: r.resumo, publicadoEm: r.publicadoEm, categoria: categorias.find((x) => x.slug === r.categoria)?.nome ?? null })));
    return new Response(request.method === 'HEAD' ? null : xml, { status: 200, headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=600' } });
  } catch (e) {
    log('p12: feed indisponível', e);
    return indisponivel();
  }
}

// ------------------------------------------------------------------------------------------------ home

type Resumo3 = { total: number; cartoes: CartaoDoRankeando[] };

/** O que a home precisa do blog: quantos posts há e os 3 mais recentes (com a troca aplicada). Em cache, para não pesar no TTFB da home. */
async function resumoDoBlog(c: Contexto): Promise<Resumo3> {
  return comCache<Resumo3>(
    'blog',
    async () => {
      const { resumos, categorias, cartoes } = await lerPublisher(c, new D1Store(c.env.DB));
      if (!resumos.length) return { total: 0, cartoes: [] };
      const ordem = new Map(resumos.slice(0, 3).map((r, i) => [r.id, i]));
      const cs = (await cartoes([...ordem.keys()])).map((x) => comCats(x, categorias)).sort((a, b) => (ordem.get(a.id) ?? 0) - (ordem.get(b.id) ?? 0));
      return { total: resumos.length, cartoes: cs };
    },
    (e) => log('p12: resumo do blog indisponível, a home sai como foi construída', e),
    { total: 0, cartoes: [] },
  );
}

/** A home estática; com ao menos um post publicado, ganha o link "Blog" e a seção "Do blog". Sem posts (ou com o D1 fora) sai exatamente a estática. */
async function servirHome(c: Contexto): Promise<Response> {
  const { env, request } = c;
  const res = await env.ASSETS.fetch(request);
  if (res.status !== 200 || !res.headers.get('content-type')?.includes('text/html') || request.method !== 'GET') return res;
  try {
    const r = await resumoDoBlog(c);
    if (!r.total) return res;
    const html = await homeComBlog(await res.text(), secaoDaHome(r.cartoes.map((x) => cartaoHtml(x, 'h3'))));
    return pagina(html, res, request);
  } catch (e) {
    log('p12: home sem o blog (página estática)', e);
    return env.ASSETS.fetch(request);
  }
}

// -------------------------------------------------------------------------------------------- roteador

export async function servirSite(request: Request, env: SiteEnv): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return env.ASSETS.fetch(request);
  const c = contexto(request, env);
  const { pathname } = c.url;
  try {
    // O modelo do build não é de nenhum visitante
    if (pathname.startsWith('/p12-kit/') || pathname === '/p12-kit') return await naoExiste(env, c.url.origin);
    if (pathname === '/') return await servirHome(c);
    if (pathname === '/blog') return redirect(`/blog/${c.url.search}`);
    if (pathname === '/blog/') return await servirBlog(c);
    if (pathname === '/sitemap.xml') return await servirSitemap(c);
    if (pathname === '/feed.xml') return await servirFeed(c);

    const cat = /^\/blog\/categoria\/([^/]+)(\/?)$/.exec(pathname);
    if (cat && SLUG.test(cat[1])) return cat[2] === '/' ? await servirCategoria(c, cat[1]) : redirect(`${pathname}/${c.url.search}`);

    const post = /^\/blog\/([^/]+?)(\/?)$/.exec(pathname);
    if (post && SLUG.test(post[1]) && !RESERVADOS.has(post[1])) {
      const r = await servirPost(c, post[1], post[2] === '/');
      if (r) return r;
    }
    // Qualquer outro endereço sob /blog/ (sem post, sem slug antigo): a página 404 do site
    if (pathname.startsWith('/blog/')) return await naoExiste(env, c.url.origin);
    return await env.ASSETS.fetch(request);
  } catch (e) {
    log('p12: erro no Worker, sai a página estática', e);
    return env.ASSETS.fetch(request);
  }
}
