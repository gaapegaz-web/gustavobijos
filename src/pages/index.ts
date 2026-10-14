import type { APIRoute } from 'astro';

export const prerender = false;

/** A raiz do domínio só encaminha para /black, mantendo UTMs e fbclid. */
export const GET: APIRoute = ({ url }) =>
  new Response(null, { status: 302, headers: { location: `/black${url.search}`, 'cache-control': 'no-store' } });
