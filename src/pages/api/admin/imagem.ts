import type { APIRoute } from 'astro';
import { salvarCapa, salvarImagemTexto } from '~/lib/upload';

export const prerender = false;

/**
 * Envio de imagem do editor de conteúdos (o login do /admin, conferido no middleware, protege /api/admin).
 * multipart: arquivo, tipo ('capa' | 'texto'), slug (só para o nome do arquivo).
 */
export const POST: APIRoute = async ({ request }) => {
  const origem = request.headers.get('origin');
  if (origem && new URL(origem).host !== request.headers.get('host')) return json({ ok: false, erro: 'Origem não permitida' }, 403);
  let f: FormData;
  try { f = await request.formData(); } catch { return json({ ok: false, erro: 'Envio inválido' }, 400); }
  const arquivo = f.get('arquivo');
  if (!(arquivo instanceof File) || !arquivo.size) return json({ ok: false, erro: 'Escolha uma imagem.' }, 422);
  const buf = Buffer.from(await arquivo.arrayBuffer());
  const slug = String(f.get('slug') || '');
  try {
    if (f.get('tipo') === 'capa') return json({ ok: true, ...(await salvarCapa(buf, slug)) });
    return json({ ok: true, ...(await salvarImagemTexto(buf, slug)) });
  } catch (e) {
    return json({ ok: false, erro: (e as Error).message || 'Erro ao processar a imagem' }, 422);
  }
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
