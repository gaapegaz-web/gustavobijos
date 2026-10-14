import type { APIRoute } from 'astro';
import { insertEvento, db } from '~/lib/db';
import { enviarCapi, separarNome } from '~/lib/capi';
import { ipDoRequest, lerFb, lerUtmsDoCookie } from '~/lib/tracking';
import type { Lead } from '~/lib/db';

export const prerender = false;

// Padrão da Meta + personalizados: AbriuFormulario (clicou em Garantir minha vaga), Rolou75 (75% da página), Engajou60s (60 s ativo)
const PERMITIDOS = new Set(['PageView', 'ViewContent', 'InitiateCheckout', 'AddToCart', 'Contact', 'Schedule', 'AbriuFormulario', 'Rolou75', 'Engajou60s']);

/** Réplica server-side de eventos do navegador, com o mesmo event_id para deduplicação. */
export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  let body: { name?: string; eventId?: string; params?: Record<string, unknown>; url?: string } = {};
  try { body = await request.json(); } catch { return new Response(null, { status: 400 }); }
  const name = String(body.name || '');
  const eventId = String(body.eventId || '').slice(0, 80);
  if (!PERMITIDOS.has(name) || !eventId) return new Response(null, { status: 204 });

  const utms = lerUtmsDoCookie(cookies);
  const { fbp, fbc } = lerFb(cookies);
  const leadId = Number(cookies.get('ta_lead')?.value || 0) || null;
  const lead = leadId ? (db().prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as Lead | undefined) : undefined;
  const { firstName, lastName } = separarNome(lead?.nome);

  const capi = await enviarCapi({
    name, eventId, sourceUrl: body.url || request.headers.get('referer'),
    user: { email: lead?.email, phone: lead?.whatsapp, firstName, lastName, fbp, fbc, ip: ipDoRequest(request, clientAddress), userAgent: request.headers.get('user-agent'), externalId: leadId },
    custom: body.params,
  });

  // PageView não precisa poluir a tabela de eventos; os outros sim
  if (!['PageView', 'Rolou75', 'Engajou60s'].includes(name)) {
    insertEvento({ lead_id: leadId, tipo: name, event_id: eventId, origem: 'browser', utm_source: utms.utm_source, utm_campaign: utms.utm_campaign, utm_content: utms.utm_content, capi_status: capi.status, valor: typeof body.params?.value === 'number' ? body.params.value : null });
  }
  return new Response(null, { status: 204 });
};
