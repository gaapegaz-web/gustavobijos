/** Dados estruturados de um conteúdo: Article (autor = Gustavo), VideoObject quando tem vídeo e a trilha (BreadcrumbList). */
import { nomeTema } from '~/config/conteudos';
import { SITE } from '~/config/site';
import { capaEnviada, capaYoutube, imagemSocial, youtubeId, type Conteudo } from '~/lib/conteudos';

export function ldConteudo(c: Conteudo) {
  const site = SITE.dominio + '/';
  const url = `${SITE.dominio}/conteudos/${c.slug}`;
  const video = youtubeId(c.video_url);
  const abs = (u: string) => new URL(u, SITE.dominio).toString();
  const social = imagemSocial(c);
  // Google pede imagens grandes no Article: a capa 16:9 e a 1200x630; sem capa, a do vídeo ou a padrão do site
  const imagem = c.capa ? [abs(capaEnviada(c.capa).src), abs(capaEnviada(c.capa).og)] : abs(social?.url ?? '/img/og-gustavo.jpg');
  const publicado = c.publicado_em ?? c.atualizado_em;
  return [
    {
      '@type': 'Article', '@id': `${url}#artigo`, headline: c.titulo, description: c.resumo || undefined, url,
      mainEntityOfPage: { '@id': `${url}#pagina` }, image: imagem, inLanguage: 'pt-BR',
      datePublished: publicado, dateModified: c.atualizado_em,
      author: { '@id': `${site}#gustavo` }, publisher: { '@id': `${site}#gustavo` },
      ...(c.tema ? { articleSection: nomeTema(c.tema) } : {}),
      ...(video ? { video: { '@id': `${url}#video` } } : {}),
    },
    ...(video ? [{
      '@type': 'VideoObject', '@id': `${url}#video`, name: c.titulo, description: c.resumo || c.titulo,
      thumbnailUrl: c.capa ? [abs(capaEnviada(c.capa).src), capaYoutube(video)] : capaYoutube(video), uploadDate: publicado,
      embedUrl: `https://www.youtube.com/embed/${video}`, contentUrl: `https://www.youtube.com/watch?v=${video}`,
      author: { '@id': `${site}#gustavo` },
    }] : []),
    {
      '@type': 'BreadcrumbList', '@id': `${url}#trilha`, itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: site },
        { '@type': 'ListItem', position: 2, name: 'Conteúdos', item: `${SITE.dominio}/conteudos` },
        { '@type': 'ListItem', position: 3, name: c.titulo, item: url },
      ],
    },
  ];
}
