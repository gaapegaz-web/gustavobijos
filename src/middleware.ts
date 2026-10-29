import { defineMiddleware } from 'astro:middleware';
import { COOKIE_ADMIN, sessaoValida } from '~/lib/sessao-admin';
import { COOKIE_UTM, fbcDeFbclid, ipDoRequest, lerUtmsDaUrl, lerUtmsDoCookie, salvarUtms } from '~/lib/tracking';

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
  const ip = ipDoRequest(request, ctx.clientAddress) || 'x';

  // /tecnoapis/ e /tecnoapis são a mesma página: só uma URL canônica (301 para a sem barra)
  if (request.method === 'GET' && url.pathname.length > 1 && url.pathname.endsWith('/') && !url.pathname.startsWith('/api')) {
    return new Response(null, { status: 301, headers: { location: url.pathname.replace(/\/+$/, '') + url.search } });
  }

  // Proteção do /admin e /api/admin: cookie de sessão criado em /admin/login (lib/sessao-admin.ts)
  if ((url.pathname.startsWith('/admin') && url.pathname !== '/admin/login') || url.pathname.startsWith('/api/admin')) {
    if (!sessaoValida(cookies.get(COOKIE_ADMIN)?.value)) {
      if (url.pathname.startsWith('/api')) return new Response(JSON.stringify({ ok: false, erro: 'Sessão expirada. Entre de novo no /admin.' }), { status: 401, headers: { 'content-type': 'application/json' } });
      return new Response(null, { status: 303, headers: { location: `/admin/login?${new URLSearchParams({ volta: url.pathname + url.search })}` } });
    }
  }

  // Rate limit nos endpoints públicos de escrita
  if (request.method === 'POST' && (url.pathname === '/api/lead' || url.pathname === '/api/event' || url.pathname === '/api/comportamento')) {
    if (rateLimited(ip, url.pathname === '/api/lead' ? 20 : 120)) return new Response(JSON.stringify({ ok: false, erro: 'Muitas tentativas. Aguarde um minuto.' }), { status: 429, headers: { 'content-type': 'application/json' } });
  }

  // Captura UTMs / fbclid em cookie first-party (90 dias), só em páginas HTML
  if (request.method === 'GET' && !url.pathname.startsWith('/api') && !url.pathname.startsWith('/_') && !url.pathname.startsWith('/uploads/')) {
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
  // HTML sempre revalida: evita navegador servir página antiga apontando para CSS de build anterior
  if (!url.pathname.startsWith('/_astro') && (res.headers.get('content-type') || '').includes('text/html')) {
    res.headers.set('Cache-Control', 'no-cache');
    if (!/charset/i.test(res.headers.get('content-type') || '')) res.headers.set('content-type', 'text/html; charset=utf-8');
  }
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Fora do Google: painel, API, página pós-cadastro e links curtos (que só redirecionam)
  if (/^\/(admin|api|obrigado|r)(\/|$)/.test(url.pathname)) res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return res;
});
