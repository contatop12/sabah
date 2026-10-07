# Sabah – página /bio

Página "link in bio" do restaurante Sabah, publicada em **sabah.com.br/bio**. HTML, CSS e TypeScript puros (Vite), deploy no Cloudflare Workers como site estático. Sem frameworks, sem bibliotecas em runtime.

## Comandos

```bash
npm install          # dependências
npm run dev          # dev server (http://localhost:5173/bio/)
npm run build        # typecheck + build em dist/ (dist/bio/ = página; raiz = _headers, _redirects, robots.txt)
npm run preview      # serve o dist/ localmente
npm run cf:dev       # roda o dist/ no runtime do Cloudflare (testa _headers, redirect e 404)
npm run deploy       # build + deploy no Cloudflare Workers
npm run images -- <foto.jpg>   # regenera as variantes da foto principal (ver "Imagens")
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
| Cores, fonte, espaçamentos | `src/style.css` (variáveis em `:root`) |

Depois de alterar, rode `npm run build` (ou faça push: o deploy automático builda).

### Campanha GoWhere (CTA "Vote no Sabah")

Em `src/config.ts`:

- `showGoWhereCampaign: true` mostra o bloco; `false` esconde o bloco inteiro e os outros links sobem, sem espaço vazio.
- `links.gowhere` precisa ter a URL de votação. **Enquanto estiver vazio, o bloco fica oculto automaticamente** (o build avisa), para não publicar um botão sem destino.

## Imagens

Ficam em `public/` e são copiadas para `dist/bio/`:

- `public/img/sabah-paulista-{480,768,1080,1280}.{avif,webp,jpg}` – foto principal, recorte 16:10
- `public/img/og-image.jpg` – imagem de compartilhamento (1200×630)
- `public/avatar-150.png`, `avatar-260.png` – logo (1x / 2x)
- `public/favicon-32.png`, `apple-touch-icon.png` – ícones

**Trocar a foto principal**: rode `npm run images -- caminho/da/foto.jpg` (precisa de Python + Pillow). O script recorta ao centro em 16:10, gera AVIF/WebP/JPEG nos quatro tamanhos e a imagem OG. Se quiser outro recorte, ajuste `RATIO` ou faça o recorte antes.

**Foto da esfiha premiada (DSC01396) e do delivery (DSC01200)**: ainda não foram fornecidas. Há um comentário em `index.html` no bloco `.award` indicando onde entra; a classe `.award__photo` já está pronta no CSS.

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

Workers Builds já está conectado ao repositório `contatop12/sabah`: cada push na `main` builda e publica em `sabah-bio.<conta>.workers.dev/bio/`. O `build.command` do `wrangler.jsonc` roda `npm run build` antes do deploy.

Manual: `npx wrangler login` e depois `npm run deploy`.

### Publicar em sabah.com.br/bio (cutover)

O site principal é WordPress + Elementor e **não precisa ser alterado**: a zona `sabah.com.br` está no Cloudflare, então uma rota de Worker captura só `/bio*`.

1. Em `wrangler.jsonc`, descomente:

   ```jsonc
   "routes": [{ "pattern": "sabah.com.br/bio*", "zone_name": "sabah.com.br" }]
   ```

2. Faça push (ou `npm run deploy`).
3. Teste `https://sabah.com.br/bio` (redireciona para `/bio/`).

`sabah.com.br/bio` dava 404 no WordPress antes, então nada existente é sobrescrito. O subdomínio `bio.sabah.com.br` pode continuar como está ou apontar para o Worker (segunda opção comentada no `wrangler.jsonc`; a raiz redireciona para `/bio/`).

## Estrutura

```text
index.html          página (tokens {{...}} preenchidos no build)
404.html            página de erro
src/config.ts       CONFIGURAÇÃO CENTRAL
src/style.css       estilos
src/main.ts         bootstrap
src/accordion.ts    blocos expansíveis (almoço, jantar, eventos, cardápio)
src/tracking.ts     dataLayer / eventos
vite.config.ts      base /bio/, plugin de template, cópia de cf/ para dist/
cf/                 _headers, _redirects, robots.txt (raiz do Worker)
public/             imagens e ícones
scripts/optimize-images.py
wrangler.jsonc      config do Cloudflare Workers
```
