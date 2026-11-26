/**
 * Vídeos em trechos e redirecionamento das portas do cPanel (a parte do Worker que já existia antes do blog).
 *
 * Vídeos: os arquivos estáticos do Workers ignoram o cabeçalho Range e devolvem
 * sempre o arquivo inteiro (200). O Safari, no iPhone e no Mac, só toca vídeo se o servidor
 * atender pedidos de trecho (206 Partial Content), e os outros navegadores dependem disso
 * para avançar o vídeo sem baixar tudo. Este código busca o arquivo no próprio site e
 * devolve só os bytes pedidos.
 * https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/#range-requests
 *
 * O tamanho de cada vídeo vem de worker/sizes.json, gravado pelo build (vite.config.ts):
 * a resposta em trechos precisa informar o total, e o arquivo chega aqui sem essa medida.
 */
import SIZES from './sizes.json';

/**
 * Portas do cPanel no servidor antigo, onde fica o e-mail. A rota do domínio vale para
 * qualquer porta HTTPS que o Cloudflare aceita, então sabah.com.br:2096 (webmail), :2083
 * (cPanel) e :2087 (WHM) cairiam neste site. Quem tem um desses endereços salvo é levado
 * ao subdomínio do serviço, que continua no servidor antigo.
 */
export const CPANEL_PORTS: Record<string, string> = { 2096: 'webmail', 2095: 'webmail', 2083: 'cpanel', 2082: 'cpanel', 2087: 'whm', 2086: 'whm' };

/** O redirecionamento (302) para o serviço do cPanel quando a porta é uma das dele; null nas outras. */
export function redirecionarPorta(url: URL): Response | null {
  const service = CPANEL_PORTS[url.port];
  return service ? Response.redirect(`https://${service}.sabah.com.br/`, 302) : null;
}

/**
 * Lê "bytes=início-fim" (um único intervalo) e devolve [início, fim] dentro do arquivo.
 * Devolve null quando o cabeçalho não é um intervalo simples (a resposta vira o arquivo
 * inteiro) e "fora" quando o intervalo não existe no arquivo (416).
 */
export function parseRange(header: string, size: number): [number, number] | 'fora' | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) return null;
  let start: number;
  let end: number;
  if (match[1] === '') {
    // "bytes=-500": os últimos 500 bytes
    const tail = Number(match[2]);
    if (tail === 0) return 'fora';
    start = Math.max(0, size - tail);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) return 'fora';
  return [start, end];
}

/**
 * Copia para a resposta só o trecho pedido: descarta o que vem antes de `start` e
 * para de ler o arquivo assim que entrega `length` bytes.
 */
async function pump(body: ReadableStream<Uint8Array>, writable: WritableStream<Uint8Array>, start: number, length: number): Promise<void> {
  const reader = body.getReader();
  const writer = writable.getWriter();
  let skip = start;
  let left = length;
  try {
    while (left > 0) {
      const { done, value } = await reader.read();
      if (done) break;
      let chunk = value;
      if (skip >= chunk.byteLength) {
        skip -= chunk.byteLength;
        continue;
      }
      if (skip > 0) {
        chunk = chunk.subarray(skip);
        skip = 0;
      }
      if (chunk.byteLength > left) chunk = chunk.subarray(0, left);
      left -= chunk.byteLength;
      await writer.write(chunk);
    }
    await writer.close();
  } catch (error) {
    // quem assistia fechou o vídeo ou a conexão caiu: encerra sem barulho
    await writer.abort(error).catch(() => {});
  } finally {
    await reader.cancel().catch(() => {});
  }
}

/** Responde a /video/*: o arquivo estático, ou o trecho pedido (206) quando há Range. */
export async function servirVideo(request: Request, env: { ASSETS: Fetcher }, ctx: { waitUntil(promise: Promise<unknown>): void }): Promise<Response> {
  const url = new URL(request.url);
  const range = request.headers.get('Range');
  const size = (SIZES as Record<string, number>)[url.pathname] ?? 0;
  const ranged = range !== null && size > 0 && (request.method === 'GET' || request.method === 'HEAD');

  // Sem Range (ou arquivo fora da lista): o arquivo estático segue como está.
  if (!ranged) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 200 || size === 0) return response;
    const headers = new Headers(response.headers);
    headers.set('Accept-Ranges', 'bytes');
    return new Response(response.body, { status: 200, headers });
  }

  // Pede o arquivo inteiro: sem Range e sem validadores, que poderiam virar um 304.
  const wanted = new Headers(request.headers);
  for (const name of ['Range', 'If-Range', 'If-None-Match', 'If-Modified-Since']) wanted.delete(name);
  const asset = await env.ASSETS.fetch(new Request(request.url, { method: 'GET', headers: wanted }));
  if (asset.status !== 200 || !asset.body) return asset;

  const headers = new Headers(asset.headers);
  headers.set('Accept-Ranges', 'bytes');

  // If-Range: o navegador guardou um trecho de outra versão do arquivo; manda tudo de novo.
  const ifRange = request.headers.get('If-Range');
  const span = ifRange !== null && ifRange !== asset.headers.get('ETag') ? null : parseRange(range, size);

  if (span === null) {
    if (request.method === 'HEAD') {
      await asset.body.cancel();
      return new Response(null, { status: 200, headers });
    }
    return new Response(asset.body, { status: 200, headers });
  }
  if (span === 'fora') {
    await asset.body.cancel();
    headers.set('Content-Range', `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }

  const [start, end] = span;
  const length = end - start + 1;
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);

  if (request.method === 'HEAD') {
    await asset.body.cancel();
    headers.set('Content-Length', String(length));
    return new Response(null, { status: 206, headers });
  }

  // FixedLengthStream faz a resposta sair com Content-Length, que o Safari exige no 206.
  const { readable, writable } = new FixedLengthStream(length);
  ctx.waitUntil(pump(asset.body, writable, start, length));
  return new Response(readable, { status: 206, headers });
}
