/**
 * CONFIGURAÇÃO CENTRAL da página /bio.
 *
 * Único lugar para alterar links, WhatsApp, horários, endereço e
 * Google Tag Manager. Os valores entram no HTML em tempo de build
 * (tokens {{chave.subchave}} em index.html e 404.html).
 */

/** Número do WhatsApp (DDI + DDD + número, só dígitos). */
const WHATSAPP_NUMBER = "5511918730446";
/** WhatsApp de mídia: só para influenciadores, imprensa e parcerias. */
const WHATSAPP_MEDIA_NUMBER = "5511995635211";

function whatsapp(message?: string, number: string = WHATSAPP_NUMBER): string {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const CONFIG = {
  /** Caminho público da página ("/" = raiz de links.sabah.com.br). */
  basePath: "/",

  /** ID do Google Tag Manager (ex.: "GTM-XXXXXXX"). Vazio = não carrega GTM. */
  gtmId: "",

  site: {
    title: "Sabah | Restaurante Árabe na Avenida Paulista",
    description:
      "Conheça o Sabah, restaurante árabe dentro do Club Homs, na Avenida Paulista. Almoço, jantar, reservas, iFood e buffet para eventos.",
    canonical: "https://links.sabah.com.br/",
    ogImage: "https://links.sabah.com.br/img/og-image.jpg",
  },

  links: {
    reservation: whatsapp("Olá! Vim pelo Instagram do Sabah e gostaria de reservar uma mesa."),
    dinnerReservation: whatsapp(
      "Olá! Vim pelo Instagram do Sabah e gostaria de reservar uma mesa para o jantar.",
    ),
    whatsapp: whatsapp(),
    eventsWhatsapp: whatsapp(
      "Olá! Conheci o buffet para eventos pelo Instagram do Sabah e gostaria de solicitar um orçamento.",
    ),
    /** Influenciadores, imprensa e parcerias (número próprio de mídia). */
    mediaWhatsapp: whatsapp(
      "Olá! Vim pelo Instagram do Sabah e gostaria de apresentar uma proposta de mídia ou parceria. Meu nome: ___ / Perfil, veículo ou empresa: ___ / Proposta: ___ / Link do mídia kit, se houver: ___.",
      WHATSAPP_MEDIA_NUMBER,
    ),

    /** Avaliação do Sabah no Google (abre direto a tela de avaliar). */
    googleReview: "https://g.page/r/CcZR6OpfkXzwEAE/review",

    ifood:
      "https://www.ifood.com.br/delivery/sao-paulo-sp/sabah-cozinha-arabe-esfihas-e-kebabs-bela-vista/dbf10475-e887-40b5-bb54-7ee90bfd12f6",

    /** Cardápio do salão (PDF). */
    menu: "https://drive.google.com/file/d/13W7Nrt4xetYpO-LgTtKqiaFdbRTgSUnl/view",
    /** Cardápio de delivery e encomendas (PDF). */
    menuDelivery: "https://drive.google.com/file/d/1GcBjehcGxpgiexmxQQUGSJdCzWeDnpGz/view",

    /** Ficha do Sabah no Google Maps. */
    maps: "https://maps.google.com/?cid=17328885307363840454",

    website: "https://sabah.com.br/",
    instagram: "https://www.instagram.com/sabahcozinhaarabe/",
  },

  /** UTMs adicionadas automaticamente a todo link que aponte para sabah.com.br. */
  utm: {
    source: "instagram",
    medium: "bio",
    campaign: "sabah_bio",
  },

  address: {
    street: "Av. Paulista, 735",
    complement: "Club Homs",
    city: "São Paulo/SP",
  },

  hours: {
    lunchWeekdays: "11h30 às 15h30",
    lunchWeekend: "12h às 16h",
    dinner: "19h às 21h45",
    delivery: "11h às 21h45",
  },
} as const;

export type Config = typeof CONFIG;
