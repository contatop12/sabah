// Constantes do site que o Worker usa (o build escreve o resto em /p12-kit/config.json).
export const SITE_URL = 'https://sabah.com.br';
export const SITE_NAME = 'Sabah Cozinha Árabe';

/** Minutos de leitura: 200 palavras por minuto, no mínimo 2. */
export const readingMinutes = (texto: string) => Math.max(2, Math.round(texto.split(/\s+/).filter(Boolean).length / 200));
