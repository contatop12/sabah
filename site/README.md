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

### Fotos da hero

A hero usa os dois PNGs aprovados no briefing de 23/11/2026, guardados em `media-src/` com o nome original:

| Versão | Arquivo | Dimensões |
| --- | --- | --- |
| Desktop | `rodizio-arabe-sabah.png` | 1672 × 941 (horizontal) |
| Mobile | `buffet-arabe-a-vontade-sabah.png` | 1122 × 1402 (vertical) |

No celular a foto aparece em faixa no topo. O recorte tira os 28% de cima (cadeiras e fundo) e mantém o homus, o pão e o prato principal; a altura da faixa acompanha a tela (`.hero__photo` em `main.css`). Para trocar uma foto, substitua o arquivo e rode `npm run media`.

### WhatsApp por assunto

Os sete assuntos, com número e mensagem, ficam em `WHATSAPP_TOPICS` (`src/config.ts`). O painel flutuante e os botões das seções saem dessa lista. São três números: geral (11) 91873-0446, grupos (11) 97511-4014 e mídia (11) 97663-5211, este último só para influenciadores, imprensa e parcerias.

### Vídeos de quem visitou

A lista fica em `VISITOR_VIDEOS` (`src/content.ts`). Só entra vídeo com autoria conferida no post e capa aprovada.

## SEO, GEO e AEO

- Title e meta description do briefing, um único H1, canonical, Open Graph e Twitter Card.
- JSON-LD gerado no build: `Restaurant` (endereço, horários de almoço e jantar, cardápio, reserva para grupos, prêmios), `WebSite`, `WebPage`, `FAQPage` e `BreadcrumbList` nas páginas internas.
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
| `menu_view` | acesso ao cardápio (completo, salão ou delivery) |
| `ifood_click` | clique em iFood |
| `quote_submit` | envio do orçamento de eventos |
| `whatsapp_selector_open` | abertura do painel de WhatsApp |
| `whatsapp_click` | clique num assunto de WhatsApp, no painel ou nas seções |

O `whatsapp_click` leva o parâmetro `topic` só com o identificador do assunto (`almoco`, `jantar`, `domicilio`, `grupo`, `retirada`, `midia`, `fornecedores`), sem número nem mensagem. Ele conta como abertura de conversa, porque o envio acontece no aplicativo. O antigo `reservation_click` saiu: reserva de grupo agora é `whatsapp_click` com `topic = grupo`.

Apoio: `instagram_click`, `video_click`, `video_play`, `award_click`, `reviews_click`, `quote_open`. No GTM, crie um gatilho de evento personalizado para cada um.

## Mídias usadas

| Seção | Arquivo (`media-src/`) | Origem |
| --- | --- | --- |
| Hero, Open Graph | `rodizio-arabe-sabah.png`, `buffet-arabe-a-vontade-sabah.png` | PNGs aprovados no briefing de 23/11/2026 |
| Bancada | `buffet-bancada.jpg` | sessão de fotos 2026 (original 7008 px) |
| Cartão do almoço | `buffet-almoco.jpg` | acervo 2026, DSC00050 (close da bancada) |
| Cartão do jantar | `esfihas-mesa.jpg` | cardápio em PDF |
| Pratos | `prato-*.jpg` | fotos do cardápio em PDF; faláfel do site atual |
| Reconhecimentos (SBT) | `esfiha-fechada-carne.jpg` | acervo 2026, DSC00801 (uma inteira e outra cortada) |
| Quem visitou | `criador-*.jpg` | área da foto dos cards "Eles Recomendam" do site anterior (260 × 366) |
| Sobre o Sabah | `familia-sabbag.jpg` | seção Quem Somos do site atual |
| Como chegar | `club-homs.jpg`, `public/video/como-chegar.*` | site atual (vídeo de 46 MB reduzido para 5 a 7 MB) |
| Eventos | `evento-mesa.jpg` | site atual |
| Sabah em casa | `kebab.jpg` | cardápio em PDF |
| Chamada final | `salao.jpg` | sessão de fotos 2026 |

O acervo 2026 fica no Drive (pasta "[2026] Fotos/vídeos Ricardo"). Geradas mas sem uso na página: `buffet-salao`, `buffet-cubas`, `prato-montado`, `prato-doces`, `esfihas-salgadas`, `kibe-frito`, `placa-sabah`, `evento-dabke`, `evento-buffet`. A foto antiga da hero (`hero-mesa.jpg`) continua em `media-src/`, fora da página.

## Vídeos escolhidos para "O Sabah pelos olhos de quem visitou"

Autoria e legenda conferidas em cada post em 23/11/2026.

| Card | Autor do post | Data | Link |
| --- | --- | --- | --- |
| Turistando (@turistandosp) | @turistandosp | 18/10/2022 | <https://www.instagram.com/p/Cj30kWiJXQM/> |
| Sampa Dicas (@sampadicas) | @sabahcozinhaarabe, sobre a visita do Gabriel, do Sampa Dicas | 14/03/2024 | <https://www.instagram.com/p/C4gLlb7vTn-/> |
| Mohamad Hindi (@mohindi) | @sabahcozinhaarabe, sobre a indicação de Mohamad Hindi | 24/07/2022 | <https://www.instagram.com/p/CgZb33nOp1m/> |

Entraram os três que têm capa aprovada (as do site anterior). Os outros links de referência do briefing têm autoria conferida, mas não têm capa aprovada: @dicas.em.sp (C8vHG1nxdL5, 27/06/2024), @jornaliz_ (C1pvUAjv44E, 03/01/2024), @paulistanoporai (DNEhauZuOIk, 07/08/2025), @desbravasaopaulo (DDf0zFAuNwk, 12/12/2024), @aceitaessadica (DHBeMsaMtPJ, 10/03/2025), @alinesouzatb (DY25eqDp9Wr, 27/05/2026), @j.u.mendes (DOHQ3RYkmkn, 02/09/2025) e @andreyakb (C-X265kOTrw, 07/08/2024).

## Pendências que dependem do Sabah

1. **Capas dos vídeos**: as três capas vêm dos cards do site anterior e têm só 260 px de largura. Enviar as capas originais, ou autorizar o uso das capas dos posts, para melhorar a nitidez e incluir criadores mais recentes.
2. **@ dos criadores**: `@sampadicas` e `@mohindi` foram copiados dos cards do site anterior; os dois vídeos estão publicados no perfil do Sabah. Confirmar os perfis.
3. **Esfiha campeã**: a foto usada (DSC00801) mostra uma esfiha fechada com recheio de carne. Confirmar que é a receita que venceu no SBT. O nome "Esfiha SBT" ficou fora da página até essa confirmação.
4. **Horário do jantar**: a página usa 19h às 22h, todos os dias. O cardápio em PDF e o link-in-bio dizem 19h às 21h45. Confirmar.
5. **Bebidas e sobremesas**: as menções a "sobremesa incluída" e "bebidas" saíram do almoço, do jantar e da FAQ até o Sabah confirmar o que está incluído em cada serviço.
6. **Reserva para grupos**: a página não informa número mínimo de pessoas. Publicar só se o Sabah definir esse limite.
7. **Horário da entrega pelo iFood** (11h às 21h45) e **faixa de 50 a 200 convidados** do buffet a domicílio vieram do site anterior. Confirmar.
8. **Foto da entrega do prêmio GoWhere ou selo oficial**: não há material aprovado; o bloco ficou sem imagem.
9. **Orçamento de eventos**: o formulário abre o WhatsApp com a mensagem pronta (não há backend). Confirmar se o Sabah também quer receber por e-mail.
10. **FAQ**: "não precisa ser sócio do Club Homs" foi deduzido do site atual. Confirmar.
11. **Estacionamento**: tarifas e convênio não foram detalhados.
12. **Legenda da foto da família**: "Bruno e Nilton Sabbag". Confirmar. O acervo 2026 tem retratos novos, ainda não usados.
13. **Michui de frango**: foto identificada pelo cardápio. Confirmar que é esse o prato.
