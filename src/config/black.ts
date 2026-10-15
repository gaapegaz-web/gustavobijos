import { SITE } from './site';

/**
 * Configuração da CAMPANHA (temporária): a live de abertura e o nome do produto.
 * Os dados fixos do Gustavo e do site ficam em site.ts; esta campanha importa de lá, e nada fixo importa daqui.
 * Horários sempre em Brasília (-03:00).
 */

export const CAMPANHA = {
  nome: 'Black Tecnoapis 2026',
  dominio: SITE.dominio,
  professor: SITE.professor,
  clube: SITE.clube,

  // Aula ao vivo em que a Black é aberta (captação em outubro)
  live: {
    titulo: 'Black Friday Tecnoapis 2026',
    subtitulo: 'Todos os cursos, as lives semanais e a comunidade do Clube Tecnoapis, na maior oferta de Black Friday da história do clube.',
    data: '2026-11-06T20:00:00-03:00', // live: sexta, 6/11 às 20h (antes era 29/10)
    duracaoMin: 90,
  },

  /** Nome do produto quando o webhook da Hubla não manda um. */
  preco: { produtoNome: 'Assinatura Anual Tecnoapis' },
} as const;

/** Links curtos: /r/<slug>. Também são semeados no banco na primeira execução. */
export const LINKS = [
  { slug: 'bio', destino: '/black', utm_source: 'instagram', utm_medium: 'bio', utm_campaign: 'black26', descricao: 'Link da bio do Instagram' },
  { slug: 'stories', destino: '/black', utm_source: 'instagram', utm_medium: 'stories', utm_campaign: 'black26', descricao: 'Stories' },
  { slug: 'yt', destino: '/black', utm_source: 'youtube', utm_medium: 'descricao', utm_campaign: 'black26', descricao: 'Descrição dos vídeos' },
  { slug: 'live-01', destino: '/black', utm_source: 'youtube', utm_medium: 'live', utm_campaign: 'black26', utm_content: 'live-01', descricao: 'Live semanal 1' },
  { slug: 'reprise-01', destino: '/black', utm_source: 'youtube', utm_medium: 'reprise', utm_campaign: 'black26', utm_content: 'reprise-01', descricao: 'Reprise 1' },
  { slug: 'zap', destino: '/black', utm_source: 'whatsapp', utm_medium: 'grupo', utm_campaign: 'black26', descricao: 'Mensagem nos grupos' },
  { slug: 'email', destino: '/black', utm_source: 'email', utm_medium: 'email', utm_campaign: 'black26', descricao: 'E-mail' },
  { slug: 'black', destino: '/black', utm_source: 'whatsapp', utm_medium: 'grupo', utm_campaign: 'black26', utm_content: 'abertura', descricao: 'Abertura nos grupos' },
];
