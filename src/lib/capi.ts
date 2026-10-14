import { createHash, randomUUID } from 'node:crypto';
import { ENV } from './env';
import { ufDoTelefone } from './phone';

const API_VERSION = 'v21.0';

export type UserData = {
  email?: string | null; phone?: string | null; firstName?: string | null; lastName?: string | null;
  fbp?: string | null; fbc?: string | null; ip?: string | null; userAgent?: string | null; externalId?: string | number | null;
  city?: string | null; state?: string | null; country?: string | null;
};

export type CapiEvent = {
  name: 'PageView' | 'ViewContent' | 'Lead' | 'InitiateCheckout' | 'Purchase' | string;
  eventId: string;
  time?: Date;
  sourceUrl?: string | null;
  user: UserData;
  custom?: Record<string, unknown>;
  actionSource?: 'website' | 'system_generated' | 'other';
};

export const novoEventId = () => randomUUID();

const sha = (v: string) => createHash('sha256').update(v).digest('hex');
const norm = (v?: string | null) => (v ?? '').toString().trim().toLowerCase();

function hashedUser(u: UserData) {
  const out: Record<string, unknown> = {};
  if (u.email) out.em = [sha(norm(u.email))];
  if (u.phone) out.ph = [sha(u.phone.replace(/\D/g, ''))];
  if (u.firstName) out.fn = [sha(norm(u.firstName))];
  if (u.lastName) out.ln = [sha(norm(u.lastName))];
  if (u.city) out.ct = [sha(norm(u.city).replace(/\s/g, ''))];
  // Estado: o informado, ou o do DDD do WhatsApp (todo evento com telefone ganha st)
  const uf = u.state ? norm(u.state) : ufDoTelefone(u.phone);
  if (uf) out.st = [sha(uf)];
  out.country = [sha(u.country ? norm(u.country) : 'br')];
  if (u.externalId != null) out.external_id = [sha(String(u.externalId))];
  if (u.fbp) out.fbp = u.fbp;
  if (u.fbc) out.fbc = u.fbc;
  if (u.ip) out.client_ip_address = u.ip;
  if (u.userAgent) out.client_user_agent = u.userAgent;
  return out;
}

export function separarNome(nome?: string | null) {
  const p = (nome ?? '').trim().split(/\s+/).filter(Boolean);
  return { firstName: p[0] ?? null, lastName: p.length > 1 ? p[p.length - 1] : null };
}

/**
 * Envia um evento para a Meta Conversions API. Nunca lança: devolve {ok, status, body}.
 */
export async function enviarCapi(ev: CapiEvent): Promise<{ ok: boolean; status: string; body?: unknown }> {
  const pixel = ENV.META_PIXEL_ID, token = ENV.META_CAPI_TOKEN;
  if (!pixel || !token) return { ok: false, status: 'pulado' };

  const payload: Record<string, unknown> = {
    data: [{
      event_name: ev.name,
      event_time: Math.floor((ev.time ?? new Date()).getTime() / 1000),
      event_id: ev.eventId,
      action_source: ev.actionSource ?? 'website',
      event_source_url: ev.sourceUrl ?? undefined,
      user_data: hashedUser(ev.user),
      custom_data: ev.custom,
    }],
  };
  if (ENV.META_TEST_EVENT_CODE) payload.test_event_code = ENV.META_TEST_EVENT_CODE;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal,
    });
    clearTimeout(t);
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.ok ? 'ok' : `erro ${res.status}`, body };
  } catch (e) {
    return { ok: false, status: `erro ${(e as Error).message}` };
  }
}
