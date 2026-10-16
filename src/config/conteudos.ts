/**
 * Temas da seção /conteudos (filtro da lista e campo "Tema" no /admin/conteudos).
 * O `slug` fica gravado no banco: para renomear um tema, troque só o `nome`.
 */
export const TEMAS_CONTEUDO = [
  { slug: 'comecando', nome: 'Começando na apicultura', icone: 'abelha' },
  { slug: 'multiplicacao', nome: 'Multiplicação', icone: 'split' },
  { slug: 'rainhas', nome: 'Rainhas', icone: 'crown' },
  { slug: 'manejo', nome: 'Manejo', icone: 'shield' },
  { slug: 'produtos', nome: 'Produtos da colmeia', icone: 'hex' },
  { slug: 'gestao', nome: 'Gestão e vendas', icone: 'coins' },
] as const;

export const nomeTema = (slug?: string | null) => TEMAS_CONTEUDO.find((t) => t.slug === slug)?.nome ?? '';
export const iconeTema = (slug?: string | null) => TEMAS_CONTEUDO.find((t) => t.slug === slug)?.icone ?? 'abelha';

/**
 * Nível do conteúdo (filtro do /conteudos, selo no card e no artigo, educationalLevel no JSON-LD).
 * O `slug` fica gravado no banco: para renomear, troque só o `nome`.
 */
export const NIVEIS_CONTEUDO = [
  { slug: 'iniciante', nome: 'Iniciante', dica: 'Para quem está começando' },
  { slug: 'intermediario', nome: 'Intermediário', dica: 'Para quem já tem colmeias' },
  { slug: 'avancado', nome: 'Avançado', dica: 'Para quem quer produzir em escala' },
] as const;

export const nomeNivel = (slug?: string | null) => NIVEIS_CONTEUDO.find((n) => n.slug === slug)?.nome ?? '';
