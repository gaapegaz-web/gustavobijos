import type { APIRoute } from 'astro';
import { db, findLeadByContact, insertEvento, eventoExiste } from '~/lib/db';
import { enviarCapi, separarNome } from '~/lib/capi';
import { normalizarWhatsapp } from '~/lib/phone';
import { ENV } from '~/lib/env';
import { CAMPANHA } from '~/config/black';
import { normalizar } from '~/lib/hubla';

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
      // A Meta descarta Purchase sem value/currency (e acusa erro no diagnóstico). O valor vem
      // sempre da Hubla, nunca de um preço fixo nosso. Se não veio, provavelmente a Hubla mudou o
      // formato do payload: não envia, marca para aparecer como alerta no /admin e o payload bruto
      // fica na tabela webhooks para ajustar o normalizar().
      if (n.valor == null || !(n.valor > 0)) {
        capiStatus = 'pulado: sem valor da Hubla';
      } else {
        const r = await enviarCapi({
          name: 'Purchase', eventId, actionSource: 'website', sourceUrl: lead?.ultima_pagina_checkout || CAMPANHA.dominio,
          user: { email: n.email || lead?.email, phone: e164 || lead?.whatsapp, firstName, lastName, fbp: lead?.fbp, fbc: lead?.fbc, ip: lead?.ip, userAgent: lead?.user_agent, externalId: lead?.id },
          custom: { currency: 'BRL', value: n.valor, content_name: n.produto || CAMPANHA.preco.produtoNome, order_id: n.transacaoId || undefined },
        });
        capiStatus = r.status;
      }
      if (lead) db().prepare('UPDATE leads SET comprou = 1 WHERE id = ?').run(lead.id);
    } else if (n.tipo === 'InitiateCheckout') {
      const r = await enviarCapi({
        name: 'InitiateCheckout', eventId, actionSource: 'website', sourceUrl: lead?.ultima_pagina_checkout || CAMPANHA.dominio,
        user: { email: n.email || lead?.email, phone: e164 || lead?.whatsapp, firstName, lastName, fbp: lead?.fbp, fbc: lead?.fbc, ip: lead?.ip, userAgent: lead?.user_agent, externalId: lead?.id },
        custom: n.valor != null ? { currency: 'BRL', value: n.valor } : undefined,
      });
      capiStatus = r.status;
    } else if (n.tipo === 'Reembolso' && lead) {
      // Continua comprador só se sobrar compra sem reembolso (+1: este reembolso ainda não foi gravado em eventos)
      db().prepare(`UPDATE leads SET comprou = (SELECT count(*) FROM eventos WHERE lead_id = @id AND tipo = 'Purchase')
        > (SELECT count(*) FROM eventos WHERE lead_id = @id AND tipo = 'Reembolso') + 1 WHERE id = @id`).run({ id: lead.id });
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
