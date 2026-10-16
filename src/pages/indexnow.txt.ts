import type { APIRoute } from 'astro';
import { ENV } from '~/lib/env';

export const prerender = false;

/** Arquivo de verificação do IndexNow (ver src/lib/indexnow.ts): só a chave, em texto puro. */
export const GET: APIRoute = () => {
  const key = ENV.INDEXNOW_KEY;
  if (!key) return new Response('Não encontrado', { status: 404 });
  return new Response(key, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400', 'x-robots-tag': 'noindex' } });
};
