import { defineMiddleware } from 'astro:middleware';
import { ENV } from '~/lib/env';
import { COOKIE_UTM, fbcDeFbclid, lerUtmsDaUrl, lerUtmsDoCookie, salvarUtms } from '~/lib/tracking';

// Rate limit simples em memória por IP (reinicia com o processo; suficiente para formulário)
const buckets = new Map<string, { n: number; t: number }>();
function rateLimited(ip: string, limite = 20, janelaMs = 60_000) {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now - b.t > janelaMs) { buckets.set(ip, { n: 1, t: now }); return false; }
  b.n++;
  return b.n > limite;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of buckets) if (now - v.t > 120_000) buckets.delete(k); }, 60_000).unref?.();

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { url, cookies, request } = ctx;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ctx.clientAddress || 'x';

  // Proteção do /admin: basic auth
  if (url.pathname.startsWith('/admin')) {
    const auth = request.headers.get('authorization') || '';
    const [user, pass] = Buffer.from(auth.replace(/^Basic\s+/i, ''), 'base64').toString().split(':');
    if (!ENV.ADMIN_PASS || user !== ENV.ADMIN_USER || pass !== ENV.ADMIN_PASS) {
      return new Response('Acesso restrito', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Tecnoapis Admin"' } });
    }
  }

  // Rate limit nos endpoints públicos de escrita
  if (request.method === 'POST' && (url.pathname === '/api/lead' || url.pathname === '/api/event')) {
    if (rateLimited(ip)) return new Response(JSON.stringify({ ok: false, erro: 'Muitas tentativas. Aguarde um minuto.' }), { status: 429, headers: { 'content-type': 'application/json' } });
  }

  // Captura UTMs / fbclid em cookie first-party (90 dias), só em páginas HTML
  if (request.method === 'GET' && !url.pathname.startsWith('/api') && !url.pathname.startsWith('/_')) {
    const novas = lerUtmsDaUrl(url);
    if (Object.keys(novas).length) {
      const antigas = lerUtmsDoCookie(cookies);
      const ref = request.headers.get('referer');
      salvarUtms(cookies, { ...antigas, ...novas, referrer: antigas.referrer ?? (ref && !ref.includes(url.host) ? ref.slice(0, 300) : undefined) });
      if (novas.fbclid && !cookies.get('_fbc')?.value) {
        cookies.set('_fbc', fbcDeFbclid(novas.fbclid), { path: '/', maxAge: 90 * 86400, sameSite: 'lax', secure: import.meta.env.PROD });
      }
    } else if (!cookies.has(COOKIE_UTM)) {
      const ref = request.headers.get('referer');
      if (ref && !ref.includes(url.host)) salvarUtms(cookies, { referrer: ref.slice(0, 300) });
    }
  }

  const res = await next();
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
});
