/**
 * CONFIGURAÇÃO CENTRAL da página /bio.
 *
 * Único lugar para alterar links, WhatsApp, horários, endereço, campanha
 * GoWhere e Google Tag Manager. Os valores entram no HTML em tempo de build
 * (tokens {{chave.subchave}} em index.html e 404.html).
 */

/** Número do WhatsApp (DDI + DDD + número, só dígitos). */
const WHATSAPP_NUMBER = "5511918730446";

function whatsapp(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const CONFIG = {
  /** Caminho público da página (sabah.com.br/bio/). */
  basePath: "/bio/",

  /**
   * Campanha GoWhere.
   * true  = mostra o CTA "Vote no Sabah" no topo dos links.
   * false = esconde o bloco inteiro e os demais links sobem.
   * Se links.gowhere estiver vazio, o bloco também é ocultado (com aviso no build).
   */
  showGoWhereCampaign: true,

  /** ID do Google Tag Manager (ex.: "GTM-XXXXXXX"). Vazio = não carrega GTM. */
  gtmId: "",

  site: {
    title: "Sabah | Restaurante Árabe na Avenida Paulista",
    description:
      "Conheça o Sabah, restaurante árabe dentro do Club Homs, na Avenida Paulista. Almoço, jantar, reservas, iFood e buffet para eventos.",
    canonical: "https://sabah.com.br/bio/",
    ogImage: "https://sabah.com.br/bio/img/og-image.jpg",
  },

  links: {
    /** URL de votação no prêmio Campeões da Gastronomia (GoWhere 2026). PREENCHER. */
    gowhere: "",

    reservation: whatsapp("Olá! Vim pelo Instagram do Sabah e gostaria de reservar uma mesa."),
    dinnerReservation: whatsapp(
      "Olá! Vim pelo Instagram do Sabah e gostaria de reservar uma mesa para o jantar.",
    ),
    whatsapp: whatsapp(),
    eventsWhatsapp: whatsapp(
      "Olá! Conheci o buffet para eventos pelo Instagram do Sabah e gostaria de solicitar um orçamento.",
    ),

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
