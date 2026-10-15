/** Helpers de tracking do lado do servidor: UTMs, cookies fbp/fbc, IP. */
import type { AstroCookies } from 'astro';

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
export type Utms = Partial<Record<(typeof UTM_KEYS)[number], string>> & { fbclid?: string; referrer?: string };

export const COOKIE_UTM = 'ta_utm';
const COOKIE_DIAS = 90;

export function lerUtmsDaUrl(url: URL): Utms {
  const out: Utms = {};
  for (const k of UTM_KEYS) { const v = url.searchParams.get(k); if (v) out[k] = v.slice(0, 200); }
  const fbclid = url.searchParams.get('fbclid'); if (fbclid) out.fbclid = fbclid.slice(0, 500);
  return out;
}

export function lerUtmsDoCookie(cookies: AstroCookies): Utms {
  try { const raw = cookies.get(COOKIE_UTM)?.value; return raw ? (JSON.parse(raw) as Utms) : {}; } catch { return {}; }
}

export function salvarUtms(cookies: AstroCookies, utms: Utms) {
  cookies.set(COOKIE_UTM, JSON.stringify(utms), { path: '/', maxAge: COOKIE_DIAS * 86400, sameSite: 'lax', httpOnly: false, secure: import.meta.env.PROD });
}

/** fbc no formato exigido pela Meta: fb.1.<timestamp ms>.<fbclid> */
export function fbcDeFbclid(fbclid: string) { return `fb.1.${Date.now()}.${fbclid}`; }

export function lerFb(cookies: AstroCookies) {
  return { fbp: cookies.get('_fbp')?.value ?? null, fbc: cookies.get('_fbc')?.value ?? null };
}

export function ipDoRequest(request: Request, fallback?: string) {
  const h = request.headers;
  return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || fallback || '').trim() || null;
}

/**
 * Robôs e testes automáticos (navegador headless, crawlers, revisor de anúncio da Meta).
 * A Meta abre o link do anúncio numa janela de 1050x1893 com user agents variados: não é gente.
 */
const UA_ROBO = /headless|bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|meta-externalagent|lighthouse|pagespeed|gtmetrix|python|curl|wget|phantom|selenium|puppeteer|playwright/i;
export function ehRobo(ua: string | null | undefined, largura?: number | null, altura?: number | null) {
  return !ua || UA_ROBO.test(ua) || (largura === 1050 && altura === 1893);
}

/** Monta a URL do checkout repassando UTMs e dados do lead (Hubla aceita utm_* e src na query). */
export function urlCheckout(base: string, utms: Utms, extra: Record<string, string | undefined> = {}) {
  if (!base || base.startsWith('#')) return base;
  const u = new URL(base);
  for (const k of UTM_KEYS) if (utms[k]) u.searchParams.set(k, utms[k]!);
  if (utms.utm_source) u.searchParams.set('src', [utms.utm_source, utms.utm_medium, utms.utm_content].filter(Boolean).join('_'));
  for (const [k, v] of Object.entries(extra)) if (v) u.searchParams.set(k, v);
  return u.toString();
}
