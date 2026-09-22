# Sabah – Bio

Clone estático de [bio.sabah.com.br](https://bio.sabah.com.br/) (página "link in bio"), feito em HTML, CSS e TypeScript, pronto para deploy no Cloudflare Workers (static assets).

## Stack

- **HTML** – `index.html` (conteúdo e links) e `404.html`
- **CSS** – `src/style.css` (estilos extraídos do tema original, sem Bootstrap)
- **TypeScript** – `src/main.ts`, `src/blur-up.ts` (blur-up do avatar) e `src/share.ts` (botão compartilhar: Web Share API com fallback de copiar link); o build gera JS puro em `dist/assets/`
- **Vite** – dev server e build
- **Wrangler** – deploy no Cloudflare

## Comandos

```bash
npm install          # instala dependências
npm run dev          # dev server (http://localhost:5173)
npm run build        # typecheck + build em dist/
npm run preview      # serve o dist/ localmente
npm run cf:dev       # roda o dist/ com o runtime do Cloudflare (testa _headers, 404)
npm run deploy:dry   # valida config do wrangler sem publicar
npm run deploy       # build + deploy no Cloudflare Workers
```

## Deploy no Cloudflare

1. Autenticar uma vez: `npx wrangler login`
2. Publicar: `npm run deploy`
3. O Worker `sabah-bio` fica disponível em `https://sabah-bio.<sua-conta>.workers.dev`

### Domínio bio.sabah.com.br (cutover)

O domínio atual ainda aponta para o WordPress. Para trocar:

1. A zona `sabah.com.br` precisa estar na mesma conta Cloudflare.
2. Em `wrangler.jsonc`, descomente o bloco `routes` com `"custom_domain": true`.
3. Rode `npm run deploy`. O Cloudflare cria o DNS e o certificado automaticamente.

Ou, pelo painel: Workers & Pages → `sabah-bio` → Settings → Domains & Routes → Add custom domain.

### Deploy automático via Git (Workers Builds)

No painel: Workers & Pages → Create → conectar o repositório `contatop12/sabah`.
Deploy command: `npx wrangler deploy`. Build command pode ficar vazio: o `build.command` do `wrangler.jsonc` roda `npm run build` automaticamente.

### Alternativa: Cloudflare Pages

O mesmo `dist/` funciona no Pages (build command `npm run build`, output `dist`). Os arquivos `_headers` e `404.html` são respeitados nos dois.

## Editar os links

Os cards estão em `index.html`, dentro de `<ul class="cards">`. Cada `<li>` tem ícone (`<use href="#i-...">`), título e subtítulo; alterne `card--wine` e `card--paper`. Ícones sociais ficam em `<ul class="social">`. Cores e fonte estão nas variáveis CSS no topo de `src/style.css`.

## Imagens

- `public/avatar-150.png` / `avatar-260.png` – avatar (1x / 2x)
- `public/avatar-1080.png` – imagem para compartilhamento (og:image)
- `public/apple-touch-icon.png`, `public/favicon-32.png` – ícones (o original não tinha favicon)
