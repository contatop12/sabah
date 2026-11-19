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
    q: "Qual é o horário do buffet de almoço?",
    a: `O buffet árabe à vontade é servido no almoço de segunda a sexta, das ${hours.lunchWeekdays}, e aos sábados, domingos e feriados, das ${hours.lunchWeekend}. A sobremesa está incluída.`,
  },
  {
    q: "O Sabah abre para o jantar?",
    a: `Sim. O jantar é servido todos os dias, das ${hours.dinner}, mediante reserva pelo WhatsApp ${phone.reservasDisplay}. À noite, o buffet árabe vem acompanhado de rodízio de esfihas, sobremesa e bebidas.`,
  },
  {
    q: "Preciso ser sócio do Club Homs para ir ao restaurante?",
    a: `Não. O Sabah é aberto ao público. Basta entrar no ${address.place} e avisar na portaria que você vai ao restaurante.`,
  },
  {
    q: "Como faço uma reserva?",
    a: `As reservas são feitas pelo WhatsApp ${phone.reservasDisplay}. Para o almoço a reserva é opcional; para o jantar, ela é necessária.`,
  },
  {
    q: "O buffet tem opções sem carne?",
    a: "Sim. O buffet inclui pratos sem carne, como homus, coalhada seca, babaganuche, tabule, faláfel e m'jadara (arroz com lentilhas e cebola dourada). Os pratos podem variar conforme o dia.",
  },
  {
    q: "Tem estacionamento?",
    a: `O ${address.place} tem estacionamento interno, com acesso direto ao clube. Consulte as tarifas e o convênio com o Sabah. Aos domingos e feriados, quando a Avenida Paulista fecha para carros, há um trajeto autorizado pela CET até o estacionamento.`,
  },
  {
    q: "O Sabah faz delivery?",
    a: `Sim. O delivery funciona todos os dias, das ${hours.delivery}, pelo iFood. Encomendas também podem ser feitas pelo WhatsApp ${phone.whatsappDisplay}.`,
  },
  {
    q: "O Sabah atende eventos?",
    a: "Sim. O Sabah leva buffet árabe a aniversários, casamentos, eventos corporativos e confraternizações em São Paulo e região, para grupos de aproximadamente 50 a 200 convidados. O orçamento é feito pelo WhatsApp.",
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
