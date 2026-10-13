import type { APIRoute } from 'astro';
import { insertLead, insertEvento } from '~/lib/db';
import { normalizarWhatsapp } from '~/lib/phone';
import { enviarCapi, novoEventId, separarNome } from '~/lib/capi';
import { ipDoRequest, lerFb, lerUtmsDoCookie, lerUtmsDaUrl } from '~/lib/tracking';

export const prerender = false;

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

export const POST: APIRoute = async ({ request, cookies, clientAddress, url }) => {
  const ct = request.headers.get('content-type') || '';
  const quereJson = ct.includes('application/json') || (request.headers.get('accept') || '').includes('application/json');

  let dados: Record<string, string> = {};
  try {
    if (ct.includes('application/json')) dados = await request.json();
    else { const fd = await request.formData(); fd.forEach((v, k) => (dados[k] = String(v))); }
  } catch { return resposta({ ok: false, erro: 'Dados inválidos' }, 400, quereJson); }

  // Honeypot anti-bot
  if (dados.site) return resposta({ ok: true, redirect: '/obrigado' }, 200, quereJson);

  const nome = (dados.nome || '').trim().slice(0, 120);
  const email = (dados.email || '').trim().toLowerCase().slice(0, 200) || null;
  if (nome.length < 2) return resposta({ ok: false, erro: 'Digite o seu nome', campo: 'nome' }, 422, quereJson);
  const tel = normalizarWhatsapp(dados.whatsapp || '');
  if (!tel.ok) return resposta({ ok: false, erro: tel.erro, campo: 'whatsapp' }, 422, quereJson);
  if (email && !emailOk(email)) return resposta({ ok: false, erro: 'E-mail inválido', campo: 'email' }, 422, quereJson);
  if (dados.consentimento === '0' || dados.consentimento === 'false') return resposta({ ok: false, erro: 'Precisamos do seu consentimento para enviar o link', campo: 'consentimento' }, 422, quereJson);

  const utms = { ...lerUtmsDoCookie(cookies), ...lerUtmsDaUrl(url) };
  const { fbp, fbc } = lerFb(cookies);
  const ip = ipDoRequest(request, clientAddress);
  const ua = request.headers.get('user-agent');
  const eventId = novoEventId();

  const leadId = insertLead({
    nome, whatsapp: tel.e164, email,
    utm_source: utms.utm_source ?? null, utm_medium: utms.utm_medium ?? null, utm_campaign: utms.utm_campaign ?? null,
    utm_content: utms.utm_content ?? null, utm_term: utms.utm_term ?? null,
    fbclid: utms.fbclid ?? null, fbp, fbc, ip, user_agent: ua,
    pagina: (dados.pagina || '/').slice(0, 200), variante: (dados.variante || null)?.slice(0, 80) ?? null, referrer: utms.referrer ?? null,
    consentimento: 1,
  });

  const { firstName, lastName } = separarNome(nome);
  const capi = await enviarCapi({
    name: 'Lead', eventId, sourceUrl: request.headers.get('referer') || url.origin + (dados.pagina || '/'),
    user: { email, phone: tel.e164, firstName, lastName, fbp, fbc, ip, userAgent: ua, externalId: leadId },
    custom: { content_name: 'Live De 10 para 100 colmeias', lead_source: utms.utm_source ?? 'direto' },
  });

  insertEvento({ lead_id: leadId, tipo: 'Lead', event_id: eventId, origem: 'server', utm_source: utms.utm_source, utm_campaign: utms.utm_campaign, utm_content: utms.utm_content, capi_status: capi.status, payload: capi.ok ? null : capi.body });

  cookies.set('ta_lead', String(leadId), { path: '/', maxAge: 180 * 86400, sameSite: 'lax', httpOnly: true, secure: import.meta.env.PROD });
  const redirect = `/obrigado?e=${eventId}`;
  return resposta({ ok: true, redirect, eventId }, 200, quereJson);
};

function resposta(body: Record<string, unknown>, status: number, json: boolean) {
  if (json) return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  if (body.ok && body.redirect) return new Response(null, { status: 303, headers: { location: String(body.redirect) } });
  const q = new URLSearchParams({ erro: String(body.erro || 'Erro'), campo: String(body.campo || '') });
  return new Response(null, { status: 303, headers: { location: `/?${q}#form` } });
}
