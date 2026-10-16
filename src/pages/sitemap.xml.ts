import type { APIRoute } from 'astro';
import { PAGINAS } from '~/config/paginas';
import { SITE } from '~/config/site';
import { ENV } from '~/lib/env';
import { publicados } from '~/lib/conteudos';

export const prerender = false;

/**
 * Páginas de config/paginas.ts. A home só entra quando a raiz parar de redirecionar para uma campanha.
 * Sem <lastmod> nas páginas fixas: a data do dia em todas as URLs faz o Google ignorar o campo.
 * Conteúdos publicados entram com <lastmod> = data real da última edição (vem do banco).
 */
export const GET: APIRoute = () => {
  const urls = PAGINAS.filter((p) => p.path !== '/' || !ENV.REDIRECT_RAIZ)
    .map((p) => `  <url><loc>${new URL(p.path, SITE.dominio)}</loc><priority>${p.prioridade}</priority></url>`);
  const conteudos = publicados();
  if (conteudos.length) {
    urls.push(`  <url><loc>${SITE.dominio}/conteudos</loc><lastmod>${conteudos[0].publicado_em?.slice(0, 10)}</lastmod><priority>0.8</priority></url>`);
    for (const c of conteudos) urls.push(`  <url><loc>${SITE.dominio}/conteudos/${c.slug}</loc><lastmod>${c.atualizado_em.slice(0, 10)}</lastmod><priority>0.7</priority></url>`);
  }
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
};
