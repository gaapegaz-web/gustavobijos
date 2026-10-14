/**
 * TODA a configuração da oferta fica aqui: datas, preços, bônus, fases.
 * Horários sempre em Brasília (-03:00). Para mudar a campanha, edite só este arquivo.
 *
 * Itens marcados com [CONFIRMAR] são placeholders aguardando dados reais.
 */

export const CAMPANHA = {
  nome: 'Black Tecnoapis 2026',
  dominio: 'https://gustavobijos.com.br',
  professor: 'Gustavo Nadeu Bijos',
  clube: 'Clube Tecnoapis',

  // Live de captação (outubro)
  live: {
    titulo: 'De 10 para 100 colmeias',
    subtitulo: 'O passo a passo para multiplicar o seu apiário sem comprar enxame',
    data: '2026-11-06T20:00:00-03:00', // live: sexta, 6/11 às 20h (antes era 29/10)
    duracaoMin: 90,
  },

  // Janela de vendas
  aberturaVendas: '2026-11-01T00:00:00-03:00',
  fimVendas: '2026-11-27T23:59:59-03:00',

  // Preços. Referência real: a assinatura anual era 12x R$ 49,60 / R$ 497 à vista (site de 2024). Black: [CONFIRMAR]
  preco: {
    cheio: 497,
    black: 297,
    parcelas: 12,
    parcelaValor: 29.7,
    moeda: 'BRL',
    produtoNome: 'Assinatura Anual Tecnoapis',
  },

  garantiaDias: 7,

  // Bio real (site tecnoapis.com.br, 2024)
  professorBio: {
    anos: 27,
    resumo: 'Criador do Clube Tecnoapis e do primeiro curso online de apicultura do Brasil, em 2017.',
    cargos: [
      'Presidente da ASA, da FEAMS e da ALESPANA',
      'Coordenador da Câmara Setorial da Apicultura do MS',
      'Diretor-presidente do COFENAL',
      'Instrutor do SENAR e consultor do SEBRAE',
    ],
    palestras: 'Palestrante em congressos de apicultura no Brasil e no Paraguai.',
  },
} as const;

export type Bonus = {
  id: string;
  titulo: string;
  descricao: string;
  valor: number; // valor percebido em R$
  inicio: string; // ISO -03:00
  fim: string;
  destaque?: boolean;
};

/**
 * Bônus por janela. Bônus cuja janela já passou aparecem riscados na página.
 * Bônus futuros não aparecem (segredo até a vez deles).
 */
export const BONUS: Bonus[] = [
  {
    id: 'primeiro-comprador',
    titulo: 'Mentoria individual de 1h com o Gustavo',
    descricao: 'Para o 1º comprador da Black. Uma hora só sua para montar o plano do seu apiário.',
    valor: 497,
    inicio: '2026-11-01T00:00:00-03:00',
    fim: '2026-11-01T23:59:59-03:00',
    destaque: true,
  },
  {
    id: '30-primeiros',
    titulo: 'Encontro ao vivo em grupo: "Plano de 90 dias"',
    descricao: 'Para os 30 primeiros. Encontro fechado com o Gustavo para montar o plano de multiplicação de cada um.',
    valor: 197,
    inicio: '2026-11-01T00:00:00-03:00',
    fim: '2026-11-01T23:59:59-03:00',
  },
  {
    id: '24h',
    titulo: 'Planilha "Do 10 ao 100": calendário de multiplicação',
    descricao: 'Planilha pronta com o cronograma de divisões, alimentação e revisões para chegar a 100 colmeias.',
    valor: 97,
    inicio: '2026-11-01T00:00:00-03:00',
    fim: '2026-11-02T23:59:59-03:00',
  },
  {
    id: 'abertura',
    titulo: 'Kit Rainhas: Miller + Doolittle + Palmer com acompanhamento',
    descricao: 'Grupo de acompanhamento de 30 dias para a sua primeira produção de rainhas, com o Gustavo tirando dúvidas.',
    valor: 197,
    inicio: '2026-11-01T00:00:00-03:00',
    fim: '2026-11-06T23:59:59-03:00',
    destaque: true,
  },
  {
    id: 'semana-2',
    titulo: 'Aula extra: Leitura de Enxame aplicada à multiplicação',
    descricao: 'Como escolher quais colmeias dividir, e quando, lendo alvado, cria e alimento.',
    valor: 97,
    inicio: '2026-11-07T00:00:00-03:00',
    fim: '2026-11-15T23:59:59-03:00',
  },
  {
    id: 'semana-3',
    titulo: 'Aula extra: Alimentação para multiplicação acelerada',
    descricao: 'Receitas e cronograma de xarope e pasta proteica para núcleos crescerem rápido.',
    valor: 97,
    inicio: '2026-11-16T00:00:00-03:00',
    fim: '2026-11-22T23:59:59-03:00',
  },
  {
    id: 'semana-4',
    titulo: 'Aula extra: Sanidade em apiário em expansão',
    descricao: 'Varroa, pequeno besouro e intoxicação: o que vigiar quando o número de colmeias cresce.',
    valor: 97,
    inicio: '2026-11-23T00:00:00-03:00',
    fim: '2026-11-26T23:59:59-03:00',
  },
  {
    id: 'black',
    titulo: 'Condição especial do dia da Black',
    descricao: 'Só em 27/11: [CONFIRMAR] (ex.: +6 meses de acesso, ou desconto adicional).',
    valor: 497,
    inicio: '2026-11-27T00:00:00-03:00',
    fim: '2026-11-27T23:59:59-03:00',
    destaque: true,
  },
];

/**
 * O que a pessoa leva (entregáveis fixos) com valor percebido.
 * Baseado no mapa de conteúdos do clube.
 */
export const ENTREGAVEIS = [
  { titulo: 'Produção de Núcleos', detalhe: '31 aulas, 6 métodos de multiplicação gravados no apiário', valor: 97 },
  { titulo: 'Método Palmer Adaptado', detalhe: 'Dominar o Palmer em menos de 1 semana', valor: 147 },
  { titulo: 'Produção de Rainhas: Miller e Doolittle', detalhe: '38 conteúdos, do iniciante ao profissional', valor: 97 },
  { titulo: 'Leitura de Enxame', detalhe: 'Alvado, cria, alimento, clima e floradas', valor: 147 },
  { titulo: 'APISMONEY', detalhe: 'Planejamento, custos e faturamento com planilha', valor: 197 },
  { titulo: 'Produção de Própolis, Geleia Real e Favos em Acrílico', detalhe: 'Novas fontes de renda no mesmo apiário', valor: 247 },
  { titulo: 'Poliniza Brasil e Alternativas de Renda', detalhe: 'Parcerias com agricultores e diversificação', valor: 97 },
  { titulo: '115 lives exclusivas (mais de 100h)', detalhe: 'Live nova toda semana, com acervo desde 2023', valor: 397 },
  { titulo: 'Aulas especiais, palestras e cartilhas', detalhe: 'GTA, alimentação, Demaree, verniz, 12 materiais em PDF', valor: 97 },
  { titulo: 'Carteirinha de membro + descontos com parceiros', detalhe: 'Benefícios do clube e grupo de membros', valor: 97 },
];

export const DEPOIMENTOS = [
  // [CONFIRMAR] depoimentos reais com nome, cidade e número
  { nome: 'Nome do aluno', cidade: 'Cidade/UF', texto: '"Saí de 12 para 48 colmeias em uma temporada usando o método de núcleos." [CONFIRMAR]', resultado: '12 → 48 colmeias' },
  { nome: 'Nome do aluno', cidade: 'Cidade/UF', texto: '"Produzi minhas primeiras 40 rainhas com o Doolittle do curso." [CONFIRMAR]', resultado: '40 rainhas' },
  { nome: 'Nome do aluno', cidade: 'Cidade/UF', texto: '"A planilha do APISMONEY me mostrou onde eu estava perdendo dinheiro." [CONFIRMAR]', resultado: 'R$ por colmeia' },
];

export const FAQ = [
  { p: 'Quanto tempo terei de acesso aos cursos?', r: 'O acesso é de 1 ano. Todos os cursos, bônus e futuras atualizações.' },
  { p: 'Vou receber atualizações futuras?', r: 'Sim, você recebe todas as atualizações e as lives novas dentro do período do seu acesso.' },
  { p: 'Como vou receber o acesso?', r: 'Você recebe um e-mail com o seu acesso e o link da plataforma logo após a confirmação do pagamento.' },
  { p: 'Como funciona o suporte?', r: 'Temos uma equipe para atender você pelo WhatsApp, tirar dúvidas e ajudar a acessar a plataforma.' },
  { p: 'Serve para quem está começando?', r: 'Sim. O APISMONEY e a Apicultura Básica cobrem o início, e os métodos de multiplicação são ensinados do zero, com aulas práticas gravadas no apiário.' },
  { p: 'Preciso ter quantas colmeias para começar?', r: 'O método funciona a partir de poucas colmeias. O que muda é o tempo até chegar a 100.' },
  { p: 'As aulas são ao vivo ou gravadas?', r: 'Os cursos são gravados e ficam disponíveis na hora. As lives são semanais, ao vivo, e ficam gravadas no acervo.' },
  { p: 'Tem garantia?', r: `Sim, ${CAMPANHA.garantiaDias} dias. Se não for para você, devolvemos o valor integral.` },
  { p: 'Posso parcelar?', r: `Em até ${CAMPANHA.preco.parcelas}x no cartão. No boleto e no Pix é só à vista.` },
];

/** Links curtos: /r/<slug>. Também são semeados no banco na primeira execução. */
export const LINKS = [
  { slug: 'bio', destino: '/black', utm_source: 'instagram', utm_medium: 'bio', utm_campaign: 'black26', descricao: 'Link da bio do Instagram' },
  { slug: 'stories', destino: '/black', utm_source: 'instagram', utm_medium: 'stories', utm_campaign: 'black26', descricao: 'Stories' },
  { slug: 'yt', destino: '/black', utm_source: 'youtube', utm_medium: 'descricao', utm_campaign: 'black26', descricao: 'Descrição dos vídeos' },
  { slug: 'live-01', destino: '/black', utm_source: 'youtube', utm_medium: 'live', utm_campaign: 'black26', utm_content: 'live-01', descricao: 'Live semanal 1' },
  { slug: 'reprise-01', destino: '/black', utm_source: 'youtube', utm_medium: 'reprise', utm_campaign: 'black26', utm_content: 'reprise-01', descricao: 'Reprise 1' },
  { slug: 'zap', destino: '/black', utm_source: 'whatsapp', utm_medium: 'grupo', utm_campaign: 'black26', descricao: 'Mensagem nos grupos' },
  { slug: 'email', destino: '/black', utm_source: 'email', utm_medium: 'email', utm_campaign: 'black26', descricao: 'E-mail' },
  { slug: 'black', destino: '/black', utm_source: 'whatsapp', utm_medium: 'grupo', utm_campaign: 'black26', utm_content: 'abertura', descricao: 'Página de vendas (grupos)' },
];
