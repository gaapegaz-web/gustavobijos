import type { APIRoute } from 'astro';
import { db } from '~/lib/db';

export const prerender = false;

/** Link curto com UTM: /r/live-01 -> /?utm_source=...&utm_content=live-01 */
export const GET: APIRoute = ({ params, url }) => {
  const slug = String(params.slug || '').toLowerCase();
  const link = db().prepare('SELECT * FROM links WHERE slug = ?').get(slug) as any;
  if (!link) return new Response(null, { status: 302, headers: { location: '/black' } });
  db().prepare('UPDATE links SET cliques = cliques + 1 WHERE slug = ?').run(slug);

  const dest = new URL(link.destino, url.origin);
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    if (link[k]) dest.searchParams.set(k, link[k]);
  }
  // repassa parâmetros extras (ex: fbclid)
  url.searchParams.forEach((v, k) => { if (!dest.searchParams.has(k)) dest.searchParams.set(k, v); });
  return new Response(null, { status: 302, headers: { location: dest.pathname + dest.search, 'cache-control': 'no-store' } });
};
