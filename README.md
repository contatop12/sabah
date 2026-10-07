# Sabah – links (link in bio)

Página "link in bio" do restaurante Sabah, publicada em **links.sabah.com.br**. HTML, CSS e TypeScript puros (Vite), deploy no Cloudflare Workers como site estático. Sem frameworks, sem bibliotecas em runtime.

## Comandos

```bash
npm install          # dependências
npm run dev          # dev server (http://localhost:5173/)
npm run build        # typecheck + build em dist/ (+ _headers e robots.txt de cf/)
npm run preview      # serve o dist/ localmente
npm run cf:dev       # roda o dist/ no runtime do Cloudflare (testa _headers, redirect e 404)
npm run deploy       # build + deploy no Cloudflare Workers
npm run images -- <foto.jpg>   # regenera a foto de fundo e a imagem OG (ver "Imagens")
```

## Onde alterar cada coisa

Tudo que é dado (URLs, WhatsApp, horários, endereço, campanha, GTM) fica em **um único arquivo**: [`src/config.ts`](src/config.ts). Os valores entram no HTML no build, via tokens `{{chave}}`; não há URL espalhada pelo projeto.

| O que | Onde |
| --- | --- |
| URLs (reserva, iFood, cardápios, Maps, site, Instagram, GoWhere) | `src/config.ts` → `links` |
| Número do WhatsApp | `src/config.ts` → `WHATSAPP_NUMBER` (topo do arquivo) |
| Mensagens automáticas do WhatsApp | `src/config.ts` → `links.reservation`, `dinnerReservation`, `eventsWhatsapp` |
| Horários (almoço, jantar, delivery) | `src/config.ts` → `hours` |
| Endereço | `src/config.ts` → `address` |
| Título, description, canonical, imagem OG | `src/config.ts` → `site` |
| UTMs dos links para sabah.com.br | `src/config.ts` → `utm` |
| Textos dos botões e dos blocos expansíveis | `index.html` |
| Página do cardápio | `cardapio.html` |
| Cores, fonte, espaçamentos | `src/style.css` (variáveis em `:root`) |

Depois de alterar, rode `npm run build` (ou faça push: o deploy automático builda).

### Campanha GoWhere (CTA "Vote no Sabah")

Em `src/config.ts`:

- `showGoWhereCampaign: true` mostra o bloco; `false` esconde o bloco inteiro e os outros links sobem, sem espaço vazio.
- `links.gowhere` precisa ter a URL de votação. **Enquanto estiver vazio, o bloco fica oculto automaticamente** (o build avisa), para não publicar um botão sem destino.

## Imagens

Ficam em `public/` e são copiadas para `dist/`:

- `public/img/bg-{1280,1920}.{avif,webp,jpg}` – **foto de fundo** da página (proporção original, `object-fit: cover`, overlay escuro por cima)
- `public/img/og-image.jpg` – imagem de compartilhamento (1200×630), recorte central da mesma foto
- `public/img/cardapio/` – páginas do cardápio (ver abaixo)
- `public/avatar-150.png`, `avatar-260.png` – logo (1x / 2x)
- `public/favicon-32.png`, `apple-touch-icon.png` – ícones

**Trocar a foto de fundo**: `npm run images -- caminho/da/foto.jpg` (Python + Pillow). Gera as variantes e a imagem OG. A intensidade do escurecimento está em `.bg::after` no `src/style.css`.

**Foto da esfiha premiada (DSC01396) e do delivery (DSC01200)**: ainda não foram fornecidas. Há um comentário em `index.html` no bloco `.award` indicando onde entra; a classe `.award__photo` já está pronta no CSS.

## Cardápio (/cardapio)

As páginas dos dois PDFs são servidas como imagens otimizadas (AVIF + JPEG, lazy) em `public/img/cardapio/`; abre instantaneamente no navegador do Instagram, sem o visualizador do Drive. Os PDFs do Drive continuam como "Baixar PDF".

**Atualizar o cardápio**: baixe os PDFs novos e rode

```bash
npm run menu -- salao.pdf delivery.pdf
```

(precisa de Python + `pip install pymupdf pillow`). Se o número de páginas mudar (hoje 10 e 8), ajuste a lista de `<picture>` em `cardapio.html`. Limitação: o conteúdo é imagem; leitores de tela só recebem o resumo de cada página no `alt`.

## Tracking (GTM / GA4 / Meta Pixel)

1. Preencha `gtmId: "GTM-XXXXXXX"` em `src/config.ts`. O build injeta o snippet oficial do GTM no `<head>` e o `<noscript>` no `<body>`.
2. Todo clique importante dispara no `dataLayer`:

   ```js
   { event: "bio_link_click", link_name: "ifood" }
   ```

   Valores de `link_name`: `gowhere`, `reservation`, `lunch`, `dinner`, `ifood`, `events`, `menu`, `maps`, `website`, `instagram`. Blocos expansíveis disparam ao abrir.
3. No GTM, crie um gatilho "Evento personalizado" = `bio_link_click` e uma tag GA4 Event com o parâmetro `link_name` = `{{dlv - link_name}}`. Meta Pixel e outras tags entram pelo mesmo GTM.
4. Links para sabah.com.br recebem `utm_source=instagram&utm_medium=bio&utm_campaign=sabah_bio` automaticamente.

## Deploy

Workers Builds já está conectado ao repositório `contatop12/sabah`: cada push na `main` builda e publica em `sabah-bio.<conta>.workers.dev`. O `build.command` do `wrangler.jsonc` roda `npm run build` antes do deploy.

Manual: `npx wrangler login` e depois `npm run deploy`.

### Domínio links.sabah.com.br

Pelo painel (recomendado): Workers & Pages → `sabah-bio` → Settings → Domains & Routes → Add → Custom domain → `links.sabah.com.br`. O Cloudflare cria o DNS e o certificado. Alternativa por config: bloco `routes` comentado no `wrangler.jsonc` (exige a zona `sabah.com.br` na mesma conta).

Para publicar em um subcaminho (ex.: `sabah.com.br/bio`), mude `basePath` em `src/config.ts` para `"/bio/"`: o build passa a gerar `dist/bio/`, a raiz redireciona e os caminhos de `_headers` se ajustam sozinhos.

## Estrutura

```text
index.html          página (tokens {{...}} preenchidos no build)
cardapio.html       cardápio como imagens otimizadas
404.html            página de erro
src/config.ts       CONFIGURAÇÃO CENTRAL
src/style.css       estilos
src/main.ts         bootstrap
src/accordion.ts    blocos expansíveis (almoço, jantar, eventos)
src/tracking.ts     dataLayer / eventos
vite.config.ts      base, plugin de template, cópia de cf/ para dist/
cf/                 _headers, robots.txt (raiz do Worker; {{base}} resolvido no build)
public/             imagens e ícones
scripts/optimize-images.py  foto de fundo + OG
scripts/render-menu.py      páginas do cardápio
wrangler.jsonc      config do Cloudflare Workers
```
