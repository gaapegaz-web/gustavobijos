import type { APIRoute } from 'astro';
import { db, findLeadByContact, insertEvento, eventoExiste } from '~/lib/db';
import { enviarCapi, novoEventId, separarNome } from '~/lib/capi';
import { normalizarWhatsapp } from '~/lib/phone';
import { ENV } from '~/lib/env';
import { CAMPANHA } from '~/config/black';

export const prerender = false;

/**
 * Webhook da Hubla. Configure na Hubla a URL:
 *   https://gustavobijos.com.br/api/hubla-webhook?token=<HUBLA_WEBHOOK_TOKEN>
 * O token também é aceito nos headers x-hubla-token / authorization.
 *
 * Os nomes de evento variam entre versões da Hubla; o normalizador abaixo lida com os formatos conhecidos
 * e guarda o payload bruto na tabela `webhooks` para auditoria.
 */
export const POST: APIRoute = async ({ request, url }) => {
  const token = url.searchParams.get('token') || request.headers.get('x-hubla-token') || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!ENV.HUBLA_WEBHOOK_TOKEN || token !== ENV.HUBLA_WEBHOOK_TOKEN) return new Response('unauthorized', { status: 401 });

  const raw = await request.text();
  let p: any = {};
  try { p = JSON.parse(raw); } catch { return new Response('bad json', { status: 400 }); }

  const n = normalizar(p);
  const wh = db().prepare('INSERT INTO webhooks (fonte, tipo, payload) VALUES (?, ?, ?)').run('hubla', n.tipoOriginal, raw.slice(0, 50000));
  const whId = Number(wh.lastInsertRowid);

  try {
    if (!n.tipo) { marcar(whId, 1, 'tipo ignorado'); return ok(); }
    const eventId = `hubla:${n.tipo}:${n.transacaoId || n.email || n.telefone || whId}`;
    if (eventoExiste(eventId)) { marcar(whId, 1, 'duplicado'); return ok(); }

    const tel = n.telefone ? normalizarWhatsapp(n.telefone) : null;
    const e164 = tel && tel.ok ? tel.e164 : null;
    const lead = findLeadByContact(e164, n.email);
    const { firstName, lastName } = separarNome(n.nome || lead?.nome);

    let capiStatus: string | null = 'pulado';
    if (n.tipo === 'Purchase') {
      // Valor sempre vem da Hubla (n.valor), nunca de um preço fixo nosso: o site hoje tem
      // páginas de vendas com produtos/preços diferentes, e mandar um número chutado pra Meta
      // quando a Hubla não informar o valor real é pior do que simplesmente não mandar.
      const r = await enviarCapi({
        name: 'Purchase', eventId, actionSource: 'website', sourceUrl: `${CAMPANHA.dominio}/black`,
        user: { email: n.email || lead?.email, phone: e164 || lead?.whatsapp, firstName, lastName, fbp: lead?.fbp, fbc: lead?.fbc, ip: lead?.ip, userAgent: lead?.user_agent, externalId: lead?.id },
        custom: { ...(n.valor != null ? { currency: 'BRL', value: n.valor } : {}), content_name: n.produto || CAMPANHA.preco.produtoNome, order_id: n.transacaoId || undefined },
      });
      capiStatus = n.valor == null ? `${r.status} (sem valor da Hubla)` : r.status;
      if (lead) db().prepare('UPDATE leads SET comprou = 1 WHERE id = ?').run(lead.id);
    } else if (n.tipo === 'InitiateCheckout') {
      const r = await enviarCapi({
        name: 'InitiateCheckout', eventId, actionSource: 'website', sourceUrl: `${CAMPANHA.dominio}/black`,
        user: { email: n.email || lead?.email, phone: e164 || lead?.whatsapp, firstName, lastName, fbp: lead?.fbp, fbc: lead?.fbc, ip: lead?.ip, userAgent: lead?.user_agent, externalId: lead?.id },
        custom: n.valor != null ? { currency: 'BRL', value: n.valor } : undefined,
      });
      capiStatus = r.status;
    }

    insertEvento({ lead_id: lead?.id ?? null, tipo: n.tipo, valor: n.valor, event_id: eventId, origem: 'hubla', utm_source: lead?.utm_source ?? n.utm_source, utm_campaign: lead?.utm_campaign ?? n.utm_campaign, utm_content: lead?.utm_content, capi_status: capiStatus, payload: { nome: n.nome, email: n.email, telefone: e164, produto: n.produto, transacaoId: n.transacaoId } });
    marcar(whId, 1, null);
  } catch (e) {
    marcar(whId, 0, (e as Error).message);
  }
  return ok();
};

const ok = () => new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
const marcar = (id: number, proc: number, erro: string | null) => db().prepare('UPDATE webhooks SET processado = ?, erro = ? WHERE id = ?').run(proc, erro, id);

type Norm = { tipo: 'Purchase' | 'InitiateCheckout' | 'Abandono' | 'Reembolso' | null; tipoOriginal: string; nome?: string; email?: string; telefone?: string; valor?: number | null; produto?: string; transacaoId?: string; utm_source?: string; utm_campaign?: string };

function normalizar(p: any): Norm {
  const tipoOriginal = String(p.type || p.event || p.event_type || p.name || '').trim();
  const t = tipoOriginal.toLowerCase();
  const ev = p.event && typeof p.event === 'object' ? p.event : p.data || p;
  const user = ev.user || ev.customer || ev.buyer || ev.client || p.user || {};
  const inv = ev.invoice || ev.payment || ev.transaction || ev;
  const prod = ev.product || ev.offer || p.product || {};

  const pick = (...vals: unknown[]) => vals.find((v) => v != null && v !== '') as string | undefined;
  const valorRaw = pick(inv.amount?.totalCents, inv.totalCents, inv.total_cents, inv.amount?.total, inv.total, inv.value, inv.price, ev.amount, ev.value);
  let valor: number | null = valorRaw != null ? Number(valorRaw) : null;
  if (valor != null && (inv.amount?.totalCents != null || inv.totalCents != null || inv.total_cents != null || valor > 100000)) valor = valor / 100;

  let tipo: Norm['tipo'] = null;
  if (/payment_succeeded|newsale|paid|approved|aprovad|purchase|sale\.completed|invoice\.paid/.test(t)) tipo = 'Purchase';
  else if (/refund|chargeback|canceledsale|cancel|estorn|reembols/.test(t)) tipo = 'Reembolso';
  else if (/abandon/.test(t)) tipo = 'Abandono';
  else if (/invoice\.created|checkout|pending|waiting|aguardando/.test(t)) tipo = 'InitiateCheckout';

  return {
    tipo, tipoOriginal,
    nome: pick(user.name, user.fullName, user.full_name, user.firstName && `${user.firstName} ${user.lastName || ''}`),
    email: pick(user.email)?.toLowerCase(),
    telefone: pick(user.phone, user.phoneNumber, user.phone_number, user.whatsapp, user.cellphone),
    valor, produto: pick(prod.name, prod.title, ev.productName, ev.product_name),
    transacaoId: pick(inv.id, inv.transactionId, inv.transaction_id, ev.id, p.id),
    utm_source: pick(ev.utm_source, ev.utm?.source, ev.tracking?.utm_source, inv.utm_source),
    utm_campaign: pick(ev.utm_campaign, ev.utm?.campaign, ev.tracking?.utm_campaign, inv.utm_campaign),
  };
}
