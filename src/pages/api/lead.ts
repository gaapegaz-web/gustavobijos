import type { APIRoute } from 'astro';
import { insertLead, insertEvento, db } from '~/lib/db';
import { normalizarWhatsapp } from '~/lib/phone';
import { lerUtmsDoCookie, lerUtmsDaUrl } from '~/lib/tracking';
import { ipDoRequest } from '~/lib/tracking';
import { lerFb } from '~/lib/tracking';

export const prerender = false;

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

/**
 * Cadastro do formulário. NÃO manda nada para a Meta aqui — o evento Lead sai só quando
 * a pessoa abre /obrigado (servidor + navegador, mesmo event_id). Ver src/pages/obrigado.astro.
 * Este endpoint só grava o lead e decide, via meta_lead, se a /obrigado deve ou não disparar:
 *  - WhatsApp repetido: não é lead novo, meta_lead fica como já estava, /obrigado não dispara de novo
 *    (óbvio: a pessoa que faz 2º cadastro com o mesmo número já dormiu o Lead no 1º).
 *  - Mesmo aparelho/IP+UA nas últimas 24h com número diferente: grava mas meta_lead = 0,
 *    para não inflar Lead com o número da esposa/vizinho testado no mesmo celular.
 */
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

  const sessaoId = cookies.get('ta_sid')?.value?.slice(0, 64) || null;
  const visitanteId = cookies.get('ta_vid')?.value?.slice(0, 64) || null;

  // 1) Mesmo WhatsApp já cadastrado: não cria lead novo. Segue para /obrigado sem ?e,
  //    então a página não dispara outro Lead.
  const existente = db().prepare('SELECT id FROM leads WHERE whatsapp = ?').get(tel.e164) as { id: number } | undefined;
  if (existente) {
    db().prepare("UPDATE leads SET envios = envios + 1, ultimo_envio_em = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(existente.id);
    if (sessaoId) db().prepare('UPDATE sessoes SET lead_id = ? WHERE id = ?').run(existente.id, sessaoId);
    cookies.set('ta_lead', String(existente.id), { path: '/', maxAge: 180 * 86400, sameSite: 'lax', httpOnly: true, secure: import.meta.env.PROD });
    return resposta({ ok: true, redirect: '/obrigado', repetido: true }, 200, quereJson);
  }

  const utms = { ...lerUtmsDoCookie(cookies), ...lerUtmsDaUrl(url) };
  const { fbp, fbc } = lerFb(cookies);
  const ip = ipDoRequest(request, clientAddress);
  const ua = request.headers.get('user-agent');

  // 2) Outro número vindo do mesmo aparelho nas últimas 24h: grava, mas meta_lead = 0
  //    (não conta Lead novo na Meta). Só IP igual não basta: operadoras dividem IP entre muita gente.
  const mesmoAparelho = !!db().prepare(`SELECT 1 FROM leads WHERE created_at >= datetime('now', '-1 day')
    AND ((? IS NOT NULL AND visitante_id = ?) OR (? IS NOT NULL AND ip = ? AND user_agent = ?)) LIMIT 1`).get(visitanteId, visitanteId, ip, ip, ua);

  let leadId: number;
  try { leadId = insertLead({
    nome, whatsapp: tel.e164, email,
    utm_source: utms.utm_source ?? null, utm_medium: utms.utm_medium ?? null, utm_campaign: utms.utm_campaign ?? null,
    utm_content: utms.utm_content ?? null, utm_term: utms.utm_term ?? null,
    fbclid: utms.fbclid ?? null, fbp, fbc, ip, user_agent: ua,
    pagina: (dados.pagina || '/').slice(0, 200), variante: (dados.variante || null)?.slice(0, 80) ?? null, referrer: utms.referrer ?? null,
    consentimento: 1,
  }); } catch (e) {
    // Dois envios simultâneos com o mesmo número: o índice único barra o segundo.
    if (String((e as Error).message).includes('UNIQUE')) return resposta({ ok: true, redirect: '/obrigado', repetido: true }, 200, quereJson);
    throw e;
  }

  // Liga o lead à visita (analytics próprio): ver tabelas sessoes/comportamento
  if (sessaoId || visitanteId) {
    db().prepare('UPDATE leads SET sessao_id = ?, visitante_id = ? WHERE id = ?').run(sessaoId, visitanteId, leadId);
    if (sessaoId) db().prepare('UPDATE sessoes SET lead_id = ? WHERE id = ?').run(leadId, sessaoId);
  }

  cookies.set('ta_lead', String(leadId), { path: '/', maxAge: 180 * 86400, sameSite: 'lax', httpOnly: true, secure: import.meta.env.PROD });

  if (mesmoAparelho) {
    db().prepare('UPDATE leads SET meta_lead = 0 WHERE id = ?').run(leadId);
    return resposta({ ok: true, redirect: '/obrigado' }, 200, quereJson);
  }

  // meta_lead fica 1 (padrão da coluna): /obrigado dispara o Lead para a Meta.
  return resposta({ ok: true, redirect: '/obrigado' }, 200, quereJson);
};

function resposta(body: Record<string, unknown>, status: number, json: boolean) {
  if (json) return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  if (body.ok && body.redirect) return new Response(null, { status: 303, headers: { location: String(body.redirect) } });
  const q = new URLSearchParams({ erro: String(body.erro || 'Erro'), campo: String(body.campo || '') });
  return new Response(null, { status: 303, headers: { location: `/?${q}#form` } });
}
