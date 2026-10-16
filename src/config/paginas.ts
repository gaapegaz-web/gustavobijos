/**
 * Páginas públicas indexáveis: alimentam o sitemap.xml e a lista de páginas do /llms.txt.
 * Página de campanha entra aqui enquanto estiver no ar e sai quando a campanha acabar (é só apagar a linha).
 */
export type Pagina = { path: string; titulo: string; descricao: string; prioridade: string; campanha?: boolean };

export const PAGINAS: Pagina[] = [
  { path: '/', titulo: 'Gustavo Bijos', descricao: 'Quem é o Gustavo Bijos, o Clube Tecnoapis (curso de apicultura online) e como começar na apicultura.', prioridade: '1.0' },
  { path: '/tecnoapis', titulo: 'Clube Tecnoapis', descricao: 'Curso de apicultura online do Gustavo Bijos: 25 cursos, live exclusiva toda segunda e Assinatura Anual.', prioridade: '0.9' },
  // Campanhas (temporárias)
  { path: '/black', titulo: 'Black Friday Tecnoapis 2026', descricao: 'Evento ao vivo e grátis com Gustavo Bijos em 06/11, às 20h: a maior Black Friday do Clube Tecnoapis, com 25 cursos de apicultura (campanha temporária).', prioridade: '0.8', campanha: true },
];
