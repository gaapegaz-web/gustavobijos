import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ENV } from '~/lib/env';

export const prerender = false;

/** Serve as imagens enviadas pelo /admin (ENV.UPLOADS_DIR). Nome nunca se repete, então cache de 1 ano. */
const TIPOS: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

export const GET: APIRoute = async ({ params }) => {
  const caminho = params.arquivo ?? '';
  const ext = caminho.split('.').pop()?.toLowerCase() ?? '';
  if (!/^[a-z0-9_-]+(\/[a-z0-9_.-]+)*$/i.test(caminho) || caminho.includes('..') || !TIPOS[ext]) return new Response('Não encontrado', { status: 404 });
  try {
    const dados = await readFile(join(ENV.UPLOADS_DIR, caminho));
    return new Response(dados, { headers: { 'content-type': TIPOS[ext], 'cache-control': 'public, max-age=31536000, immutable' } });
  } catch {
    return new Response('Não encontrado', { status: 404 });
  }
};
