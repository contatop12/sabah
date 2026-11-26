// Leituras do D1 que quase toda página repete (as trocas de conteúdo de posts e o resumo do blog para a home): dois níveis de cache
// mantêm essa leitura fora do caminho da página. Ordem: memória do isolate (60 s), depois a Cache API do colo (60 s, chave interna
// fixa), depois o D1, que preenche os dois. Lista vazia também é guardada. Falha do D1 nunca vai para a Cache API: fica 10 s só na
// memória do isolate (a home não espera o banco a cada visita enquanto ele estiver fora).
// Escritas que mexem nesses dados chamam `limparCaches()`: este isolate e este colo veem a mudança na hora, os outros colos em até 60 s.
// `post.ler` e `posts.listar` NÃO usam este cache (o Rankeando confere uma troca por eles logo depois de gravá-la).
// Sem `caches` (testes, local sem Cache API) só a memória do isolate é usada.
import { SITE_URL } from './constantes';

export const TTL_MS = 60_000;
export const TTL_FALHA_MS = 10_000;
const NOMES = ['trocas', 'blog'] as const;
export type NomeDoCache = (typeof NOMES)[number];

// No domínio do próprio site: a Cache API guarda as entradas por zona. O caminho nunca é uma página (o Worker responde antes a qualquer
// pedido, e as entradas de caches.default só são lidas por cache.match).
export const chaveDoCache = (nome: NomeDoCache) => `${SITE_URL}/__p12-cache/${nome}-v1`;

const memoria = new Map<string, { ate: number; valor: unknown }>();

const api = (): Cache | null => {
  try {
    const c = (globalThis as { caches?: { default?: Cache } }).caches;
    return c?.default ?? null;
  } catch {
    return null;
  }
};

/** O valor: memória do isolate, depois Cache API, depois `ler` (D1). Se `ler` falhar, `onErro` roda e sai `vazio`, sem ir para a Cache API. */
export async function comCache<T>(nome: NomeDoCache, ler: () => Promise<T>, onErro: (e: unknown) => void, vazio: T, agora: () => number = Date.now): Promise<T> {
  const guardado = memoria.get(nome);
  if (guardado && guardado.ate > agora()) return guardado.valor as T;
  const cache = api();
  if (cache) {
    try {
      const r = await cache.match(chaveDoCache(nome));
      if (r) {
        const valor = (await r.json()) as T;
        memoria.set(nome, { ate: agora() + TTL_MS, valor });
        return valor;
      }
    } catch {
      // cache quebrado é um "não achei"
    }
  }
  let valor: T;
  try {
    valor = await ler();
  } catch (e) {
    onErro(e);
    memoria.set(nome, { ate: agora() + TTL_FALHA_MS, valor: vazio });
    return vazio;
  }
  memoria.set(nome, { ate: agora() + TTL_MS, valor });
  if (cache) {
    try {
      await cache.put(chaveDoCache(nome), new Response(JSON.stringify(valor), { headers: { 'content-type': 'application/json', 'cache-control': `max-age=${TTL_MS / 1000}` } }));
    } catch {
      // sem cache: a próxima requisição lê o D1 de novo
    }
  }
  return valor;
}

/** Esquece tudo aqui (memória agora, depois a entrada da Cache API deste colo). Espere por ela só onde dá para esperar (testes, `waitUntil`). */
export async function limparCaches(): Promise<void> {
  memoria.clear();
  const cache = api();
  if (!cache) return;
  for (const nome of NOMES) {
    try {
      await cache.delete(chaveDoCache(nome));
    } catch {
      // o TTL de 60 s acaba com isso de qualquer jeito
    }
  }
}
