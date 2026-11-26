// Testes do recebimento do Rankeando (contrato v3) no site do Sabah: assinatura, todos os eventos, entrega repetida, códigos de erro,
// o conjunto vazio de posts do próprio site e as partes puras das páginas. Nada de rede nem de Cloudflare.
// As páginas montadas com HTMLRewriter são conferidas no teste local com `wrangler dev` (ver README), porque HTMLRewriter só existe no Worker.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assinarCorpo, VETOR_DE_TESTE, verificarAssinatura } from '../worker/p12/assinatura';
import { lerEvento } from '../worker/p12/contrato';
import { categoriasDoSite, fonteDoSite, slugDoSite } from '../worker/p12/site';
import {
  cartaoHtml, caixaAssinatura, dataBr, familiaDaCategoria, feedXml, grafoDeLista, metaDoPost, mioloDaLista, mioloDoBlogVazio, mioloDoPost, paginacaoHtml, secaoDaHome, sitemapMesclado,
  sumarioHtml, trilhaHtml,
} from '../worker/p12/render';
import { handleP12Webhook, type Dependencias } from '../worker/p12/webhook';
import { MemoriaStore } from './memoria';

const SEGREDO = 'chave-de-teste-do-recebimento';
const AGORA = 1_800_000_000;
const URL_WEBHOOK = 'https://sabah.com.br/api/p12/webhook';

function deps(store = new MemoriaStore(), extra: Partial<Dependencias> = {}): Dependencias {
  return { segredo: SEGREDO, store, site: fonteDoSite(), slugDoSite, categoriasDoSite, agora: AGORA, ...extra };
}

async function enviar(d: Dependencias, evento: string, corpo: unknown, entrega: string, { t = AGORA, segredo = SEGREDO } = {}) {
  const texto = JSON.stringify(corpo);
  const req = new Request(URL_WEBHOOK, {
    method: 'POST',
    headers: { 'X-Rankeando-Evento': evento, 'X-Rankeando-Entrega': entrega, 'X-Rankeando-Assinatura': await assinarCorpo(segredo, t, texto) },
    body: texto,
  });
  const res = await handleP12Webhook(req, d);
  return { status: res.status, corpo: (await res.json()) as Record<string, any> };
}

const post = (extra: Record<string, unknown> = {}) => ({
  id: 'art_1', slug: 'meu-post', titulo: 'Meu post', resumo: 'Resumo', conteudo_html: '<p>Corpo</p>', conteudo_markdown: 'Corpo', capa: null,
  seo: { titulo: 'Meu post | Sabah', descricao: 'Descrição do post', palavra_chave: 'post', canonical: null }, faq_jsonld: null, autor: 'Equipe Sabah',
  publicado_em: '2026-11-01T12:00:00.000Z', atualizado_em: '2026-11-01T12:00:00.000Z', categoria: null, ...extra,
});
const publicar = (p: Record<string, unknown> = {}) => ({ evento: 'post.publicar', contrato: 2, post: post(p) });

// ------------------------------------------------------------------------------------------ os exemplos do pacote

type Exemplo = { chave_de_teste: string; cabecalhos: Record<string, string>; corpo: string; resposta_esperada: Record<string, any> };
const exemplo = (nome: string): Exemplo => JSON.parse(readFileSync(join(import.meta.dirname, 'exemplos', `${nome}.json`), 'utf8'));
const tDoExemplo = (e: Exemplo) => Number(/^t=(\d+),/.exec(e.cabecalhos['X-Rankeando-Assinatura'])![1]);

/** Envia o exemplo do pacote como está (cabeçalhos e corpo exatos), com o `t` dele como "agora". */
async function enviarExemplo(store: MemoriaStore, nome: string) {
  const e = exemplo(nome);
  const d = deps(store, { agora: tDoExemplo(e), segredo: e.chave_de_teste });
  const res = await handleP12Webhook(new Request(URL_WEBHOOK, { method: 'POST', headers: e.cabecalhos, body: e.corpo }), d);
  return { status: res.status, corpo: (await res.json()) as Record<string, any>, esperado: e.resposta_esperada };
}

describe('assinatura', () => {
  it('bate com o vetor do pacote e recusa corpo alterado ou horário fora de 5 minutos', async () => {
    expect(await verificarAssinatura(VETOR_DE_TESTE.segredo, VETOR_DE_TESTE.cabecalho, VETOR_DE_TESTE.corpo, VETOR_DE_TESTE.t)).toBe('ok');
    expect(await verificarAssinatura(VETOR_DE_TESTE.segredo, VETOR_DE_TESTE.cabecalho, VETOR_DE_TESTE.corpo + ' ', VETOR_DE_TESTE.t)).toBe('assinatura_invalida');
    expect(await verificarAssinatura(VETOR_DE_TESTE.segredo, VETOR_DE_TESTE.cabecalho, VETOR_DE_TESTE.corpo, VETOR_DE_TESTE.t + 301)).toBe('fora_do_horario');
    expect(await verificarAssinatura(VETOR_DE_TESTE.segredo, 'lixo', VETOR_DE_TESTE.corpo, VETOR_DE_TESTE.t)).toBe('formato');
  });

  it('todos os exemplos do pacote têm a assinatura certa para a chave de teste', async () => {
    for (const nome of ['ping', 'categorias', 'categorias-listar', 'categorias-remover', 'posts-listar', 'post-ler', 'post-substituir', 'post-restaurar', 'post-publicar', 'post-publicar-com-assinatura', 'post-remover']) {
      const e = exemplo(nome);
      expect(await verificarAssinatura(e.chave_de_teste, e.cabecalhos['X-Rankeando-Assinatura'], e.corpo, tDoExemplo(e)), nome).toBe('ok');
    }
  });

  it('o ping assinado devolve o desafio, o contrato 3 e os recursos; assinatura errada ou horário velho é 401; sem segredo é 503', async () => {
    const d = deps();
    const ok = await enviar(d, 'ping', { evento: 'ping', contrato: 1, desafio: 'abc' }, 'ping-1');
    expect(ok.status).toBe(200);
    expect(ok.corpo).toEqual({ ok: true, desafio: 'abc', contrato: 3, recursos: ['categorias.listar', 'categorias.mesclar', 'posts.listar', 'post.ler', 'post.substituir', 'post.restaurar'] });
    const errada = await enviar(d, 'ping', { evento: 'ping', contrato: 1, desafio: 'abc' }, 'ping-2', { segredo: 'outra-chave' });
    expect(errada.status).toBe(401);
    expect(errada.corpo.erro).toBe('assinatura_invalida');
    const velha = await enviar(d, 'ping', { evento: 'ping', contrato: 1, desafio: 'abc' }, 'ping-3', { t: AGORA - 400 });
    expect(velha.status).toBe(401);
    expect(velha.corpo.erro).toBe('fora_do_horario');
    const semSegredo = await handleP12Webhook(new Request(URL_WEBHOOK, { method: 'POST', body: '{}' }), { ...deps(), segredo: undefined });
    expect(semSegredo.status).toBe(503);
    const get = await handleP12Webhook(new Request(URL_WEBHOOK), deps());
    expect(get.status).toBe(405);
  });

  it('a assinatura é conferida antes de qualquer outra coisa, inclusive do ping e de um corpo que nem é JSON', async () => {
    const d = deps();
    const res = await handleP12Webhook(new Request(URL_WEBHOOK, { method: 'POST', headers: { 'X-Rankeando-Evento': 'ping', 'X-Rankeando-Entrega': 'x' }, body: 'nao e json' }), d);
    expect(res.status).toBe(401);
    // assinado e ainda assim inválido: aí sim é corpo_invalido
    const texto = 'nao e json';
    const certo = await handleP12Webhook(new Request(URL_WEBHOOK, { method: 'POST', headers: { 'X-Rankeando-Entrega': 'y', 'X-Rankeando-Assinatura': await assinarCorpo(SEGREDO, AGORA, texto) }, body: texto }), d);
    expect(certo.status).toBe(400);
    expect(((await certo.json()) as { erro: string }).erro).toBe('corpo_invalido');
  });
});

describe('exemplos do pacote, na ordem do contrato', () => {
  it('cada evento responde o que o exemplo espera (a url do post.publicar é a do Sabah) e repetir a entrega devolve a mesma resposta', async () => {
    const store = new MemoriaStore();
    const igual = (r: Awaited<ReturnType<typeof enviarExemplo>>) => expect(r.corpo).toEqual(r.esperado);

    igual(await enviarExemplo(store, 'ping'));
    igual(await enviarExemplo(store, 'categorias'));
    const lista = await enviarExemplo(store, 'categorias-listar');
    expect(lista.status).toBe(200);
    // "bastidores" do exemplo é uma categoria criada no próprio site (não existe aqui); as do pacote chegaram pelo evento categorias
    const slugs = lista.corpo.categorias.map((c: { slug: string }) => c.slug);
    expect(slugs).toEqual(expect.arrayContaining(["internet-e-wi-fi", "wi-fi-em-casa"]));
    expect(slugs).not.toContain("bastidores");
    igual(await enviarExemplo(store, 'categorias-remover'));

    // O conjunto de posts do site é vazio: a listagem é uma lista vazia e o post do exemplo não existe (404)
    const posts = await enviarExemplo(store, 'posts-listar');
    expect(posts.status).toBe(200);
    expect(posts.corpo).toEqual({ ok: true, posts: [], total: 0, proximo_cursor: null });
    for (const nome of ['post-ler', 'post-substituir', 'post-restaurar']) {
      const r = await enviarExemplo(store, nome);
      expect(r.status, nome).toBe(404);
      expect(r.corpo, nome).toEqual({ ok: false, erro: 'nao_encontrado', mensagem: 'post não existe' });
    }

    const a = await enviarExemplo(store, 'post-publicar');
    expect(a.status).toBe(200);
    expect(a.corpo).toEqual({ ok: true, url: 'https://sabah.com.br/blog/como-escolher-um-plano-de-internet/' });
    const repetido = await enviarExemplo(store, 'post-publicar');
    expect(repetido.corpo).toEqual(a.corpo);

    const b = await enviarExemplo(store, 'post-publicar-com-assinatura');
    expect(b.corpo).toEqual({ ok: true, url: 'https://sabah.com.br/blog/como-cuidar-do-pelo-do-seu-cao/' });
    expect((await store.post('como-cuidar-do-pelo-do-seu-cao'))?.assinatura?.nome).toBe('Dra. Ana Exemplo');

    igual(await enviarExemplo(store, 'post-remover'));
    expect(await store.post('como-escolher-um-plano-de-internet')).toBeNull();
    igual(await enviarExemplo(store, 'post-remover'));
  });
});

describe('eventos', () => {
  it('post.publicar grava, repete a mesma resposta na entrega repetida e recusa slug de rota do blog (409)', async () => {
    const store = new MemoriaStore();
    const d = deps(store);
    const a = await enviar(d, 'post.publicar', publicar(), 'art_1:1');
    expect(a.status).toBe(200);
    expect(a.corpo.url).toBe('https://sabah.com.br/blog/meu-post/');
    expect((await store.post('meu-post'))?.titulo).toBe('Meu post');
    // Entrega repetida: a mesma resposta, mesmo com um corpo diferente, e nada é gravado
    const b = await enviar(d, 'post.publicar', publicar({ titulo: 'Outro' }), 'art_1:1');
    expect(b).toEqual(a);
    expect((await store.post('meu-post'))?.titulo).toBe('Meu post');
    const emUso = await enviar(d, 'post.publicar', publicar({ id: 'art_2', slug: 'categoria' }), 'art_2:1');
    expect(emUso.status).toBe(409);
    expect(emUso.corpo.erro).toBe('slug_em_uso');
    const outroDono = await enviar(d, 'post.publicar', publicar({ id: 'art_3', slug: 'meu-post' }), 'art_3:1');
    expect(outroDono.status).toBe(409);
  });

  it('uma versão mais velha que a do site é ignorada com sucesso, e sem o cabeçalho de entrega o pedido é recusado (400)', async () => {
    const store = new MemoriaStore();
    const d = deps(store);
    await enviar(d, 'post.publicar', publicar({ titulo: 'Novo', atualizado_em: '2026-11-05T12:00:00.000Z' }), 'art_1:2');
    const velha = await enviar(d, 'post.publicar', publicar({ titulo: 'Velho', atualizado_em: '2026-11-02T12:00:00.000Z' }), 'art_1:1');
    expect(velha.status).toBe(200);
    expect((await store.post('meu-post'))?.titulo).toBe('Novo');
    const texto = JSON.stringify(publicar());
    const res = await handleP12Webhook(new Request(URL_WEBHOOK, { method: 'POST', headers: { 'X-Rankeando-Assinatura': await assinarCorpo(SEGREDO, AGORA, texto) }, body: texto }), d);
    expect(res.status).toBe(400);
  });

  it('mudar o slug guarda o antigo para o 301 e post.remover apaga', async () => {
    const store = new MemoriaStore();
    const d = deps(store);
    await enviar(d, 'post.publicar', publicar(), 'art_1:1');
    await enviar(d, 'post.publicar', publicar({ slug: 'slug-novo', atualizado_em: '2026-11-02T12:00:00.000Z' }), 'art_1:2');
    expect(await store.slugAtualDoAntigo('meu-post')).toBe('slug-novo');
    const r = await enviar(d, 'post.remover', { evento: 'post.remover', contrato: 2, post: { id: 'art_1' } }, 'art_1:remover');
    expect(r.status).toBe(200);
    expect(await store.post('slug-novo')).toBeNull();
  });

  it('categorias mescla (nunca apaga), categorias.listar traz as do banco, e categorias.remover apaga só as pedidas', async () => {
    const store = new MemoriaStore();
    const d = deps(store);
    const cat = (slug: string, extra: Record<string, unknown> = {}) => ({ slug, nome: slug.toUpperCase(), descricao: null, ordem: 0, atualizado_em: '2026-11-01T00:00:00.000Z', ...extra });
    await enviar(d, 'categorias', { evento: 'categorias', contrato: 2, modo: 'mesclar', atualizado_em: '2026-11-01T00:00:00.000Z', categorias: [cat('receitas'), cat('historia', { ordem: 1 })] }, 'categorias:1');
    await enviar(d, 'categorias', { evento: 'categorias', contrato: 2, modo: 'mesclar', atualizado_em: '2026-11-02T00:00:00.000Z', categorias: [cat('bastidores', { ordem: 2, pai: 'historia' })] }, 'categorias:2');
    const r = await enviar(d, 'categorias.listar', { evento: 'categorias.listar', contrato: 2 }, 'categorias.listar:1:a');
    expect(r.status).toBe(200);
    expect(r.corpo.categorias.map((c: { slug: string }) => c.slug)).toEqual(['receitas', 'historia', 'bastidores']);
    expect(r.corpo.categorias[2].pai).toBe('historia');
    const rem = await enviar(d, 'categorias.remover', { evento: 'categorias.remover', contrato: 2, slugs: ['bastidores', 'nao-existe'] }, 'categorias.remover:1');
    expect(rem.corpo).toEqual({ ok: true });
    const depois = await enviar(d, 'categorias.listar', { evento: 'categorias.listar', contrato: 2 }, 'categorias.listar:1:b');
    expect(depois.corpo.categorias.map((c: { slug: string }) => c.slug)).toEqual(['receitas', 'historia']);
  });

  it('posts.listar lista só os posts do D1 (o conjunto do site é vazio), pagina com cursor e respeita desde/ate', async () => {
    const store = new MemoriaStore();
    const d = deps(store);
    await enviar(d, 'post.publicar', publicar(), 'art_1:1');
    await enviar(d, 'post.publicar', publicar({ id: 'art_3', slug: 'terceiro', publicado_em: '2026-11-05T12:00:00.000Z', atualizado_em: '2026-11-05T12:00:00.000Z' }), 'art_3:1');
    await enviar(d, 'post.publicar', publicar({ id: 'art_4', slug: 'quarto', publicado_em: '2026-11-03T12:00:00.000Z', atualizado_em: '2026-11-03T12:00:00.000Z' }), 'art_4:1');
    const p1 = await enviar(d, 'posts.listar', { evento: 'posts.listar', contrato: 3, limite: 2 }, 'posts.listar:1:a');
    expect(p1.corpo.posts.map((p: { id_no_site: string }) => p.id_no_site)).toEqual(['rk:art_3', 'rk:art_4']);
    expect(p1.corpo.total).toBe(3);
    expect(p1.corpo.posts[0].origem).toBe('art_3');
    expect(p1.corpo.posts[0].url).toBe('https://sabah.com.br/blog/terceiro/');
    const p2 = await enviar(d, 'posts.listar', { evento: 'posts.listar', contrato: 3, limite: 2, cursor: p1.corpo.proximo_cursor }, 'posts.listar:1:b');
    expect(p2.corpo.posts.map((p: { id_no_site: string }) => p.id_no_site)).toEqual(['rk:art_1']);
    expect(p2.corpo.proximo_cursor).toBeNull();
    const janela = await enviar(d, 'posts.listar', { evento: 'posts.listar', contrato: 3, limite: 50, desde: '2026-11-04T00:00:00Z' }, 'posts.listar:1:c');
    expect(janela.corpo.total).toBe(1);
    const ruim = await enviar(d, 'posts.listar', { evento: 'posts.listar', contrato: 3, limite: 2, cursor: 'lixo' }, 'posts.listar:1:d');
    expect(ruim.status).toBe(400);
  });

  it('post.ler, post.substituir e post.restaurar de um post do Rankeando: a troca vale, o original volta, e um id do site que não existe é 404', async () => {
    const store = new MemoriaStore();
    const d = deps(store);
    await enviar(d, 'post.publicar', publicar(), 'art_1:1');
    const id = 'rk:art_1';
    const original = await enviar(d, 'post.ler', { evento: 'post.ler', contrato: 3, id_no_site: id }, 'post.ler:1:a');
    expect(original.status).toBe(200);
    expect(original.corpo.conteudo_html).toBe('<p>Corpo</p>');
    const troca = { evento: 'post.substituir', contrato: 3, id_no_site: id, atualizado_em: '2026-11-10T10:00:00.000Z', post: { titulo: 'Título novo', conteudo_html: '<p>Novo</p>', conteudo_markdown: 'Novo', seo: { titulo: '', descricao: 'Descrição nova', palavra_chave: '' }, faq_jsonld: null } };
    const s = await enviar(d, 'post.substituir', troca, `substituir:${id}:h1`);
    expect(s).toMatchObject({ status: 200, corpo: { ok: true, url: 'https://sabah.com.br/blog/meu-post/' } });
    const lido = await enviar(d, 'post.ler', { evento: 'post.ler', contrato: 3, id_no_site: id }, 'post.ler:1:b');
    expect(lido.corpo.titulo).toBe('Título novo');
    expect(lido.corpo.conteudo_html).toBe('<p>Novo</p>');
    expect(lido.corpo.atualizado_em).toBe('2026-11-10T10:00:00.000Z');
    expect(lido.corpo.seo.titulo).toBe('Meu post | Sabah'); // vazio quer dizer "use o do original"
    expect(lido.corpo.seo.descricao).toBe('Descrição nova');
    const lista = await enviar(d, 'posts.listar', { evento: 'posts.listar', contrato: 3, limite: 5 }, 'posts.listar:2:a');
    expect(lista.corpo.posts[0].titulo).toBe('Título novo');
    expect(lista.corpo.posts[0].slug).toBe('meu-post');
    const r = await enviar(d, 'post.restaurar', { evento: 'post.restaurar', contrato: 3, id_no_site: id, atualizado_em: '2026-11-11T10:00:00.000Z' }, `restaurar:${id}:h2`);
    expect(r.status).toBe(200);
    const volta = await enviar(d, 'post.ler', { evento: 'post.ler', contrato: 3, id_no_site: id }, 'post.ler:1:c');
    expect(volta.corpo.titulo).toBe('Meu post');
    const outra = await enviar(d, 'post.restaurar', { evento: 'post.restaurar', contrato: 3, id_no_site: id, atualizado_em: '2026-11-11T10:00:00.000Z' }, `restaurar:${id}:h3`);
    expect(outra.status).toBe(200);
    // Um novo post.publicar apaga a troca
    await enviar(d, 'post.substituir', troca, `substituir:${id}:h4`);
    await enviar(d, 'post.publicar', publicar({ titulo: 'Republicado', atualizado_em: '2026-11-12T12:00:00.000Z' }), 'art_1:3');
    expect(store.trocas.size).toBe(0);
    const naoTem = await enviar(d, 'post.ler', { evento: 'post.ler', contrato: 3, id_no_site: 'site:nao-existe' }, 'post.ler:1:d');
    expect(naoTem.status).toBe(404);
    expect(naoTem.corpo.erro).toBe('nao_encontrado');
  });

  it('o aviso de troca de conteúdo roda depois de uma escrita que muda trocas e posts', async () => {
    let avisos = 0;
    const d = deps(new MemoriaStore(), { aoMudarTrocas: () => void avisos++ });
    await enviar(d, 'post.publicar', publicar(), 'art_1:1');
    await enviar(d, 'post.remover', { evento: 'post.remover', contrato: 2, post: { id: 'art_1' } }, 'art_1:remover');
    expect(avisos).toBe(2);
  });
});

describe('erros do contrato', () => {
  it('contrato desconhecido, evento desconhecido e corpo inválido têm o erro do contrato', () => {
    expect((lerEvento('{"evento":"ping","contrato":9,"desafio":"x"}', null) as unknown as { corpo: { erro: string } }).corpo.erro).toBe('contrato_desconhecido');
    expect((lerEvento('{"evento":"x","contrato":3}', null) as unknown as { corpo: { erro: string } }).corpo.erro).toBe('contrato_desconhecido');
    expect((lerEvento('nao e json', null) as unknown as { corpo: { erro: string } }).corpo.erro).toBe('corpo_invalido');
  });

  it('um post sem título é corpo_invalido (400) e um corpo grande demais é 413', async () => {
    const d = deps();
    const r = await enviar(d, 'post.publicar', publicar({ titulo: '' }), 'art_9:1');
    expect(r.status).toBe(400);
    expect(r.corpo.erro).toBe('corpo_invalido');
    const grande = 'x'.repeat(1_600_000);
    const res = await handleP12Webhook(new Request(URL_WEBHOOK, { method: 'POST', headers: { 'X-Rankeando-Entrega': 'g' }, body: grande }), d);
    expect(res.status).toBe(413);
  });

  it('falha do banco responde 503 (o Rankeando repete) e não guarda a entrega', async () => {
    const store = new MemoriaStore();
    store.gravar = async () => {
      throw new Error('D1 fora');
    };
    const d = deps(store);
    const r = await enviar(d, 'post.publicar', publicar(), 'art_1:1');
    expect(r.status).toBe(503);
    expect(r.corpo.erro).toBe('indisponivel');
    expect(store.entregas.size).toBe(0);
  });
});

describe('o conjunto de posts do próprio site é vazio', () => {
  it('não há índice, não há dados, não há categorias fixas e só as rotas do blog são slugs ocupados', async () => {
    const f = fonteDoSite();
    expect(await f.indice()).toEqual([]);
    expect(await f.dados('qualquer')).toBeNull();
    expect(await categoriasDoSite()).toEqual([]);
    expect(await slugDoSite('categoria')).toBe(true);
    expect(await slugDoSite('page')).toBe(true);
    expect(await slugDoSite('receita-de-esfiha')).toBe(false);
  });
});

// ------------------------------------------------------------------------------------------ partes puras das páginas

const cartao = (extra: Record<string, unknown> = {}) => ({
  id: '1', slug: 's', titulo: 'A <b>"x"</b>.', resumo: '', autor: 'a', publicadoEm: '2026-11-13T01:00:00.000Z', capa: { url: 'https://app.rankeando.com.br/blog-img/x', alt: '' }, minutos: 3,
  categoria: { slug: 'c', nome: 'C & D' }, cats: ['c', 'mae'], ...extra,
});

describe('páginas (partes puras)', () => {
  it('o cartão escapa o texto, aceita só imagem https e usa a data de São Paulo', () => {
    const c = cartaoHtml(cartao());
    expect(c).toMatch(/^<article class="post-card" data-cats="c mae">/);
    expect(c).toContain('<a class="post-card__link" href="/blog/s/">');
    expect(c).toContain('<span class="post-card__cat">C &amp; D</span>');
    expect(c).toContain('<h3 class="post-card__title">A &lt;b&gt;&quot;x&quot;&lt;/b&gt;</h3>');
    expect(c).toContain('https://app.rankeando.com.br/blog-img/x');
    expect(dataBr('2026-11-13T01:00:00.000Z')).toBe('12 de nov. de 2026');
    expect(cartaoHtml(cartao({ capa: { url: 'http://inseguro/x.png', alt: '' } }))).not.toContain('inseguro');
    expect(cartaoHtml(cartao({ categoria: null }), 'h2')).toContain('<span class="post-card__cat">Blog</span><h2');
  });

  it('o sumário, a trilha e a caixa de assinatura escapam o texto', () => {
    expect(sumarioHtml([{ depth: 2, text: 'a', slug: 'a' }, { depth: 2, text: 'b', slug: 'b' }])).toBe('');
    expect(sumarioHtml([2, 2, 2].map((depth, i) => ({ depth: depth as 2, text: `T${i}`, slug: `t${i}` })))).toMatch(/<nav class="toc"[^>]*><p class="toc__title">Neste artigo<\/p><ol><li><a href="#t0">T0<\/a>/);
    const trilha = trilhaHtml([{ name: 'Blog', path: '/blog/' }, { name: 'Receitas & Cia', path: '/blog/categoria/receitas/' }, { name: 'Post <1>' }]);
    expect(trilha).toContain('<a href="/blog/">Blog</a> / <a href="/blog/categoria/receitas/">Receitas &amp; Cia</a> / <span aria-current="page">Post &lt;1&gt;</span>');
    const caixa = caixaAssinatura({ tipo: 'pessoa', nome: 'Dra. <Ana>', funcao: 'Chef', registro: 'R 1', curriculo: 'Linha 1\nLinha 2', foto_url: 'http://inseguro/x.png', link_url: 'https://exemplo.com/ana' });
    expect(caixa).toContain('class="rankeando-assinatura"');
    expect(caixa).toContain('Escrito por');
    expect(caixa).toContain('Dra. &lt;Ana&gt;');
    expect(caixa).toContain('Chef · R 1');
    expect(caixa).toContain('Linha 1<br>Linha 2');
    expect(caixa).not.toContain('inseguro');
    expect(caixa).toContain('<a href="https://exemplo.com/ana" rel="noopener">Conheça a formação completa</a>');
    expect(caixaAssinatura({ tipo: 'empresa', nome: 'Sabah', funcao: '', registro: '', curriculo: '', foto_url: null, link_url: null })).toContain('Publicado por');
  });

  it('a categoria inclui as subcategorias da mãe e a paginação só aparece com mais de uma página', () => {
    const cats = [{ slug: 'mae', pai: null }, { slug: 'filha', pai: 'mae' }, { slug: 'outra', pai: null }];
    expect(familiaDaCategoria(cats, 'mae')).toEqual(['mae', 'filha']);
    expect(familiaDaCategoria(cats, 'filha')).toEqual(['filha']);
    expect(paginacaoHtml('/blog/', 1, 1)).toBe('');
    const p = paginacaoHtml('/blog/categoria/x/', 2, 3);
    expect(p).toContain('href="/blog/categoria/x/"');
    expect(p).toContain('href="/blog/categoria/x/?page=3" rel="next"');
    expect(p).toContain('rel="prev"');
  });

  it('o miolo do post tem um só <h1>, a trilha Blog › Categoria › Post, a assinatura e o conteúdo; o JSON-LD traz BlogPosting e BreadcrumbList com os três níveis', () => {
    const p = { ...post({ categoria: { slug: 'receitas', nome: 'Receitas', descricao: null, pai: null }, assinatura: { tipo: 'pessoa', nome: 'Ana', funcao: '', registro: '', curriculo: '', foto_url: null, link_url: null }, faq_jsonld: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [] }, capa: { url: 'https://app.rankeando.com.br/blog-img/c', alt: 'Capa' } }) } as never;
    const url = 'https://sabah.com.br/blog/meu-post/';
    const trilha = [{ name: 'Blog', path: '/blog/' }, { name: 'Receitas', path: '/blog/categoria/receitas/' }, { name: 'Meu post' }];
    const o = { post: p, conteudo: { html: '<h2 id="a">A</h2><p class="p12-resumo">Resumo</p>', toc: [] }, url, trilha, categoria: { href: '/blog/categoria/receitas/', nome: 'Receitas' }, autorNome: 'Ana' };
    const miolo = mioloDoPost({ ...o, relacionados: [cartaoHtml(cartao())] });
    expect(miolo.match(/<h1[ >]/g)).toHaveLength(1);
    expect(miolo).toContain('<a class="article__cat" href="/blog/categoria/receitas/">Receitas</a>');
    expect(miolo).toContain('<p class="p12-resumo">Resumo</p>');
    expect(miolo).toContain('rankeando-assinatura');
    expect(miolo).toContain('Continue lendo');
    expect(miolo).toContain('https://app.rankeando.com.br/blog-img/c');
    const m = metaDoPost({ ...o, base: [{ '@type': 'WebSite', '@id': 'https://sabah.com.br/#website' }] });
    const scripts = [...m.jsonld.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((x) => JSON.parse(x[1]));
    expect(scripts).toHaveLength(2); // o grafo e o FAQPage do post
    const grafo = scripts[0]['@graph'];
    const tipos = grafo.map((n: { '@type': string }) => n['@type']);
    expect(tipos).toEqual(expect.arrayContaining(['WebSite', 'WebPage', 'BreadcrumbList', 'Blog', 'BlogPosting']));
    const lista = grafo.find((n: { '@type': string }) => n['@type'] === 'BreadcrumbList').itemListElement;
    expect(lista.map((i: { name: string }) => i.name)).toEqual(['Início', 'Blog', 'Receitas', 'Meu post']);
    expect(lista[3].item).toBe(url);
    expect(grafo.find((n: { '@type': string }) => n['@type'] === 'BlogPosting').author).toEqual({ '@type': 'Person', name: 'Ana' });
    expect(scripts[1]['@type']).toBe('FAQPage');
    // sem FAQ no post, uma só <script>; "<" dentro do JSON nunca fecha a tag
    const semFaq = metaDoPost({ ...o, post: { ...(p as object), faq_jsonld: null, titulo: 'a </script> b' } as never, base: [] });
    expect(semFaq.jsonld.match(/<script/g)).toHaveLength(1);
    expect(semFaq.jsonld).not.toContain('</script> b');
    expect(m.canonico).toBe(url);
  });

  it('a lista, a categoria e o estado vazio têm um só <h1>; o vazio é amigável e leva ao início', () => {
    const lista = mioloDaLista({ trilha: [{ name: 'Blog' }], titulo: 'Blog do Sabah', texto: 'Texto', chips: [{ slug: 'receitas', nome: 'Receitas', posts: 2 }], totalGeral: 3, categoriaAtual: null, cartoes: [cartaoHtml(cartao(), 'h2')], paginacao: '' });
    expect(lista.match(/<h1[ >]/g)).toHaveLength(1);
    expect(lista).toContain('<a class="chip" href="/blog/" aria-current="page">Todos <span>3</span></a>');
    expect(lista).toContain('<a class="chip" href="/blog/categoria/receitas/">Receitas <span>2</span></a>');
    const vazio = mioloDoBlogVazio();
    expect(vazio.match(/<h1[ >]/g)).toHaveLength(1);
    expect(vazio).toContain('href="/"');
    const grafo = JSON.parse(grafoDeLista([], { url: 'https://sabah.com.br/blog/', nome: 'Blog', descricao: 'd', trilha: [{ name: 'Blog' }] }))['@graph'];
    expect(grafo.map((n: { '@type': string }) => n['@type'])).toEqual(['CollectionPage', 'BreadcrumbList', 'Blog']);
  });

  it('a seção "Do blog" da home leva os cartões e o link para /blog/', () => {
    const s = secaoDaHome([cartaoHtml(cartao()), cartaoHtml(cartao({ slug: 't' }))]);
    expect(s).toContain('<h2 class="h2" id="home-blog-title">Do blog</h2>');
    expect(s.match(/class="post-card"/g)).toHaveLength(2);
    expect(s).toContain('href="/blog/"');
  });

  it('o sitemap leva /blog/, os posts e as categorias; sem posts é o mesmo arquivo', () => {
    const sitemap = '<?xml version="1.0"?>\n<urlset>\n  <url>\n    <loc>https://sabah.com.br/</loc>\n  </url>\n</urlset>\n';
    expect(sitemapMesclado(sitemap, { posts: [], categorias: [] })).toBe(sitemap);
    const saida = sitemapMesclado(sitemap, { posts: [{ slug: 'meu-post', atualizadoEm: '2026-11-01T12:00:00.000Z' }], categorias: [{ slug: 'receitas', ultima: '2026-11-01T12:00:00.000Z' }] });
    expect(saida).toContain('<loc>https://sabah.com.br/blog/</loc>');
    expect(saida).toContain('<loc>https://sabah.com.br/blog/meu-post/</loc>');
    expect(saida).toContain('<lastmod>2026-11-01</lastmod>');
    expect(saida).toContain('<loc>https://sabah.com.br/blog/categoria/receitas/</loc>');
    expect(saida).toContain('https://sabah.com.br/</loc>');
    expect(saida.endsWith('</urlset>\n')).toBe(true);
  });

  it('o feed lista do mais novo ao mais velho, no máximo 30, com o texto escapado', () => {
    const posts = Array.from({ length: 35 }, (_, i) => ({ slug: `p${i}`, titulo: `Post ${i} & cia`, descricao: 'd', publicadoEm: new Date(Date.UTC(2026, 10, 1, 12, i)).toISOString(), categoria: i === 34 ? 'Receitas' : null }));
    const xml = feedXml(posts);
    expect(xml.match(/<item>/g)).toHaveLength(30);
    expect(xml.indexOf('Post 34 &amp; cia')).toBeLessThan(xml.indexOf('Post 33 &amp; cia'));
    expect(xml).toContain('<link>https://sabah.com.br/blog/p34/</link>');
    expect(xml).toContain('<category>Receitas</category>');
    expect(xml).not.toContain('Post 4 &amp;');
  });
});
