/**
 * Temas da seção /conteudos (filtro da lista e campo "Tema" no /admin/conteudos).
 * O `slug` fica gravado no banco: para renomear um tema, troque só o `nome`.
 */
export const TEMAS_CONTEUDO = [
  { slug: 'comecando', nome: 'Começando na apicultura' },
  { slug: 'multiplicacao', nome: 'Multiplicação' },
  { slug: 'rainhas', nome: 'Rainhas' },
  { slug: 'manejo', nome: 'Manejo' },
  { slug: 'produtos', nome: 'Produtos da colmeia' },
  { slug: 'gestao', nome: 'Gestão e vendas' },
] as const;

export const nomeTema = (slug?: string | null) => TEMAS_CONTEUDO.find((t) => t.slug === slug)?.nome ?? '';
