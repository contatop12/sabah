// Marcação das páginas do blog que o Worker monta com os posts do Rankeando (contrato v3). Tudo aqui é função pura (texto entra, texto sai) e
// roda nos testes; o que precisa de HTMLRewriter (que só existe no Worker) fica em pagina.ts e conteudo.ts.
// O cabeçalho, o rodapé e o <head> vêm da página-modelo do build (/p12-kit/modelo/), que usa os mesmos parciais e o mesmo CSS do site.
import { SITE_NAME, SITE_URL, readingMinutes } from './constantes';
import type { Assinatura, PostP12 } from './contrato';
import type { Cartao } from './store';

// ---------------------------------------------------------------------------------------------------------- texto

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** JSON dentro de <script>: todo "<" vira < (o texto vem de artigo e </script> fecharia a tag). */
export const jsonEmScript = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const fmtSP = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: 'numeric', day: 'numeric' });

/** "13 de nov. de 2026", no horário de São Paulo. */
export function dataBr(iso: string): string {
  const p = Object.fromEntries(fmtSP.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${Number(p.day)} de ${MESES[Number(p.month) - 1]} de ${p.year}`;
}

/** A URL só quando é https (imagens e links vindos de fora). */
export const https = (u: string | null | undefined): URL | null => {
  if (!u) return null;
  try {
    const x = new URL(u);
    return x.protocol === 'https:' ? x : null;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------------------------------- sumário

export type TocItem = { depth: 2 | 3; text: string; slug: string };
export type Conteudo = { html: string; toc: TocItem[] };

/** Sumário a partir dos títulos do corpo: os dois níveis de cima, como 2 e 3. */
export function toc(headings: { depth: number; text: string; slug: string }[]): TocItem[] {
  const inBody = headings.filter((h) => h.depth >= 2);
  if (!inBody.length) return [];
  const top = Math.min(...inBody.map((h) => h.depth));
  return inBody.filter((h) => h.depth <= top + 1).map((h) => ({ depth: (h.depth === top ? 2 : 3) as 2 | 3, text: h.text, slug: h.slug }));
}

/** O sumário: só os títulos de nível 2, e só quando há mais de dois. */
export function sumarioHtml(itens: TocItem[]): string {
  const h2 = itens.filter((t) => t.depth === 2);
  if (h2.length <= 2) return '';
  return `<nav class="toc" aria-label="Neste artigo"><p class="toc__title">Neste artigo</p><ol>${h2.map((t) => `<li><a href="#${esc(t.slug)}">${esc(t.text)}</a></li>`).join('')}</ol></nav>`;
}

// ----------------------------------------------------------------------------------------------- assinatura

/** A caixa "Escrito por" do fim do post (campo opcional `post.assinatura`). Todo texto é escapado; foto e link só em https. */
export function caixaAssinatura(a: Assinatura): string {
  const pessoa = a.tipo === 'pessoa';
  const foto = https(a.foto_url);
  const link = https(a.link_url);
  const cargo = [a.funcao.trim(), a.registro.trim()].filter(Boolean).map(esc).join(' · ');
  const bio = a.curriculo.trim() ? esc(a.curriculo.trim()).replace(/\r\n|\r|\n/g, '<br>') : '';
  const rotulo = pessoa ? 'Escrito por' : 'Publicado por';
  return (
    `<aside class="rankeando-assinatura" aria-label="${rotulo} ${esc(a.nome)}">` +
    (foto ? `<img class="rankeando-assinatura__foto" src="${esc(foto.href)}" alt="${esc(a.nome)}" width="88" height="88" loading="lazy" decoding="async">` : '') +
    `<div class="rankeando-assinatura__texto"><p class="rankeando-assinatura__rotulo">${rotulo}</p>` +
    `<p class="rankeando-assinatura__nome">${esc(a.nome)}</p>` +
    (cargo ? `<p class="rankeando-assinatura__cargo">${cargo}</p>` : '') +
    (bio ? `<p class="rankeando-assinatura__bio">${bio}</p>` : '') +
    (link ? `<p class="rankeando-assinatura__link"><a href="${esc(link.href)}" rel="noopener">${pessoa ? 'Conheça a formação completa' : 'Saiba mais'}</a></p>` : '') +
    '</div></aside>'
  );
}

// -------------------------------------------------------------------------------------------------- cartões

export type CartaoDoRankeando = Cartao & { cats: string[] };

/** O cartão de um post nas listas, na home e em "Continue lendo". */
export function cartaoHtml(c: CartaoDoRankeando, titulo: 'h2' | 'h3' = 'h3'): string {
  const capa = c.capa && https(c.capa.url);
  return (
    `<article class="post-card" data-cats="${esc(c.cats.join(' '))}">` +
    `<a class="post-card__link" href="/blog/${esc(c.slug)}/">` +
    (capa
      ? `<span class="post-card__media"><img src="${esc(capa.href)}" width="720" height="450" alt="" loading="lazy" decoding="async"></span>`
      : '<span class="post-card__media post-card__media--vazia" aria-hidden="true"></span>') +
    `<span class="post-card__body"><span class="post-card__cat">${esc(c.categoria?.nome ?? 'Blog')}</span>` +
    `<${titulo} class="post-card__title">${esc(c.titulo.replace(/\.+$/, ''))}</${titulo}>` +
    `<span class="post-card__meta"><time datetime="${esc(c.publicadoEm)}">${dataBr(c.publicadoEm)}</time><span>${c.minutos} min de leitura</span></span></span></a></article>`
  );
}

/** Os slugs de uma categoria e das suas subcategorias (a página da mãe lista os posts das filhas). */
export function familiaDaCategoria(categorias: { slug: string; pai: string | null }[], slug: string): string[] {
  const topo = new Set(categorias.filter((c) => !c.pai).map((c) => c.slug));
  return [slug, ...categorias.filter((c) => c.pai === slug && topo.has(slug)).map((c) => c.slug)];
}

/** Os slugs que um post leva em `data-cats`: a categoria dele e, se for subcategoria, a mãe. */
export function slugsDoPost(categorias: { slug: string; pai: string | null }[], slug: string | null): string[] {
  if (!slug) return [];
  const pai = categorias.find((c) => c.slug === slug)?.pai;
  return pai ? [slug, pai] : [slug];
}

export type ChipDeCategoria = { slug: string; nome: string; posts: number };

/** Um chip do filtro do blog. */
export const chipHtml = (c: ChipDeCategoria, href: string, atual = false) =>
  `<li><a class="chip" href="${esc(href)}"${atual ? ' aria-current="page"' : ''}>${esc(c.nome)} <span>${c.posts}</span></a></li>`;

/** A fileira de filtros: "Todos" e as categorias que têm post. `atual` é o slug da categoria aberta (ou null no /blog/). */
export function chipsHtml(chips: ChipDeCategoria[], totalGeral: number, atual: string | null): string {
  if (!chips.length) return '';
  return (
    '<ul class="chips" aria-label="Categorias">' +
    chipHtml({ slug: '', nome: 'Todos', posts: totalGeral }, '/blog/', atual === null) +
    chips.map((c) => chipHtml(c, `/blog/categoria/${c.slug}/`, c.slug === atual)).join('') +
    '</ul>'
  );
}

export const POR_PAGINA = 12;

/** Os links de página (?page=N): só aparecem com mais de uma página. */
export function paginacaoHtml(base: string, pagina: number, total: number): string {
  if (total <= 1) return '';
  const href = (n: number) => (n === 1 ? base : `${base}?page=${n}`);
  const itens: string[] = [];
  if (pagina > 1) itens.push(`<li><a class="chip" href="${href(pagina - 1)}" rel="prev">Anterior</a></li>`);
  for (let n = 1; n <= total; n++) {
    itens.push(n === pagina ? `<li><a class="chip" href="${href(n)}" aria-current="page">${n}</a></li>` : `<li><a class="chip" href="${href(n)}">${n}</a></li>`);
  }
  if (pagina < total) itens.push(`<li><a class="chip" href="${href(pagina + 1)}" rel="next">Próxima</a></li>`);
  return `<nav aria-label="Páginas"><ul class="chips chips--paginas">${itens.join('')}</ul></nav>`;
}

// ------------------------------------------------------------------------------------------------ trilhas

export type Passo = { name: string; path?: string };

/** `<nav class="crumbs">` do site, do jeito das páginas internas: "Início / Blog / Categoria". */
export function trilhaHtml(passos: Passo[]): string {
  const todos: Passo[] = [{ name: 'Início', path: '/' }, ...passos];
  return (
    '<nav class="crumbs" aria-label="Você está em">' +
    todos.map((p, i) => (i === todos.length - 1 ? `<span aria-current="page">${esc(p.name)}</span>` : `<a href="${esc(p.path ?? '/')}">${esc(p.name)}</a>`)).join(' / ') +
    '</nav>'
  );
}

const abs = (p: string) => (p.startsWith('http') ? p : SITE_URL + p);

export function breadcrumbLd(url: string, passos: Passo[]) {
  const todos: Passo[] = [{ name: 'Início', path: '/' }, ...passos];
  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#trilha`,
    itemListElement: todos.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name, ...(p.path || i === todos.length - 1 ? { item: p.path ? abs(p.path) : url } : {}) })),
  };
}

// ------------------------------------------------------------------------------------------------ JSON-LD

export type DadosDoPost = {
  url: string;
  titulo: string;
  descricao: string;
  seoTitulo: string;
  publicadoEm: string;
  atualizadoEm: string;
  capaUrl: string | null;
  secoes: string[];
  palavras: number;
  minutos: number;
  autor: { tipo: 'Person' | 'Organization'; nome: string; url?: string };
  trilha: Passo[];
};

const RESTAURANTE = `${SITE_URL}/#restaurant`;
const WEBSITE = `${SITE_URL}/#website`;

const blogLd = () => ({ '@type': 'Blog', '@id': `${SITE_URL}/blog/#blog`, url: `${SITE_URL}/blog/`, name: `Blog do ${SITE_NAME}`, inLanguage: 'pt-BR', publisher: { '@id': RESTAURANTE } });

/** O grafo da página de um post: os nós comuns do site (vêm do build), a página, a trilha, o blog e o BlogPosting. O FAQPage vai à parte (segunda <script>). */
export function grafoDoPost(base: unknown[], d: DadosDoPost): string {
  const graph = [
    ...base,
    {
      '@type': 'WebPage',
      '@id': `${d.url}#pagina`,
      url: d.url,
      name: d.seoTitulo,
      description: d.descricao,
      isPartOf: { '@id': WEBSITE },
      about: { '@id': RESTAURANTE },
      inLanguage: 'pt-BR',
      breadcrumb: { '@id': `${d.url}#trilha` },
      ...(d.capaUrl ? { primaryImageOfPage: { '@type': 'ImageObject', url: d.capaUrl } } : {}),
    },
    breadcrumbLd(d.url, d.trilha),
    blogLd(),
    {
      '@type': 'BlogPosting',
      '@id': `${d.url}#artigo`,
      headline: d.titulo.slice(0, 110),
      description: d.descricao,
      ...(d.capaUrl ? { image: [d.capaUrl] } : {}),
      datePublished: d.publicadoEm,
      dateModified: d.atualizadoEm,
      author: { '@type': d.autor.tipo, name: d.autor.nome, ...(d.autor.url ? { url: d.autor.url } : {}) },
      publisher: { '@id': RESTAURANTE },
      mainEntityOfPage: { '@id': `${d.url}#pagina` },
      isPartOf: { '@id': `${SITE_URL}/blog/#blog` },
      ...(d.secoes.length ? { articleSection: d.secoes } : {}),
      wordCount: d.palavras,
      timeRequired: `PT${d.minutos}M`,
      inLanguage: 'pt-BR',
    },
  ];
  return jsonEmScript({ '@context': 'https://schema.org', '@graph': graph });
}

/** O grafo de uma página de lista (o blog ou uma categoria): a página (CollectionPage), a trilha e o blog. */
export function grafoDeLista(base: unknown[], o: { url: string; nome: string; descricao: string; trilha: Passo[] }): string {
  return jsonEmScript({
    '@context': 'https://schema.org',
    '@graph': [
      ...base,
      {
        '@type': 'CollectionPage',
        '@id': `${o.url}#pagina`,
        url: o.url,
        name: o.nome,
        description: o.descricao,
        isPartOf: { '@id': WEBSITE },
        about: { '@id': RESTAURANTE },
        inLanguage: 'pt-BR',
        breadcrumb: { '@id': `${o.url}#trilha` },
      },
      breadcrumbLd(o.url, o.trilha),
      blogLd(),
    ],
  });
}

/** O FAQPage do post (já pronto, vindo do Rankeando), numa <script> própria. Vazio quando o post não tem FAQ. */
export const scriptDoFaq = (faq: Record<string, unknown> | null) => (faq ? `<script type="application/ld+json">${jsonEmScript(faq)}</script>` : '');

// ------------------------------------------------------------------------------------- o miolo das páginas

export type OpcoesDoPost = {
  post: PostP12;
  conteudo: Conteudo;
  url: string;
  trilha: Passo[];
  categoria: { href: string; nome: string; mae?: { href: string; nome: string } | null } | null;
  relacionados: string[];
  autorNome: string;
};

/** O que a página de um post leva fora do miolo: descrição, imagem, canonical e JSON-LD (grafo + FAQ). */
export function metaDoPost(o: Omit<OpcoesDoPost, 'relacionados'> & { base: unknown[] }) {
  const p = o.post;
  const md = p.conteudo_markdown || o.conteudo.html.replace(/<[^>]+>/g, ' ');
  const minutos = readingMinutes(md);
  const palavras = md.split(/\s+/).filter(Boolean).length;
  const imagem = https(p.capa?.url ?? null)?.href ?? null;
  const descricao = p.seo.descricao || p.resumo;
  const secoes = o.categoria ? [o.categoria.nome] : [];
  const canonico = https(p.seo.canonical)?.href ?? o.url;
  const grafo = grafoDoPost(o.base, {
    url: o.url,
    titulo: p.titulo,
    descricao,
    seoTitulo: p.seo.titulo,
    publicadoEm: p.publicado_em,
    atualizadoEm: p.atualizado_em,
    capaUrl: imagem,
    secoes,
    palavras,
    minutos,
    autor: { tipo: p.assinatura?.tipo === 'empresa' ? 'Organization' : 'Person', nome: o.autorNome },
    trilha: o.trilha,
  });
  return { minutos, imagem, descricao, canonico, jsonld: `<script type="application/ld+json">${grafo}</script>${scriptDoFaq(p.faq_jsonld)}` };
}

/** O miolo de /blog/<slug>/ (dentro do <main>). Um só <h1>: o título do post. */
export function mioloDoPost(o: OpcoesDoPost): string {
  const p = o.post;
  const { minutos, imagem } = metaDoPost({ ...o, base: [] });
  const atualizado = p.atualizado_em.slice(0, 10) !== p.publicado_em.slice(0, 10) ? `<span>Atualizado em ${dataBr(p.atualizado_em)}</span>` : '';
  const cat = o.categoria
    ? `<p class="article__cats">${o.categoria.mae ? `<a class="article__cat" href="${esc(o.categoria.mae.href)}">${esc(o.categoria.mae.nome)}</a><span aria-hidden="true"> › </span>` : ''}<a class="article__cat" href="${esc(o.categoria.href)}">${esc(o.categoria.nome)}</a></p>`
    : '';
  return (
    '<article class="article">' +
    '<header class="article__head">' +
    trilhaHtml(o.trilha) +
    cat +
    `<h1>${esc(p.titulo)}</h1>` +
    (p.resumo ? `<p class="article__lede">${esc(p.resumo)}</p>` : '') +
    `<p class="article__meta"><span>Por ${esc(o.autorNome)}</span><time datetime="${esc(p.publicado_em)}">${dataBr(p.publicado_em)}</time><span>${minutos} min de leitura</span>${atualizado}</p>` +
    '</header>' +
    (imagem ? `<figure class="article__cover"><img src="${esc(imagem)}" alt="${esc(p.capa?.alt || p.titulo)}" width="1200" height="675" loading="eager" decoding="async" fetchpriority="high"></figure>` : '') +
    sumarioHtml(o.conteudo.toc) +
    `<div class="prose article__body">${o.conteudo.html}${p.assinatura ? caixaAssinatura(p.assinatura) : ''}</div>` +
    '</article>' +
    (o.relacionados.length
      ? `<section class="related" aria-labelledby="related-title"><div class="blog__in"><h2 class="related__title" id="related-title">Continue lendo</h2><div class="post-grid">${o.relacionados.join('')}</div></div></section>`
      : '')
  );
}

/** O miolo de /blog/ e de /blog/categoria/<slug>/ (dentro do <main>). */
export function mioloDaLista(o: {
  trilha: Passo[];
  titulo: string;
  texto: string;
  chips: ChipDeCategoria[];
  totalGeral: number;
  categoriaAtual: string | null;
  cartoes: string[];
  paginacao: string;
}): string {
  return (
    '<div class="blog__in">' +
    trilhaHtml(o.trilha) +
    `<h1 class="blog__h1">${esc(o.titulo)}</h1>` +
    (o.texto ? `<p class="blog__lede">${esc(o.texto)}</p>` : '') +
    chipsHtml(o.chips, o.totalGeral, o.categoriaAtual) +
    `<div class="post-grid">${o.cartoes.join('')}</div>` +
    o.paginacao +
    '</div>'
  );
}

/** O /blog/ enquanto não há nenhum post: uma página amigável e sem indexação (a página leva `noindex`). */
export function mioloDoBlogVazio(): string {
  return (
    '<div class="blog__in blog__vazio">' +
    trilhaHtml([{ name: 'Blog' }]) +
    '<h1 class="blog__h1">Blog do Sabah</h1>' +
    '<p class="blog__lede">Ainda não publicamos nenhum texto por aqui. Em breve, receitas, histórias e novidades da cozinha árabe do Sabah.</p>' +
    '<div class="row"><a class="btn btn--primary" href="/">Voltar para a página inicial</a></div>' +
    '</div>'
  );
}

/** A seção "Do blog" da home: os posts mais recentes. */
export function secaoDaHome(cartoes: string[]): string {
  return (
    '<section class="sec home-blog" aria-labelledby="home-blog-title"><div class="wrap">' +
    '<div class="sec__head"><h2 class="h2" id="home-blog-title">Do blog</h2><p class="lead">Receitas, histórias e novidades da cozinha árabe do Sabah.</p></div>' +
    `<div class="post-grid">${cartoes.join('')}</div>` +
    '<p class="home-blog__mais"><a class="btn btn--ghost" href="/blog/">Ver todos os textos</a></p>' +
    '</div></section>'
  );
}

// ----------------------------------------------------------------------------------- sitemap e feed

const URL_SITEMAP = (loc: string, lastmod: string, prioridade: string, freq: string) =>
  `  <url>\n    <loc>${esc(loc)}</loc>\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${prioridade}</priority>\n  </url>`;

/** O sitemap do site (do build) com /blog/, os posts do Rankeando e as categorias que têm post. Sem posts, o mesmo sitemap. */
export function sitemapMesclado(xml: string, o: { posts: { slug: string; atualizadoEm: string }[]; categorias: { slug: string; ultima: string }[] }): string {
  if (!o.posts.length) return xml;
  const ultimo = o.posts.map((p) => p.atualizadoEm).sort().at(-1)!;
  const novos = [
    URL_SITEMAP(`${SITE_URL}/blog/`, ultimo, '0.6', 'weekly'),
    ...o.posts.map((p) => URL_SITEMAP(`${SITE_URL}/blog/${p.slug}/`, p.atualizadoEm, '0.6', 'monthly')),
    ...o.categorias.map((c) => URL_SITEMAP(`${SITE_URL}/blog/categoria/${c.slug}/`, c.ultima, '0.4', 'weekly')),
  ].join('\n');
  return xml.replace('</urlset>', `${novos}\n</urlset>`);
}

/** O RSS com os posts do Rankeando, do mais novo ao mais velho, no máximo 30. */
export function feedXml(posts: { slug: string; titulo: string; descricao: string; publicadoEm: string; categoria: string | null }[]): string {
  const itens = [...posts]
    .sort((a, b) => Date.parse(b.publicadoEm) - Date.parse(a.publicadoEm))
    .slice(0, 30)
    .map(
      (p) =>
        `<item><title>${esc(p.titulo)}</title><link>${SITE_URL}/blog/${esc(p.slug)}/</link><guid isPermaLink="true">${SITE_URL}/blog/${esc(p.slug)}/</guid><pubDate>${new Date(p.publicadoEm).toUTCString()}</pubDate><description>${esc(p.descricao)}</description>${p.categoria ? `<category>${esc(p.categoria)}</category>` : ''}</item>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Blog do ${esc(SITE_NAME)}</title><link>${SITE_URL}/blog/</link><atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/><description>Receitas, histórias e novidades da cozinha árabe do Sabah, na Avenida Paulista.</description><language>pt-BR</language>\n${itens}\n</channel></rss>\n`;
}
