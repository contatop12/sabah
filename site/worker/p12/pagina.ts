// As páginas do blog como o Worker as monta: parte da página-modelo do build (/p12-kit/modelo/, com o <head>, o cabeçalho, o rodapé e o CSS
// reais do site) e troca só o que descreve a página (título, descrição, endereço, imagem social, JSON-LD) e o miolo do <main>.
// HTMLRewriter só existe no Worker: estas funções são conferidas no teste local com `wrangler dev` (ver README), não no vitest.
import { esc } from './render';

const passar = (html: string, r: HTMLRewriter) => r.transform(new Response(html)).text();

const meta = (r: HTMLRewriter, seletor: string, valor: string | null, atributo = 'content') =>
  r.on(seletor, {
    element(el) {
      if (valor === null) el.remove();
      else el.setAttribute(atributo, valor);
    },
  });

/**
 * O link "Blog" do menu e do rodapé, logo depois de "FAQ" e de "Eventos". O texto é inserido depois do <a> fechando o <li> que já existe
 * e abrindo outro, que o </li> original fecha: o HTMLRewriter não alcança o <li> pai. Se o menu mudar e o seletor não achar nada, o link só não aparece.
 */
export function comLinkDoBlog(r: HTMLRewriter, aqui: 'blog' | null = null): HTMLRewriter {
  const atual = aqui ? ' aria-current="page"' : '';
  const item = `</li><li><a href="/blog/"${atual}>Blog</a>`;
  r.on('nav.nav a[data-spy="perguntas"]', { element: (el) => void el.after(item, { html: true }) });
  r.on('footer.foot a[href="/#eventos"]', { element: (el) => void el.after(item.replace(atual, ''), { html: true }) });
  return r;
}

export type OpcoesPagina = {
  /** A página-modelo do build, como texto. */
  modelo: string;
  /** <title> e títulos sociais. */
  titulo: string;
  descricao: string;
  /** Endereço da página (og:url). */
  url: string;
  /** Endereço canônico, quando não for o da página. */
  canonico?: string;
  noindex?: boolean;
  ogTipo: 'website' | 'article';
  imagem?: { url: string; alt: string } | null;
  /** HTML extra do fim do <head>: JSON-LD, datas do artigo, link do feed. */
  cabecaExtra: string;
  /** O que fica dentro do <main>. */
  miolo: string;
};

/** Uma página do blog montada a partir da página-modelo. */
export async function montarPagina(o: OpcoesPagina): Promise<string> {
  const r = new HTMLRewriter();
  r.on('title', { element: (el) => void el.setInnerContent(esc(o.titulo), { html: true }) });
  meta(r, 'meta[name="description"]', o.descricao);
  meta(r, 'meta[property="og:title"]', o.titulo);
  meta(r, 'meta[name="twitter:title"]', o.titulo);
  meta(r, 'meta[property="og:description"]', o.descricao);
  meta(r, 'meta[name="twitter:description"]', o.descricao);
  meta(r, 'link[rel="canonical"]', o.canonico ?? o.url, 'href');
  meta(r, 'meta[property="og:url"]', o.url);
  meta(r, 'meta[property="og:type"]', o.ogTipo);
  if (o.noindex) meta(r, 'meta[name="robots"]', 'noindex, follow');
  if (o.imagem) {
    meta(r, 'meta[property="og:image"]', o.imagem.url);
    meta(r, 'meta[name="twitter:image"]', o.imagem.url);
    meta(r, 'meta[property="og:image:alt"]', o.imagem.alt);
    // O tamanho da imagem do Rankeando não é conhecido: sai o que descrevia a imagem social do site.
    for (const s of ['width', 'height']) meta(r, `meta[property="og:image:${s}"]`, null);
  }
  r.on('head', { element: (el) => void el.onEndTag((fim) => void fim.before(o.cabecaExtra, { html: true })) });
  r.on('main[data-p12-main]', { element: (el) => void el.setInnerContent(o.miolo, { html: true }) });
  comLinkDoBlog(r, 'blog');
  return passar(o.modelo, r);
}

/** A home com o link "Blog" no menu e no rodapé e a seção "Do blog" antes do fecho. */
export async function homeComBlog(html: string, secao: string): Promise<string> {
  const r = comLinkDoBlog(new HTMLRewriter());
  r.on('section.closing', { element: (el) => void el.before(secao, { html: true }) });
  return passar(html, r);
}
