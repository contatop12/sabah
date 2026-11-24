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

A hero usa os dois recortes aprovados no briefing de 24/11/2026, guardados em `media-src/` com o nome original:

| Versão | Arquivo | Dimensões |
| --- | --- | --- |
| Desktop | `sabah-banner-desktop.webp` | 1037 × 799 |
| Mobile | `sabah-banner-mobile.webp` | 1036 × 777 |

No celular o painel de conteúdo vem primeiro e a foto aparece inteira logo depois. No desktop o painel vinho fica à esquerda e a foto ocupa cerca de 58% da largura. Para trocar uma foto, substitua o arquivo e rode `npm run media`.

### Painel da hero, lanternas e ornamentos

O painel bordô segue a referência aprovada pela P12 em 24/11/2026 (imagem 1600 × 800 enviada na conversa): cor `#6e0211`, guirlanda no canto superior esquerdo com um fio de contas, duas lanternas à direita (uma pequena no alto e uma maior mais abaixo) e cinco estrelas, tudo em `#8b1c25`. O prêmio fica em uma linha a partir de 1340 px; o título ocupa três linhas no desktop.

Os desenhos são SVG, definidos em `src/partials/icons.html` (`d-garland`, `d-lamp-bulb`, `d-lamp-cage`, `d-star`, `d-ornament`) e posicionados em `main.css` (`.hero__deco`, `.lamp`, `.ornament`). Entre 900 e 1179 px a lanterna grande some, para não ficar sobre o título; no celular fica só a lanterna pequena. Em Sobre o Sabah há um ornamento curto abaixo do título. A camada é decorativa, fica oculta de leitores de tela e não recebe foco nem cliques.

### O que você encontra no salão

O conteúdo das duas abas fica em `src/partials/salao.html`: 12 cards da bancada, o bloco do Sr. Nilton, 4 sobremesas e 6 cards à la carte. As abas são controladas por `src/tabs.ts`.

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
| Hero, Open Graph | `sabah-banner-desktop.webp`, `sabah-banner-mobile.webp` | recortes aprovados no briefing de 24/11/2026 |
| Bancada (foto larga) | `buffet-bancada.jpg` | acervo 2026 |
| Cartão do almoço | `buffet-almoco.jpg` | acervo 2026, DSC00050 |
| Cartão do jantar | `esfihas-mesa.jpg` | cardápio em PDF |
| Trio de pastas, tabule, kafta, michui | `prato-homus.jpg`, `prato-tabule.jpg`, `prato-kafta.jpg`, `prato-michui.jpg` | cardápio em PDF |
| Arroz M'jadara | `bancada-mjadara.jpg` | acervo 2026, DSC00014 (indicada no briefing) |
| Arroz Chairie | `bancada-chairie.jpg` | acervo 2026, DSC00474 (indicada no briefing) |
| Charutinho de uva | `bancada-charuto-uva.jpg` | acervo 2026, DSC00440 (escolha minha) |
| Charutinho de repolho | `bancada-charuto-repolho.jpg` | acervo 2026, DSC00458 (escolha minha) |
| Kibes | `bancada-kibes.jpg` | montagem aprovada `kibes-cru-assado-frito.png` (cru, assado e frito), com as duas linhas divisórias removidas e as emendas igualadas, para os três pratos ficarem na mesma foto |
| Legumes recheados | `bancada-legumes.jpg` | acervo 2026, DSC00523 (indicada no briefing) |
| Faláfel | `prato-falafel.jpg` | site anterior |
| Esfihas salgadas | `bancada-esfihas.jpg` | acervo 2026, DSC00073 (indicada no briefing) |
| Sobremesas | `sobremesa-doces.jpg`, `sobremesa-pudim.jpg`, `sobremesa-frutas.jpg`, `sobremesa-esfiha-doce.jpg` | acervo 2026, DSC01217, DSC00080, DSC00084 e DSC01361 (indicadas no briefing) |
| Combinado | `alacarte-combinado.jpg` | acervo 2026, DSC01096 (indicada no briefing) |
| Kebabs | `kebab.jpg` | cardápio em PDF |
| Esfihas (à la carte) | `alacarte-esfihas.jpg` | acervo 2026, DSC00999 (indicada no briefing) |
| Sr. Nilton | `nilton-sahtein.png` | recorte da referência visual do bloco ("Sahtein! Dica do fundador do Sabah.png") |
| Beirute de kafta | `alacarte-beirute.jpg` | acervo 2026, DSC01155 (escolha minha) |
| Kibe frito | `kibe-frito-2026.jpg` | acervo 2026, DSC00701 |
| Batata frita com zátar | `alacarte-batata.jpg` | acervo 2026, DSC00828 (indicada no briefing) |
| Reconhecimentos (SBT) | `esfiha-fechada-carne.jpg` | acervo 2026, DSC00801 |
| Quem visitou | `criador-*.jpg` | miniatura do próprio post no Instagram (360 × 640) |
| Sobre o Sabah | `familia-sabbag.jpg` | seção Quem Somos do site anterior |
| Como chegar | `club-homs.jpg`, `public/video/como-chegar.*` | site anterior |
| Eventos, Sabah em casa | `evento-mesa.jpg`, `kebab.jpg` | site anterior e cardápio em PDF |
| Chamada final | `salao.jpg` | acervo 2026 |

O acervo 2026 fica no Drive (pasta "[2026] Fotos/vídeos Ricardo"). `npm run media` apaga de `public/img` o que sair do manifesto; os originais continuam em `media-src/`.

## Vídeos de "O Sabah pelos olhos de quem visitou"

Nove vídeos em carrossel, na ordem definida pela P12 em 24/11/2026, sem número de seguidores. Autoria e legenda conferidas em cada post em 23/11/2026.

| # | Card | Quem publicou | Data | Post |
| --- | --- | --- | --- | --- |
| 1 | Mohamad Hindi (@mohindi) | @sabahcozinhaarabe | 24/07/2022 | CgZb33nOp1m |
| 2 | Sampa Dicas (@sampadicas) | @sabahcozinhaarabe | 14/03/2024 | C4gLlb7vTn- |
| 3 | Desbrava São Paulo (@desbravasaopaulo) | @desbravasaopaulo | 12/12/2024 | DDf0zFAuNwk |
| 4 | Paulistano por aí (@paulistanoporai) | @paulistanoporai | 07/08/2025 | DNEhauZuOIk |
| 5 | Turistando SP (@turistandosp) | @turistandosp | 18/10/2022 | Cj30kWiJXQM |
| 6 | Anna Campos e Rogerio (@dicas.em.sp) | @dicas.em.sp | 27/06/2024 | C8vHG1nxdL5 |
| 7 | Juliana Mendes (@j.u.mendes) | @j.u.mendes | 02/09/2025 | DOHQ3RYkmkn |
| 8 | Jornaliz (@jornaliz_) | @jornaliz_ | 03/01/2024 | C1pvUAjv44E |
| 9 | Aline Souza (@alinesouzatb) | @alinesouzatb | 27/05/2026 | DY25eqDp9Wr |

Cada link é `https://www.instagram.com/p/<post>/`. Os dois primeiros vídeos estão publicados no perfil do Sabah, e o card informa isso.

## Pendências que dependem do Sabah

1. **Poses do Sr. Nilton**: a arte original da campanha com as duas poses não foi entregue (o link do briefing aponta para o arquivo dos kibes). A pose sorrindo com a placa foi recortada da referência visual do bloco, com fundo creme e baixa resolução (700 px). Falta a **pose pensativa**, que deve aparecer ao abrir a dica: hoje a dica abre com a mesma ilustração. Enviar as duas poses em PNG ou WebP transparente.
2. **Lanternas e guirlanda**: foram redesenhadas em SVG a partir da imagem de referência enviada pela P12. Validar o desenho final.
3. **Parceiros e Guias Gastronômicos**: essa seção não existe na prévia (saiu na primeira versão). Se deve voltar, enviar os logos e a lista de parceiros.
4. **Beirute de kafta e charutinhos**: escolhi no acervo as fotos DSC01155 (sanduíche tostado no pão sírio), DSC00440 (uva) e DSC00458 (repolho). Confirmar que são esses os pratos.
5. **Opções do à la carte**: os grupos do combinado e as opções de kebabs, beirute e esfihas (controles "Ver opções…" dos cartões) foram copiados do cardápio do salão vigente, páginas 3, 6 e 7, sem os preços. Confirmar, e avisar quando o cardápio mudar.
6. **Esfiha doce**: a foto indicada (DSC01361) foi legendada como esfiha de chocolate, conforme o briefing.
7. **Capas dos vídeos**: são as miniaturas dos próprios posts (360 px de largura). Com os arquivos originais a nitidez melhora. Confirmar a autorização de uso com os criadores.
8. **@ dos criadores**: `@sampadicas` e `@mohindi` vieram dos cards do site anterior; os dois vídeos estão no perfil do Sabah.
9. **Esfiha campeã**: confirmar que a foto DSC00801 é a receita que venceu no SBT. O nome "Esfiha SBT" segue fora da página.
10. **Horário do jantar**: a página usa 19h às 22h. O cardápio em PDF e o link-in-bio dizem 21h45.
11. **Reserva para grupos**: sem número mínimo de pessoas publicado.
12. **Molho de alho** não é citado no trio de pastas, por falta de confirmação de que fica na bancada.
13. **Horário da entrega pelo iFood** (11h às 21h45) e **faixa de 50 a 200 convidados** do buffet a domicílio vieram do site anterior.
14. **Foto da entrega do prêmio GoWhere ou selo oficial**: sem material aprovado; o bloco segue sem imagem.
15. **FAQ**: "não precisa ser sócio do Club Homs" foi deduzido do site anterior. **Estacionamento**: tarifas e convênio não detalhados.
