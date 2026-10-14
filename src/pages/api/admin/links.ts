import type { APIRoute } from 'astro';
import { db } from '~/lib/db';
import { ENV } from '~/lib/env';

export const prerender = false;

/**
 * CRUD simples de links curtos (/r/<slug>), só para o /admin. A mesma basic auth do
 * middleware já protege /admin/*, mas essa rota fica fora de /admin/ (é /api/admin/),
 * então confere a senha de novo aqui.
 */
function autorizado(request: Request) {
  const auth = request.headers.get('authorization') || '';
  const [user, pass] = Buffer.from(auth.replace(/^Basic\s+/i, ''), 'base64').toString().split(':');
  return !!ENV.ADMIN_PASS && user === ENV.ADMIN_USER && pass === ENV.ADMIN_PASS;
}

const SLUG_OK = /^[a-z0-9][a-z0-9-]{1,39}$/;

export const POST: APIRoute = async ({ request }) => {
  if (!autorizado(request)) return new Response('Acesso restrito', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Tecnoapis Admin"' } });

  let body: Record<string, string> = {};
  try { body = await request.json(); } catch { return json({ ok: false, erro: 'Dados inválidos' }, 400); }

  const slug = (body.slug || '').trim().toLowerCase();
  const destinoBruto = (body.destino || '/black').trim();
  const utm_source = (body.utm_source || '').trim().slice(0, 100);
  const utm_medium = (body.utm_medium || '').trim().slice(0, 100);
  const utm_campaign = (body.utm_campaign || '').trim().slice(0, 100);
  const utm_content = (body.utm_content || '').trim().slice(0, 100);
  const utm_term = (body.utm_term || '').trim().slice(0, 100);
  const descricao = (body.descricao || '').trim().slice(0, 200);

  if (!SLUG_OK.test(slug)) return json({ ok: false, erro: 'O link precisa ter de 2 a 40 letras minúsculas, números ou hífen, começando com letra/número.' }, 422);
  if (!utm_source) return json({ ok: false, erro: 'Informe a origem (utm_source).' }, 422);

  // Destino: caminho interno (/black, /) ou URL completa do próprio domínio
  let destino = destinoBruto;
  if (!destino.startsWith('/')) {
    try {
      const u = new URL(destino);
      destino = u.pathname + u.search;
    } catch { return json({ ok: false, erro: 'Destino inválido: use um caminho como /black ou uma URL completa.' }, 422); }
  }

  const existe = db().prepare('SELECT 1 FROM links WHERE slug = ?').get(slug);
  if (existe) return json({ ok: false, erro: `O link /r/${slug} já existe. Escolha outro nome.` }, 409);

  db().prepare(`INSERT INTO links (slug, destino, utm_source, utm_medium, utm_campaign, utm_content, utm_term, descricao)
    VALUES (@slug, @destino, @utm_source, @utm_medium, @utm_campaign, @utm_content, @utm_term, @descricao)`).run({
    slug, destino, utm_source, utm_medium: utm_medium || null, utm_campaign: utm_campaign || null, utm_content: utm_content || null, utm_term: utm_term || null, descricao: descricao || null,
  });

  return json({ ok: true, slug });
};

export const DELETE: APIRoute = async ({ request, url }) => {
  if (!autorizado(request)) return new Response('Acesso restrito', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Tecnoapis Admin"' } });
  const slug = (url.searchParams.get('slug') || '').trim().toLowerCase();
  if (!slug) return json({ ok: false, erro: 'Falta o slug' }, 400);
  db().prepare('DELETE FROM links WHERE slug = ?').run(slug);
  return json({ ok: true });
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
