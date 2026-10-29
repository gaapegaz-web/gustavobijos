import type { APIRoute } from 'astro';
import { insertEvento, db, leadDoCookie } from '~/lib/db';
import { enviarCapi, separarNome } from '~/lib/capi';
import { ipDoRequest, lerFb, lerUtmsDoCookie } from '~/lib/tracking';

export const prerender = false;

// Padrão da Meta + personalizado AbriuFormulario. ViewContent saiu de propósito (não vai mais para a Meta).
const PERMITIDOS = new Set(['PageView', 'InitiateCheckout', 'AddToCart', 'Contact', 'Schedule', 'AbriuFormulario']);

/** Réplica server-side de eventos do navegador, com o mesmo event_id para deduplicação. */
export const POST: APIRoute = async ({ request, cookies, clientAddress, url }) => {
  let body: { name?: string; eventId?: string; params?: Record<string, unknown>; url?: string } = {};
  try { body = await request.json(); } catch { return new Response(null, { status: 400 }); }
  const name = String(body.name || '');
  const eventId = String(body.eventId || '').slice(0, 80);
  if (!PERMITIDOS.has(name) || !eventId) return new Response(null, { status: 204 });

  const utms = lerUtmsDoCookie(cookies);
  const { fbp, fbc } = lerFb(cookies);
  const lead = leadDoCookie(cookies);
  const leadId = lead?.id ?? null;
  const { firstName, lastName } = separarNome(lead?.nome);
  // Só página do próprio site: vira o event_source_url da Meta e, no checkout, o do Purchase da Hubla
  const pagUrl = (() => { try { const u = new URL(body.url || ''); return u.host === url.host ? u.href.slice(0, 500) : null; } catch { return null; } })();

  const capi = await enviarCapi({
    name, eventId, sourceUrl: pagUrl || request.headers.get('referer'),
    user: { email: lead?.email, phone: lead?.whatsapp, firstName, lastName, fbp, fbc, ip: ipDoRequest(request, clientAddress), userAgent: request.headers.get('user-agent'), externalId: leadId },
    custom: body.params,
  });

  // PageView não precisa poluir a tabela de eventos; os outros sim
  if (name !== 'PageView') {
    const pagina = (() => { try { return new URL(pagUrl || request.headers.get('referer') || '').pathname.slice(0, 200); } catch { return null; } })();
    insertEvento({ lead_id: leadId, sessao_id: cookies.get('ta_sid')?.value?.slice(0, 64) || null, pagina, tipo: name, event_id: eventId, origem: 'browser', utm_source: utms.utm_source, utm_campaign: utms.utm_campaign, utm_content: utms.utm_content, capi_status: capi.status, valor: typeof body.params?.value === 'number' ? body.params.value : null });
  }

  // Guarda de qual página veio o clique no checkout: o webhook da Hubla usa isso como
  // event_source_url do Purchase/InitiateCheckout (não dá para saber a página de dentro do
  // webhook, que só recebe o payload da própria Hubla).
  if (name === 'InitiateCheckout' && leadId && pagUrl) {
    db().prepare('UPDATE leads SET ultima_pagina_checkout = ? WHERE id = ?').run(pagUrl, leadId);
  }

  return new Response(null, { status: 204 });
};
