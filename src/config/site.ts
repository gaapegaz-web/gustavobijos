/**
 * Dados FIXOS do site: quem é o Gustavo, as marcas dele, a trajetória e as perguntas frequentes.
 * Usado pela home, pelo SEO global (JSON-LD), pelo /llms.txt e pelas páginas de campanha.
 * Nada aqui pode depender de campanha (black.ts e futuras): campanha importa daqui, nunca o contrário.
 *
 * `confirmado: false` = informação a confirmar: só aparece na prévia (/?preview=1), nunca no público, JSON-LD ou /llms.txt.
 * Os itens achados em sites de terceiros (ainda não confirmados pelo Gustavo) estão no fim do arquivo, comentados.
 */

export const SITE = {
  dominio: 'https://gustavobijos.com.br',
  professor: 'Gustavo Nadeu Bijos',
  apelido: 'Gustavo Bijos',
  clube: 'Clube Tecnoapis',
  /** Página do clube (vendas da Assinatura Anual). */
  clubeUrl: '/tecnoapis',
} as const;

/** Temas que o Gustavo e o Clube dominam (knowsAbout no JSON-LD). */
export const TEMAS = ['Apicultura', 'Multiplicação de colmeias', 'Produção de núcleos', 'Produção de rainhas', 'Método Doolittle', 'Método Miller', 'Geleia real', 'Própolis', 'Polinização', 'Gestão de apiário'];

export type Fato = { texto: string; confirmado: boolean };

export const BIO = {
  anos: 27,
  resumo: 'Criador do Clube Tecnoapis e do primeiro curso online de apicultura do Brasil, em 2017.',
  /** O que ele faz hoje (os cargos abaixo são todos passados). */
  hoje: 'Professor e consultor em apicultura',
  cargos: [
    'Ex-presidente da ASA, da FEAMS e da ALESPANA',
    'Ex-coordenador da Câmara Setorial da Apicultura do MS',
    'Ex-diretor-presidente do COFENAL',
    'Ex-instrutor do SENAR e do SEBRAE',
  ],
  palestras: 'Palestrante em congressos de apicultura no Brasil e no Paraguai.',
  formacao: 'Médico veterinário',
  /** Registro no conselho (ex.: 'CRMV-MS 1234'). Vazio = não aparece. Preenchido, vira credencial no JSON-LD e entra no /llms.txt. */
  crmv: '',
  cidade: { nome: 'Campo Grande', uf: 'MS', estado: 'Mato Grosso do Sul' },
  /** Parágrafos da seção "Quem é" na ordem em que aparecem. */
  sobre: [
    { texto: 'Gustavo Nadeu Bijos, o Gustavo Bijos, é médico veterinário e apicultor há 27 anos. Mora em Campo Grande, Mato Grosso do Sul, e atende todo o Brasil.', confirmado: true },
    { texto: 'Em 2017 criou o primeiro curso online de apicultura do Brasil. Desse trabalho nasceu o Clube Tecnoapis, que hoje reúne 25 cursos, mais de 130 horas de aula e uma live nova toda segunda-feira.', confirmado: true },
    { texto: 'Já foi instrutor do SENAR e do SEBRAE e hoje leva a apicultura técnica para congressos no Brasil e no Paraguai.', confirmado: true },
    { texto: 'Também criou o APIS+, certificação de boas práticas apícolas, e a NB Consultoria Veterinária, que presta consultoria em qualquer lugar do país.', confirmado: true },
  ] satisfies Fato[],
};

/**
 * Perfis oficiais (aparecem no site e viram sameAs no JSON-LD). `de`: de quem é o perfil.
 * Perfil do Gustavo liga à Person; perfil do clube liga à Organization. Facebook: não tem.
 */
export const PERFIS: { rede: string; url: string; usuario: string; de: 'gustavo' | 'clube' }[] = [
  { rede: 'Instagram', url: 'https://www.instagram.com/gustavobijos/', usuario: '@gustavobijos', de: 'gustavo' },
  { rede: 'YouTube', url: 'https://www.youtube.com/@TECNOAPIS', usuario: '@TECNOAPIS', de: 'clube' },
];
export const PERFIS_GUSTAVO = PERFIS.filter((p) => p.de === 'gustavo').map((p) => p.url);
export const PERFIS_CLUBE = PERFIS.filter((p) => p.de === 'clube').map((p) => p.url);

/** `empresa: true` = negócio do Gustavo: vira Organization no JSON-LD, com ele como fundador. */
export type Marca = { id: string; nome: string; tipo: string; descricao: string; url?: string; externo?: boolean; empresa?: boolean; confirmado: boolean };
export const MARCAS: Marca[] = [
  { id: 'clube', nome: 'Clube Tecnoapis', tipo: 'Escola online', descricao: '25 cursos de apicultura, 115 lives gravadas e uma live nova toda segunda. Multiplicação, rainhas, manejo e gestão do apiário.', url: SITE.clubeUrl.startsWith('/#') ? undefined : SITE.clubeUrl, confirmado: true },
  { id: 'apis-mais', nome: 'APIS+ Certificação', tipo: 'Certificação', descricao: 'Certificação voluntária de boas práticas apícolas e proteção de polinizadores.', url: 'https://apismais.com.br', externo: true, empresa: true, confirmado: true },
  { id: 'nb', nome: 'NB Consultoria Veterinária', tipo: 'Consultoria', descricao: 'A empresa de consultoria do Gustavo. Atende em qualquer lugar do Brasil.', empresa: true, confirmado: true },
  { id: 'palestras', nome: 'Palestras e cursos', tipo: 'Presencial', descricao: 'Já foi instrutor do SENAR e do SEBRAE. Palestrante em congressos de apicultura no Brasil e no Paraguai.', confirmado: true },
  { id: 'expo', nome: 'Expo Tecnoapis', tipo: 'Evento', descricao: 'Evento de inovação, tecnologia e novos negócios na apicultura. Próximas edições a definir.', confirmado: true },
];

/** Não aparece mais na home (seção tirada em 16/10/2026 a pedido do Gabriel); segue no /llms.txt. */
export type Marco = { ano: string; titulo: string; texto: string; confirmado: boolean };
export const TRAJETORIA: Marco[] = [
  { ano: '2017', titulo: 'Primeiro curso online do Brasil', texto: 'Cria o primeiro curso online de apicultura do país, que dá origem ao Clube Tecnoapis.', confirmado: true },
  { ano: '2023', titulo: 'Lives semanais', texto: 'Começa a live toda segunda-feira. Hoje são 115 gravadas, mais de 100 horas.', confirmado: true },
];

export type Pergunta = { p: string; r: string; confirmado: boolean };
export const FAQ_PROFESSOR: Pergunta[] = [
  { p: 'Quem é Gustavo Bijos?', r: 'Gustavo Nadeu Bijos é médico veterinário e apicultor há 27 anos, de Campo Grande (MS), criador do Clube Tecnoapis e do primeiro curso online de apicultura do Brasil, lançado em 2017. Já foi instrutor do SENAR e do SEBRAE e é palestrante em congressos de apicultura no Brasil e no Paraguai.', confirmado: true },
  { p: 'Onde fazer um curso de apicultura online?', r: 'No Clube Tecnoapis, criado por Gustavo Bijos, autor do primeiro curso online de apicultura do Brasil, em 2017. São 25 cursos, mais de 130 horas de aula e uma live nova toda segunda-feira.', confirmado: true },
  { p: 'Como começar na apicultura?', r: 'Comece pelo básico: entender a biologia da abelha e a leitura do enxame, usar equipamento de proteção, fazer o cadastro de apicultor (e a GTA para transportar colmeias) e começar com poucas colmeias. No Clube Tecnoapis o Gustavo ensina esse caminho do zero, com aulas práticas gravadas no apiário.', confirmado: true },
  { p: 'O Clube Tecnoapis serve para quem está começando?', r: 'Sim. Os métodos são ensinados do zero, com aulas práticas gravadas no apiário, e o APISMONEY ajuda a planejar custos e faturamento desde o início. Quem já tem apiário usa os cursos de multiplicação e de rainhas para crescer.', confirmado: true },
  { p: 'O que é o Clube Tecnoapis?', r: 'É a escola online de apicultura do Gustavo: 25 cursos, mais de 130 horas de aula, 115 lives gravadas e uma live nova toda segunda-feira, além de grupo de membros e materiais em PDF.', confirmado: true },
  { p: 'O que o Gustavo ensina?', r: 'Multiplicação de colmeias e produção de núcleos, produção de rainhas (Miller e Doolittle), leitura de enxame, alimentação, sanidade, produção de própolis e geleia real, e gestão do apiário com o APISMONEY.', confirmado: true },
  { p: 'Onde ele atua?', r: 'Mora em Campo Grande, Mato Grosso do Sul, e atende todo o Brasil: faz consultoria e palestras onde for preciso e dá aulas online pelo Clube Tecnoapis.', confirmado: true },
  { p: 'O que é o APIS+?', r: 'Uma certificação voluntária de boas práticas apícolas e proteção de polinizadores, criada pelo Gustavo.', confirmado: true },
  { p: 'Quais cargos ele já ocupou no setor?', r: 'Foi presidente da ASA, da FEAMS e da ALESPANA, coordenador da Câmara Setorial da Apicultura do MS e diretor-presidente do COFENAL. Hoje é professor e consultor em apicultura.', confirmado: true },
];

/** Filtra o que pode ir a público. Na prévia, mostra tudo. */
export const visiveis = <T extends { confirmado: boolean }>(itens: T[], preview = false) => itens.filter((x) => preview || x.confirmado);

/*
 * A CONFIRMAR / A COLOCAR DEPOIS (para usar, mova de volta para a lista certa):
 * FILAPI: confirmado pelo Gustavo, entra quando chegarem as fotos. Trajetória fica sem os anos de 2000 e 2001 (pedido dele).
 * Ao entrar, também acrescentar "Ouro em Inovação na FILAPI 2026" à descrição do APIS+ em MARCAS.
 * { ano: '2026', titulo: 'Ouro na FILAPI', texto: 'O selo APIS+ vence a categoria Inovação da FILAPI 2026, em Mar del Plata, Argentina.', confirmado: false },
 */
