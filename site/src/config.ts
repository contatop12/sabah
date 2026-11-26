/**
 * CONFIGURAÇÃO CENTRAL do site sabah.com.br.
 *
 * Única fonte de endereço, horários, telefones, links, WhatsApp e tracking.
 * A home, o rodapé, o painel de WhatsApp, os dados estruturados (JSON-LD),
 * o sitemap, o robots.txt e o llms.txt são gerados a partir daqui no build.
 * Alterou aqui, mudou em tudo.
 */

/**
 * WhatsApp do Sabah: único contato do site. Atende todos os assuntos, inclusive as
 * reservas para grupos grandes. O site não mostra telefone fixo.
 */
const WHATSAPP_GERAL = "5511918730446";
/** WhatsApp de mídia: EXCLUSIVO para influenciadores, imprensa e parcerias. */
const WHATSAPP_MIDIA = "5511976635211";

function wa(number: string, message?: string): string {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * ASSUNTOS DO WHATSAPP. Cada assunto tem um número e uma mensagem inicial,
 * que a pessoa pode editar antes de enviar. O painel flutuante e os botões
 * das seções usam esta mesma lista. `id` é o que vai para a mensuração.
 */
export const WHATSAPP_TOPICS = [
  {
    id: "almoco",
    label: "Dúvidas sobre o almoço",
    number: WHATSAPP_GERAL,
    message: "Olá! Vim pelo site do Sabah e gostaria de tirar uma dúvida sobre o almoço.",
  },
  {
    id: "jantar",
    label: "Dúvidas sobre o jantar",
    number: WHATSAPP_GERAL,
    message: "Olá! Vim pelo site do Sabah e gostaria de tirar uma dúvida sobre o jantar.",
  },
  {
    id: "domicilio",
    label: "Dúvidas sobre buffet a domicílio",
    number: WHATSAPP_GERAL,
    message:
      "Olá! Gostaria de saber mais sobre o buffet a domicílio do Sabah. Data do evento: ___ / Bairro ou cidade: ___ / Número de convidados: ___.",
  },
  {
    id: "grupo",
    label: "Reservar para um grupo grande",
    number: WHATSAPP_GERAL,
    message:
      "Olá! Gostaria de reservar uma mesa para um grupo grande. Data: ___ / Horário: ___ / Número de pessoas: ___.",
  },
  {
    id: "retirada",
    label: "Encomendar para retirar no Sabah",
    number: WHATSAPP_GERAL,
    message:
      "Olá! Gostaria de fazer uma encomenda para retirar no Sabah. Meu pedido: ___ / Data e horário de retirada: ___.",
  },
  {
    id: "midia",
    label: "Influenciadores, mídia e parcerias",
    number: WHATSAPP_MIDIA,
    message:
      "Olá! Vim pelo site do Sabah e gostaria de apresentar uma proposta de mídia ou parceria. Meu nome: ___ / Perfil, veículo ou empresa: ___ / Proposta: ___ / Link do mídia kit, se houver: ___.",
  },
  {
    id: "fornecedores",
    label: "Fornecedores",
    number: WHATSAPP_GERAL,
    message:
      "Olá! Meu nome é ___, falo pela empresa ___ e gostaria de apresentar nossos produtos ou serviços ao Sabah. Trabalhamos com ___.",
  },
] as const;

export type WhatsappTopicId = (typeof WHATSAPP_TOPICS)[number]["id"];

/** Link pronto de um assunto, com a mensagem codificada no parâmetro `text`. */
function topicLink(id: WhatsappTopicId): string {
  const topic = WHATSAPP_TOPICS.find((t) => t.id === id);
  if (!topic) throw new Error(`[sabah] assunto de WhatsApp desconhecido: ${id}`);
  return wa(topic.number, topic.message);
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
      "Buffet árabe à vontade no almoço e no jantar na Avenida Paulista, dentro do Club Homs. No jantar, tem rodízio de esfihas e bebidas à vontade.",
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

  /** Contato só por WhatsApp: o número do Sabah e o de mídia (influenciadores, imprensa e parcerias). */
  phone: {
    whatsappDisplay: "(11) 91873-0446",
    whatsappE164: "+5511918730446",
    midiaDisplay: "(11) 97663-5211",
  },

  email: "contato@sabah.com.br",

  /**
   * HORÁRIOS. Os textos aparecem na página (buffet, contato, rodapé, FAQ);
   * `spec` alimenta o JSON-LD e o indicador "aberto agora" (fuso de São Paulo).
   * Dias: 0 = domingo … 6 = sábado.
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
    /** Conversa direta com o número do Sabah, onde o número aparece escrito (contato, rodapé, páginas legais). */
    whatsapp: wa(WHATSAPP_GERAL, "Olá! Vim pelo site do Sabah."),
    // WhatsApp por assunto (mesma lista do painel flutuante)
    waAlmoco: topicLink("almoco"),
    waJantar: topicLink("jantar"),
    waDomicilio: topicLink("domicilio"),
    waGrupo: topicLink("grupo"),
    waRetirada: topicLink("retirada"),
    waMidia: topicLink("midia"),
    waFornecedores: topicLink("fornecedores"),
    /** Número que recebe o orçamento de eventos; o formulário monta a mensagem. */
    eventsNumber: WHATSAPP_GERAL,
    eventsWhatsapp: wa(
      WHATSAPP_GERAL,
      "Olá! Vim pelo site do Sabah e gostaria de um orçamento de buffet a domicílio para evento.",
    ),

    menu: MENU,
    menuSalao: `${MENU}#salao`,
    menuDelivery: `${MENU}#delivery`,
    ifood:
      "https://www.ifood.com.br/delivery/sao-paulo-sp/sabah-cozinha-arabe-esfihas-e-kebabs-bela-vista/dbf10475-e887-40b5-bb54-7ee90bfd12f6",
    maps: "https://maps.app.goo.gl/NYnaeeeBb6ij7XVF6",
    googleReviews: "https://maps.app.goo.gl/NYnaeeeBb6ij7XVF6",
    instagram: "https://www.instagram.com/sabahcozinhaarabe/",
    facebook: "https://www.facebook.com/sabahcozinhaarabe/",
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

    agency: "https://www.p12digital.com.br",
  },

  /** Datas usadas no sitemap e nos dados estruturados (AAAA-MM-DD). */
  updated: "2026-11-26",
} as const;

export type Config = typeof CONFIG;
