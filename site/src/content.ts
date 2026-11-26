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
    q: "Tem esfiha no almoço?",
    a: "Sim. As esfihas salgadas ficam disponíveis na bancada do almoço. O rodízio de esfihas à mesa faz parte do jantar.",
  },
  {
    q: "O Sabah abre para o jantar?",
    a: `Sim. O jantar é servido todos os dias, das ${hours.dinner}, com a mesma bancada de buffet árabe do almoço, rodízio de esfihas à mesa e bebidas à vontade, incluindo Heineken.`,
  },
  {
    q: "O que está incluído no jantar do Sabah?",
    a: "O jantar inclui buffet árabe, rodízio de esfihas e bebidas à vontade, incluindo Heineken.",
  },
  {
    q: "Preciso reservar para jantar?",
    a: "Para jantar, é só chegar. Para grupos grandes, pedimos reserva pelo WhatsApp.",
  },
  {
    q: "Como reservo para um grupo grande?",
    a: `As reservas para grupos grandes são feitas pelo WhatsApp ${phone.whatsappDisplay}. Informe a data, o horário e o número de pessoas.`,
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

/** Monta um item da lista; a capa é a miniatura do próprio post (media-src/criador-<id>.jpg). */
function video(id: string, creator: string, handle: string, post: string, title: string, postedBy = handle): VisitorVideo {
  return {
    id,
    creator,
    handle,
    title,
    url: `https://www.instagram.com/p/${post}/`,
    postedBy,
    cover: `criador-${id}`,
    coverAlt: `Capa do vídeo de ${creator} sobre o Sabah`,
  };
}

/**
 * VÍDEOS DE QUEM VISITOU, na ordem definida pela P12 em 24/11/2026.
 * Autoria e legenda de cada post foram conferidas no Instagram em 23/11/2026.
 * Não exibir número de seguidores.
 */
export const VISITOR_VIDEOS: VisitorVideo[] = [
  video("mohamad", "Mohamad Hindi", "@mohindi", "CgZb33nOp1m", "Mohamad Hindi indica o Sabah entre os melhores da Paulista", "@sabahcozinhaarabe"),
  video("sampa-dicas", "Sampa Dicas", "@sampadicas", "C4gLlb7vTn-", "O Gabriel, do Sampa Dicas, deu seu aval ao Sabah", "@sabahcozinhaarabe"),
  video("desbrava", "Desbrava São Paulo", "@desbravasaopaulo", "DDf0zFAuNwk", "Experiência árabe à vontade, com bebidas e sobremesa"),
  video("paulistano", "Paulistano por aí", "@paulistanoporai", "DNEhauZuOIk", "Restaurante árabe escondido na Avenida Paulista"),
  video("turistando", "Turistando SP", "@turistandosp", "Cj30kWiJXQM", "Buffet árabe à vontade na Paulista"),
  video("dicas-em-sp", "Anna Campos e Rogerio", "@dicas.em.sp", "C8vHG1nxdL5", "Restaurante escondidinho na Paulista, com mais de 30 anos de tradição"),
  video("juliana-mendes", "Juliana Mendes", "@j.u.mendes", "DOHQ3RYkmkn", "Restaurante escondido dentro do Club Homs"),
  video("jornaliz", "Jornaliz", "@jornaliz_", "C1pvUAjv44E", "Sabah, comida árabe com receitas de família"),
  video("aline-souza", "Aline Souza", "@alinesouzatb", "DY25eqDp9Wr", "Um rodízio árabe secreto na Paulista"),
];
