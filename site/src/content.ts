/**
 * Conteúdo estruturado reutilizado em mais de um lugar.
 * As perguntas frequentes aparecem na página E no JSON-LD (FAQPage):
 * manter os dois a partir da mesma lista garante que o dado estruturado
 * sempre reflita o que está visível.
 */
import { CONFIG } from "./config.ts";

const { address, hours, phone } = CONFIG;

export interface Faq {
  q: string;
  /** Texto puro (sem HTML): vai para a página e para o JSON-LD. */
  a: string;
}

export const FAQS: Faq[] = [
  {
    q: "Onde fica o Sabah?",
    a: `O Sabah fica na ${address.full}, dentro do ${address.place}, entre as estações Brigadeiro e Trianon-Masp do metrô (Linha 2-Verde). Entre no clube, avise na portaria que vai ao Sabah e siga até o fim do corredor, à esquerda.`,
  },
  {
    q: "Qual é o horário do almoço?",
    a: `O buffet árabe à vontade é servido no almoço de segunda a sexta, das ${hours.lunchWeekdays}, e aos sábados, domingos e feriados, das ${hours.lunchWeekend}.`,
  },
  {
    q: "O Sabah abre para o jantar?",
    a: `Sim. O jantar é servido todos os dias, das ${hours.dinner}, com o mesmo buffet árabe à vontade do almoço e rodízio de esfihas à mesa.`,
  },
  {
    q: "Preciso reservar para jantar?",
    a: "Para jantar, é só chegar. Para grupos grandes, pedimos reserva pelo WhatsApp.",
  },
  {
    q: "Como reservo para um grupo grande?",
    a: `As reservas para grupos grandes são feitas pelo WhatsApp ${phone.gruposDisplay}. Informe a data, o horário e o número de pessoas.`,
  },
  {
    q: "Preciso ser sócio do Club Homs para ir ao restaurante?",
    a: `Não. O Sabah é aberto ao público. Basta entrar no ${address.place} e avisar na portaria que você vai ao restaurante.`,
  },
  {
    q: "O buffet tem opções sem carne?",
    a: "Sim. O buffet inclui pratos sem carne, como homus, coalhada seca, babaganuche, tabule, faláfel e m'jadara (arroz com lentilhas e cebola dourada). Os pratos da bancada podem variar conforme o dia.",
  },
  {
    q: "Tem estacionamento?",
    a: `O ${address.place} tem estacionamento interno, com acesso direto ao clube. Consulte as tarifas e o convênio com o Sabah. Aos domingos e feriados, quando a Avenida Paulista fecha para carros, há um trajeto autorizado pela CET até o estacionamento.`,
  },
  {
    q: "O Sabah entrega em casa?",
    a: `Sim. A entrega é feita pelo iFood, todos os dias, das ${hours.delivery}. O pedido é feito direto na loja do Sabah no aplicativo.`,
  },
  {
    q: "Posso encomendar e retirar no Sabah?",
    a: `Sim. As encomendas para retirada são combinadas pelo WhatsApp ${phone.whatsappDisplay}. Informe o pedido, a data e o horário em que você vai buscar.`,
  },
  {
    q: "O Sabah faz buffet a domicílio?",
    a: `Sim. O Sabah leva o buffet árabe a aniversários, casamentos, eventos corporativos e confraternizações em São Paulo e região, para grupos de aproximadamente 50 a 200 convidados. O orçamento e as dúvidas são atendidos pelo WhatsApp ${phone.whatsappDisplay}.`,
  },
];

export interface Review {
  author: string;
  text: string;
  /** true quando o texto é um trecho da avaliação original. */
  excerpt?: boolean;
}

/** Avaliações reais publicadas no Google (trechos originais, sem edição). */
export const REVIEWS: Review[] = [
  {
    author: "Monique Forte",
    text: "Comida excelente, dono estava pronto pra nos atender, com muita atenção e carinho, funcionários à disposição também, comida realmente árabe, um espetáculo.",
  },
  {
    author: "Luciana Menezes",
    text: "Restaurante árabe impecável na Av. Paulista. Comida saborosa, fresquinha e bem variada no sistema rodízio ou à lá carte. Vale a pena a visita. Fica dentro do Club Homs.",
  },
  {
    author: "Larissa Santos",
    text: "As comidas estavam ótimas, melhor restaurante árabe que fui, já quero voltar!! O atendimento também foi muito bom, amei conhecer!",
    excerpt: true,
  },
];

export interface VisitorVideo {
  /** Nome do criador, como aparece no card aprovado. */
  creator: string;
  /** @ do criador no Instagram. */
  handle: string;
  title: string;
  /** Post original, conferido em 23/11/2026 (autor e legenda). */
  url: string;
  /** Perfil em que o vídeo está publicado. */
  postedBy: string;
  cover: string;
  coverAlt: string;
  /** Identificador curto para a mensuração. */
  id: string;
}

/**
 * VÍDEOS DE QUEM VISITOU. Só entram vídeos com autoria conferida no post
 * e capa aprovada. As capas vêm dos cards "Eles Recomendam" do site anterior.
 */
export const VISITOR_VIDEOS: VisitorVideo[] = [
  {
    id: "turistando",
    creator: "Turistando",
    handle: "@turistandosp",
    title: "Buffet árabe à vontade na Paulista",
    url: "https://www.instagram.com/p/Cj30kWiJXQM/",
    postedBy: "@turistandosp",
    cover: "criador-turistando",
    coverAlt: "Capa do vídeo do Turistando: criadora na Avenida Paulista com o texto “Árabe escondido na Paulista”",
  },
  {
    id: "sampa-dicas",
    creator: "Sampa Dicas",
    handle: "@sampadicas",
    title: "O Gabriel, do Sampa Dicas, deu seu aval ao Sabah",
    url: "https://www.instagram.com/p/C4gLlb7vTn-/",
    postedBy: "@sabahcozinhaarabe",
    cover: "criador-sampa-dicas",
    coverAlt: "Capa do vídeo do Sampa Dicas: o criador abraçado a um senhor no salão do restaurante",
  },
  {
    id: "mohamad-hindi",
    creator: "Mohamad Hindi",
    handle: "@mohindi",
    title: "Mohamad Hindi indica o Sabah entre os melhores da Paulista",
    url: "https://www.instagram.com/p/CgZb33nOp1m/",
    postedBy: "@sabahcozinhaarabe",
    cover: "criador-mohamad",
    coverAlt: "Capa do vídeo de Mohamad Hindi segurando um prato com um salgado árabe",
  },
];
