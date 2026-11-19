/**
 * CONFIGURAÇÃO CENTRAL do site sabah.com.br.
 *
 * Única fonte de endereço, horários, telefones, links e tracking.
 * A home, o rodapé, os dados estruturados (JSON-LD), o sitemap, o robots.txt
 * e o llms.txt são gerados a partir daqui no build. Alterou aqui, mudou em tudo.
 */

/** WhatsApp de reservas (DDI + DDD + número, só dígitos). */
const WHATSAPP_RESERVAS = "5511975114014";
/** WhatsApp geral: eventos, encomendas e contato. */
const WHATSAPP_GERAL = "5511918730446";

function wa(number: string, message?: string): string {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

const ORIGIN = "https://sabah.com.br";
const MENU = "https://links.sabah.com.br/cardapio";

export const CONFIG = {
  site: {
    origin: ORIGIN,
    name: "Sabah",
    legalName: "Sabah Cozinha Árabe",
    slogan: "A Legítima Cozinha Árabe",
    title: "Sabah | Buffet Árabe na Avenida Paulista, São Paulo",
    description:
      "Conheça o buffet árabe do Sabah na Avenida Paulista, dentro do Club Homs. Veja o cardápio, saiba como chegar e reserve sua mesa.",
    ogImage: `${ORIGIN}/img/og-sabah.jpg`,
    foundingDate: "1993-05",
    foundingYear: "1993",
    founder: "Nilton Sabbag",
    themeColor: "#7d0f14",
  },

  /** Google Tag Manager do site atual. Vazio = não carrega. */
  gtmId: "GTM-TFZ56NX3",

  address: {
    street: "Av. Paulista, 735",
    streetLong: "Avenida Paulista, 735",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    postalCode: "01311-100",
    place: "Club Homs",
    full: "Av. Paulista, 735, Bela Vista, São Paulo, SP",
    metro: "Entre as estações Brigadeiro e Trianon-Masp (Linha 2-Verde)",
  },

  phone: {
    display: "(11) 3284-8899",
    tel: "+551132848899",
    whatsappDisplay: "(11) 91873-0446",
    whatsappE164: "+5511918730446",
    reservasDisplay: "(11) 97511-4014",
    reservasE164: "+5511975114014",
  },

  email: "contato@sabah.com.br",

  /**
   * HORÁRIOS. `text` é o que aparece na página; `spec` alimenta o JSON-LD
   * e o indicador "aberto agora". Dias: 0 = domingo … 6 = sábado.
   */
  hours: {
    lunchWeekdays: "11h30 às 15h30",
    lunchWeekend: "12h às 16h",
    dinner: "19h às 22h",
    delivery: "11h às 21h45",
    spec: [
      { label: "Almoço", days: [1, 2, 3, 4, 5], opens: "11:30", closes: "15:30" },
      { label: "Almoço", days: [0, 6], opens: "12:00", closes: "16:00" },
      { label: "Jantar", days: [0, 1, 2, 3, 4, 5, 6], opens: "19:00", closes: "22:00" },
    ],
  },

  links: {
    reservation: wa(WHATSAPP_RESERVAS, "Olá! Vim pelo site do Sabah e gostaria de reservar uma mesa."),
    dinnerReservation: wa(
      WHATSAPP_RESERVAS,
      "Olá! Vim pelo site do Sabah e gostaria de reservar uma mesa para o jantar.",
    ),
    whatsapp: wa(WHATSAPP_GERAL, "Olá! Vim pelo site do Sabah."),
    /** Base do orçamento de eventos; o formulário completa a mensagem. */
    eventsWhatsapp: wa(
      WHATSAPP_GERAL,
      "Olá! Vim pelo site do Sabah e gostaria de um orçamento de buffet árabe para evento.",
    ),
    eventsNumber: WHATSAPP_GERAL,

    menu: MENU,
    menuSalao: `${MENU}#salao`,
    ifood:
      "https://www.ifood.com.br/delivery/sao-paulo-sp/sabah-cozinha-arabe-esfihas-e-kebabs-bela-vista/dbf10475-e887-40b5-bb54-7ee90bfd12f6",
    maps: "https://maps.app.goo.gl/NYnaeeeBb6ij7XVF6",
    googleReviews: "https://maps.app.goo.gl/NYnaeeeBb6ij7XVF6",
    instagram: "https://www.instagram.com/sabahcozinhaarabe/",
    facebook: "https://www.facebook.com/sabahcozinhaarabe",
    tiktok: "https://www.tiktok.com/@sabahcozinhaarabe",
    bio: "https://links.sabah.com.br/",

    // Reconhecimentos
    gowhereResult:
      "https://gowhere.com.br/gastronomia/conheca-os-ganhadores-do-premio-campeoes-da-gastronomia-de-2026/",
    jovemPan:
      "https://jovempan.com.br/jovem-pan/campeoes-da-gastronomia-2026-veja-os-vencedores-em-33-categorias-de-sao-paulo/",
    gowhereStory:
      "https://gowhere.com.br/destaque/sabah-uma-viagem-pelos-sabores-da-autentica-gastronomia-libanesa-na-avenida-paulista/",
    sbtReel: "https://www.instagram.com/reel/C-TSqfhvNjM/",
    sbtFull: "https://www.instagram.com/p/C-JCFr0tpCI/",
    desbravaSp: "https://www.desbravasp.com.br/blog/onde-comer/onde-comer-esfiha-sao-paulo",

    agency: "https://www.p12digital.com.br",
  },

  /** Datas usadas no sitemap e nos dados estruturados (AAAA-MM-DD). */
  updated: "2026-11-19",
} as const;

export type Config = typeof CONFIG;
