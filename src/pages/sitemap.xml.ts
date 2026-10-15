import type { APIRoute } from 'astro';
import { PAGINAS } from '~/config/paginas';
import { SITE } from '~/config/site';
import { ENV } from '~/lib/env';

export const prerender = false;

/**
 * Páginas de config/paginas.ts. A home só entra quando a raiz parar de redirecionar para uma campanha.
 * Sem <lastmod>: a data do dia em todas as URLs faz o Google ignorar o campo; sem ele, o Google usa o próprio rastreio.
 */
export const GET: APIRoute = () => {
  const urls = PAGINAS.filter((p) => p.path !== '/' || !ENV.REDIRECT_RAIZ)
    .map((p) => `  <url><loc>${new URL(p.path, SITE.dominio)}</loc><priority>${p.prioridade}</priority></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
};
