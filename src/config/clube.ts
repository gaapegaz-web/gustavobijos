/** Conteúdo do Clube Tecnoapis (fonte: mapa de conteúdos de 13/10/2026). Usado na página, no /llms.txt e nos dados estruturados. */

export const NUMEROS = [
  { n: '25', l: 'cursos' },
  { n: '130h', l: 'de conteúdo' },
  { n: '115', l: 'lives gravadas' },
];
export type Tipo = 'Curso' | 'Aula' | 'Live' | 'PDF' | 'Palestra' | 'Bônus' | 'Benefício' | 'Grupo';
export type Item = [Tipo, string, string];
export const AREAS: { icone: 'split' | 'crown' | 'hex' | 'bulb' | 'chart' | 'calendar' | 'whatsapp' | 'shield'; titulo: string; texto: string; itens: Item[] }[] = [
  { icone: 'split', titulo: 'Multiplicação', texto: 'Núcleos, Palmer e Demaree.', itens: [
    ['Curso', 'Produção de Núcleos', '31 aulas, 6 métodos'],
    ['Curso', 'Método Palmer Adaptado', '6 aulas'],
    ['Aula', 'Método Demaree', 'prática + PDF'],
    ['Aula', 'Segurança e transporte', 'de núcleos'],
  ] },
  { icone: 'crown', titulo: 'Rainhas', texto: 'Miller, Doolittle e Geleia Real.', itens: [
    ['Curso', 'Método Miller', '4 aulas, ideal para começar'],
    ['Curso', 'Método Doolittle', '34 conteúdos'],
    ['PDF', 'Apostila de Produção de Rainhas', 'passo a passo'],
    ['Curso', 'Produção de Geleia Real', 'com apostila'],
  ] },
  { icone: 'hex', titulo: 'Produtos', texto: 'Própolis, favos e polinização.', itens: [
    ['Curso', 'Produção de Própolis', '26 conteúdos'],
    ['Curso', 'Favos em embalagem de acrílico', '8 aulas'],
    ['Curso', 'Poliniza Brasil', '12 aulas'],
    ['Curso', 'Alternativas de Renda', '4 aulas'],
  ] },
  { icone: 'bulb', titulo: 'Manejo', texto: 'Leitura de enxame e alimentação.', itens: [
    ['Curso', 'Leitura de Enxame', 'alvado, cria, clima e floradas'],
    ['Aula', 'Alimentação', 'bife proteico e alimentação sólida'],
    ['Bônus', 'Perda Zero', 'diário de recuperação de apiário'],
    ['Aula', 'Verniz ecológico', 'contra o pequeno besouro'],
  ] },
  { icone: 'chart', titulo: 'Gestão', texto: 'APISMONEY e planilha de custos.', itens: [
    ['Curso', 'APISMONEY', '12 aulas, mais de 5 horas'],
    ['PDF', 'Planilha de custos e faturamento', 'pronta para usar'],
    ['Aula', 'Cadastro de apicultor e GTA', 'com manual'],
  ] },
  { icone: 'calendar', titulo: 'Lives semanais', texto: '115 gravadas, uma nova toda segunda.', itens: [
    ['Live', 'Live toda segunda-feira', 'ao vivo, com tira-dúvidas'],
    ['Live', '115 lives gravadas', 'mais de 100 horas desde 2023'],
    ['Live', 'Temas variados', 'rainhas, sanidade, clima e mercado'],
  ] },
  { icone: 'whatsapp', titulo: 'Comunidade', texto: 'Grupo, carteirinha e descontos.', itens: [
    ['Grupo', 'Grupo de membros', 'no WhatsApp'],
    ['Benefício', 'Carteirinha digital', 'de membro do clube'],
    ['Benefício', 'Descontos', 'nas lojas parceiras'],
  ] },
  { icone: 'shield', titulo: 'Especialistas', texto: 'Palestras e 12 cartilhas.', itens: [
    ['Palestra', 'Nutrição das abelhas', 'com Dr.\u00A0Heber Pereira'],
    ['Palestra', 'Nutrição de abelhas Apis', 'com Dr.\u00A0James Salomé'],
    ['Aula', 'Uso do poncho no frio', 'com Décio Sehnen'],
    ['PDF', '12 cartilhas e livros', 'como A Biologia da Abelha'],
  ] },
];

/**
 * Copy da página /tecnoapis (página de vendas fixa do Clube).
 * Fonte: tecnoapis.com.br (versão de dez/2024, Web Archive), com o preço atualizado para R$ 697.
 */
export const OFERTA_CLUBE = {
  produto: 'Assinatura Anual Tecnoapis',
  preco: 697,
  parcelas: 12, // "em até 12x no cartão"; o valor da parcela é o que a Hubla calcular
  garantiaDias: 7,
};

export const NIVEIS_CLUBE = [
  { nivel: 'Iniciante', titulo: 'Aumentar a produção', texto: 'Você aprenderá os manejos avançados, técnicas de produção de núcleos, rainhas e mel. Além de acompanhamento e tira-dúvidas.' },
  { nivel: 'Intermediário', titulo: 'Resultado financeiro', texto: 'Extraia o máximo potencial de suas colmeias. Explore estratégias para minimizar custos e aumentar os ganhos.' },
  { nivel: 'Avançado', titulo: 'Produção em escala', texto: 'Descubra como aumentar o número de colmeias da maneira correta. Saiba todos os “pulos do gato” para produzir em larga escala.' },
];

export const RESULTADOS_CLUBE = [
  { titulo: 'Aumento da produção de mel e colmeias', texto: 'Com técnicas comprovadas, você aumentará a produtividade das suas colmeias de forma sustentável e terá os segredos para multiplicar e criar novos núcleos com facilidade.' },
  { titulo: 'Manejo adequado e tempo extra', texto: 'Manejo correto para reduzir o tempo nas tarefas diárias, sem comprometer a qualidade. Técnicas especializadas para evitar o estresse das abelhas e garantir uma produção contínua.' },
  { titulo: 'Segurança e tranquilidade no processo', texto: 'Garanta que seus investimentos sejam seguros, com orientações sobre legalidade e certificações necessárias para atuar de forma regular e confiável.' },
  { titulo: 'Aumento do conhecimento', texto: 'Tenha o conhecimento necessário para tomar decisões inteligentes, desde a escolha das rainhas até o manejo de núcleos e enxames.' },
  { titulo: 'Resultados financeiros', texto: 'Entenda como transformar sua paixão pela apicultura em um negócio rentável, com aulas de como aumentar suas vendas de mel e produtos derivados.' },
  { titulo: 'Redução de custos', texto: 'Maximize seus lucros ao utilizar estratégias que aumentam a eficiência no manejo e na produção, sem a necessidade de grandes investimentos.' },
];

export const INCLUSO_CLUBE = ['Plataforma de fácil acesso', 'Contato direto com o professor', 'Equipe tira-dúvidas', 'Lives só para membros'];

export const BIO_CLUBE = {
  abertura: 'Idealizador do Clube Tecnoapis e da Expo Tecnoapis.',
  cargos: 'Já ocupou diversos cargos importantes como: Presidente da Associação Sul-mato-grossense de Apicultores (ASA), Presidente da Federação de Apicultura e Meliponicultura do MS (FEAMS), Presidente da Associação Leste Pantaneira de Apicultores (ALESPANA), Coordenador da Câmara Setorial Consultiva da Apicultura do MS (CSEAP) e Diretor-presidente do Conselho de Entidades Apícolas do Pantanal (COFENAL).',
  senar: 'Já foi instrutor do SENAR e do SEBRAE.',
  palestras: 'Palestrou 2 vezes fora do país e em diversos eventos no Brasil, como PEC Nordeste 2022 (Fortaleza, CE); IV Congreso Nacional de Apicultura y II de Meliponicultura del Paraguay (Filadelfia, PY); Congresso Brasileiro de Apicultura 2002 (Campo Grande, MS); 3º Congresso Sul Brasileiro de Apicultura e Meliponicultura e 36º Encontro Catarinense de Apicultores e Meliponicultores (Blumenau, SC, 2023); Congresso Brasileiro de Apicultura e Meliponicultura (2023), entre outros.',
  online: 'Em 2017, Gustavo revolucionou o ensino da apicultura ao criar o primeiro curso online do Brasil, levando conhecimento e técnicas apícolas a alunos de todas as regiões do país. Hoje, ele dedica seu tempo a ensinar seus inúmeros alunos espalhados por todo o território nacional, mostrando-lhes como viver da apicultura e alcançar o sucesso no campo.',
};

export const FAQ_CLUBE = [
  { p: 'Quanto tempo terei de acesso aos cursos?', r: 'O acesso é de 1 ano. Todos os cursos, bônus e futuras atualizações.' },
  { p: 'Vou receber atualizações futuras?', r: 'Sim, você vai receber todas as atualizações dentro do período do seu acesso.' },
  { p: 'Posso parcelar no boleto?', r: 'Não há parcelamento no boleto, apenas no cartão. No boleto o pagamento é à vista.' },
  { p: 'Como vou receber o acesso?', r: 'Você vai receber um e-mail com todo o seu acesso e o link da plataforma.' },
  { p: 'Como funciona o suporte?', r: 'Temos uma equipe para atender você pelo WhatsApp e tirar todas as dúvidas, além de ajudar a acessar a plataforma.' },
  { p: 'Tem garantia?', r: 'Sim, 7 dias de garantia incondicional. Se não estiver satisfeito, é só entrar em contato dentro desse prazo e devolvemos o valor integral.' },
];

/** Capas do carrossel (public/img/cursos/<arquivo>.webp, 400x560). A ordem aqui é a ordem na tela. */
export const CAPAS: [arquivo: string, nome: string][] = [
  ['apis-money', 'APISMONEY'],
  ['producao-de-nucleos', 'Produção de Núcleos'],
  ['metodo-doolittle', 'Método Doolittle'],
  ['producao-de-propolis', 'Produção de Própolis'],
  ['metodo-miller', 'Método Miller'],
  ['metodo-palmer', 'Método Palmer Adaptado'],
  ['poliniza-brasil', 'Poliniza Brasil'],
  ['favos-em-acrilico', 'Favos em embalagem de acrílico'],
  ['apicultura-basica', 'Apicultura Básica'],
  ['metodo-demaree', 'Método Demaree'],
  ['alternativas-de-renda', 'Alternativas de Renda'],
  ['alimentacao-proteica', 'Alimentação proteica'],
  ['uso-do-poncho', 'Uso do poncho'],
  ['verniz-ecologico', 'Verniz ecológico'],
  ['medindo-a-umidade', 'Medindo a umidade'],
  ['cadastro-e-gta', 'Cadastro de apicultor e GTA'],
];
