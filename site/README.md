# Sabah – site institucional (sabah.com.br)

Nova home do Sabah Cozinha Árabe em HTML, CSS e TypeScript puros (Vite), publicada como site estático no Cloudflare Workers. Sem framework e sem biblioteca em runtime: 13 kB de HTML, 7 kB de CSS e 5 kB de JS (gzip).

Fica na pasta `site/` do repositório. A raiz continua sendo o link-in-bio (`sabah-bio`, links.sabah.com.br), que não foi alterado.

## Comandos

```bash
cd site
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build em dist/ (gera sitemap.xml, robots.txt, llms.txt, _headers, _redirects)
npm run preview    # serve o dist/
npm run cf:dev     # roda o dist/ no runtime do Cloudflare (testa redirects, 404 e headers)
npm run deploy     # build + deploy manual
npm run media      # regenera as imagens otimizadas a partir de media-src/
```

## Deploy pelo GitHub (Cloudflare Workers Builds)

1. Cloudflare → Workers & Pages → Create → Import a repository → `contatop12/sabah`.
2. Nome do Worker: `sabah-site`. **Root directory: `site`**. Build command: vazio (o `wrangler.jsonc` já roda `npm run build`). Deploy command: `npx wrangler deploy`.
3. Em Build watch paths, use `site/*` para este Worker (e exclua `site/*` no `sabah-bio`), assim cada push só publica o projeto que mudou.
4. A prévia sai em `sabah-site.<conta>.workers.dev`, com `X-Robots-Tag: noindex`.
5. Depois da aprovação: Settings → Domains & Routes → Custom domain → `sabah.com.br` e `www.sabah.com.br`.

## Onde alterar cada coisa

| O que | Onde |
| --- | --- |
| Endereço, telefones, WhatsApp, horários, links, GTM | `src/config.ts` (fonte única: página, rodapé, JSON-LD, sitemap e llms.txt saem daqui) |
| Perguntas frequentes e avaliações | `src/content.ts` (a FAQ alimenta a página e o `FAQPage`) |
| Textos e seções da home | `index.html` |
| Cabeçalho, rodapé, ícones, `<head>` comum | `src/partials/` |
| Cores, fontes, espaçamentos, animações | `src/styles/main.css` (variáveis em `:root`) |
| Redirecionamentos e headers | `cf/_redirects`, `cf/_headers` |
| Fotos | `media-src/` + `npm run media` (lista em `scripts/build-media.mjs`) |

No HTML, `<x-img name="...">` vira `<picture>` com AVIF + WebP, fallback JPEG, `width`/`height` reais e `loading="lazy"`.

### Trocar as fotos da hero

O briefing cita dois PNGs aprovados (`rodizio-arabe-sabah(1).png` 1672×941 e `buffet-arabe-a-vontade-sabah(1).png` 1122×1402) que não estavam disponíveis. A hero usa a foto da mesa do site atual. Para trocar: salve os arquivos em `media-src/`, aponte `hero-desktop` e `hero-mobile` para eles em `scripts/build-media.mjs` (removendo `crop`) e rode `npm run media`.

## SEO, GEO e AEO

- Title e meta description do briefing, um único H1, canonical, Open Graph e Twitter Card.
- JSON-LD gerado no build: `Restaurant` (endereço, horários de almoço e jantar, cardápio, reserva, prêmios), `WebSite`, `WebPage`, `FAQPage` e `BreadcrumbList` nas páginas internas.
- `sitemap.xml`, `robots.txt` (buscadores e bots de IA liberados) e `llms.txt` gerados de `src/config.ts`.
- URLs indexadas preservadas: `/`, `/politicasdeprivacidade/`, `/termosdeuso/`. Sitemaps antigos do Yoast redirecionam para `/sitemap.xml`. Âncoras antigas (`#comochegar`, `#quemsomos`…) levam às seções novas.
- FAQ visível com respostas diretas, pensada para respostas de buscadores e assistentes.

## Desempenho

- Hero: só a variante usada na tela é pré-carregada (`media` no `preload`), AVIF de 12 a 59 kB.
- Fontes locais (Rakkas e Manrope, WOFF2 latino, 43 kB) com `preload` e fallback de métricas ajustadas.
- Imagens abaixo da dobra com `loading="lazy"`; vídeo só baixa ao clique (`preload="none"`).
- GTM carrega com a página ociosa ou na primeira interação. Pré-conexão a links externos ao passar o mouse ou tocar.
- Cache: `assets/` e `fonts/` por 1 ano (imutável), imagens e vídeo por 30 dias.

## Mensuração

GTM `GTM-TFZ56NX3` (o mesmo do site atual), com Consent Mode v2: medição e anúncios ficam negados até o aceite. Eventos no `dataLayer`, com o parâmetro `location`:

| Evento | Quando |
| --- | --- |
| `route_click` | clique em rota / Como chegar |
| `reservation_click` | clique em reserva |
| `menu_view` | acesso ao cardápio |
| `quote_submit` | envio do orçamento de eventos |
| `ifood_click` | clique em iFood |

Apoio: `whatsapp_click`, `instagram_click`, `video_click`, `video_play`, `award_click`, `reviews_click`, `quote_open`. No GTM, crie um gatilho de evento personalizado para cada um.

## Mídias usadas

| Seção | Arquivo (`media-src/`) | Origem |
| --- | --- | --- |
| Hero, Open Graph | `hero-mesa.jpg` | banner do site atual (clareado) |
| Buffet | `buffet-bancada.jpg` | sessão de fotos 2026 (original 7008 px) |
| Chamada final | `salao.jpg` | sessão de fotos 2026 |
| Pratos | `prato-*.jpg` | fotos do cardápio em PDF; faláfel do site atual |
| Reconhecimentos (SBT) | `esfihas-abertas.jpg` | cardápio em PDF; a capa abre o reel no Instagram |
| Jantar | `esfihas-mesa.jpg`, `esfihas-salgadas.jpg` | cardápio em PDF |
| História | `familia-sabbag.jpg` | seção Quem Somos do site atual |
| Como chegar | `club-homs.jpg`, `public/video/como-chegar.*` | site atual (vídeo de 46 MB reduzido para 5 a 7 MB) |
| Eventos | `evento-mesa.jpg` | site atual |
| Delivery | `kebab.jpg` | cardápio em PDF |

Geradas mas ainda sem uso na página: `buffet-salao`, `buffet-cubas`, `prato-montado`, `prato-doces`, `kibe-frito`, `placa-sabah`, `evento-dabke`, `evento-buffet`.

## Pendências de validação com o Sabah

1. **Fotos da hero aprovadas**: os dois PNGs do briefing não estavam acessíveis (link do ChatGPT).
2. **Acervo 2026 e Instagram**: a pasta do Drive não está compartilhada com a conta usada e o Instagram bloqueia download. Faltam originais de: esfiha partida ao meio e vídeo da vitória no SBT (reconhecimentos), esfihas saindo do forno (jantar), foto de pedido real (delivery), entrada do Club Homs atual (como chegar).
3. **Horário do jantar**: o site atual diz 19h às 22h; o cardápio em PDF e o link-in-bio dizem 19h às 21h45. Usei 19h às 22h, mediante reserva.
4. **WhatsApp**: reservas em (11) 97511-4014 (indicado no briefing); eventos e contato em (11) 91873-0446. O link-in-bio usa o segundo para reservas.
5. **Jantar com bebidas**: o cardápio lista Heineken, água e refrigerantes inclusos. A página diz só "sobremesa e bebidas".
6. **Orçamento de eventos**: o formulário do WordPress foi trocado por um formulário que abre o WhatsApp com a mensagem pronta (não há backend). Confirmar se o Sabah também quer receber por e-mail.
7. **FAQ**: "não precisa ser sócio do Club Homs" e "reserva opcional no almoço" foram deduzidos do site atual. Confirmar.
8. **Estacionamento**: tarifas e convênio não foram detalhados.
9. **Detalhe da esfiha no SBT** (em que etapa entrou a esfiha fechada de carne): o vídeo não pôde ser revisado, então a copy ficou como no briefing.
10. **Legenda da foto da família**: "Bruno e Nilton Sabbag". Confirmar.
11. **Michui de frango**: foto identificada pelo cardápio. Confirmar que é esse o prato.
12. **Selo Super Restaurante iFood** e nota do Google não foram usados, por falta de verificação.
13. Seções do site antigo que saíram, conforme o briefing: guias parceiros, "Eles recomendam" e avaliações do iFood em imagem.
