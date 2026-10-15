import type { APIRoute } from 'astro';
import { db } from '~/lib/db';
import { lerUtmsDoCookie, ipDoRequest, ehRobo } from '~/lib/tracking';

export const prerender = false;

/**
 * Recebe lotes de ações do navegador (public/js/ta-v4.js) e grava em sessoes + comportamento.
 * Não envia nada para a Meta: é o analytics próprio da página. Ver ANALISE.md.
 */
const TIPOS = new Set(['pagina', 'scroll', 'secao_vista', 'secao_tempo', 'clique', 'popup_aberto', 'popup_fechado', 'form_inicio', 'form_campo', 'form_erro', 'form_envio', 'tempo_ativo', 'saida']);
const ID = /^[a-zA-Z0-9-]{8,64}$/;
const txt = (v: unknown, n: number) => (v == null ? null : String(v).slice(0, n));
const int = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(Math.round(v), 2_000_000_000)) : null);

type Ev = { tipo: string; alvo?: string; valor?: number; t?: number };
type Body = { vid?: string; sid?: string; pagina?: string; sessao?: { referrer?: string; largura?: number; altura?: number; dispositivo?: string; fbclid?: boolean }; eventos?: Ev[] };

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  let b: Body;
  try { b = await request.json(); } catch { return new Response(null, { status: 400 }); }
  const vid = String(b.vid || ''), sid = String(b.sid || '');
  if (!ID.test(vid) || !ID.test(sid)) return new Response(null, { status: 400 });
  const pagina = txt(b.pagina, 120) || '/';
  const eventos = (Array.isArray(b.eventos) ? b.eventos : []).filter((e) => e && TIPOS.has(e.tipo)).slice(0, 80);

  const d = db();
  const utms = lerUtmsDoCookie(cookies);
  const s = b.sessao || {};
  const ua = txt(request.headers.get('user-agent'), 300);
  const robo = ehRobo(ua, int(s.largura), int(s.altura));
  const disp = ['celular', 'tablet', 'computador'].includes(String(s.dispositivo)) ? String(s.dispositivo) : null;

  d.transaction(() => {
    d.prepare(`INSERT OR IGNORE INTO sessoes (id, visitante_id, primeira_pagina, referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term, tem_fbclid, dispositivo, largura, altura, user_agent, ip, robo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      sid, vid, pagina, txt(s.referrer || utms.referrer, 300), utms.utm_source ?? null, utms.utm_medium ?? null, utms.utm_campaign ?? null, utms.utm_content ?? null, utms.utm_term ?? null,
      s.fbclid || utms.fbclid ? 1 : 0, disp, int(s.largura), int(s.altura), ua, ipDoRequest(request, clientAddress), robo ? 1 : 0,
    );
    if (robo) return; // robô: só a linha da sessão (para contar no painel), sem o comportamento

    const ins = d.prepare('INSERT INTO comportamento (sessao_id, pagina, tipo, alvo, valor, t_ms) VALUES (?, ?, ?, ?, ?, ?)');
    let paginas = 0, ativo = 0, scroll = 0, abriu = 0, iniciou = 0, grupo = 0, checkout = 0;
    for (const e of eventos) {
      const alvo = txt(e.alvo, 80), valor = int(e.valor);
      ins.run(sid, pagina, e.tipo, alvo, valor, int(e.t));
      if (e.tipo === 'pagina') paginas++;
      if (e.tipo === 'tempo_ativo' && valor) ativo += Math.min(valor, 120); // o navegador manda só os segundos novos desde o último lote
      if (e.tipo === 'scroll' && valor) scroll = Math.max(scroll, valor);
      if (e.tipo === 'popup_aberto') abriu = 1;
      if (e.tipo === 'form_inicio') iniciou = 1;
      if (e.tipo === 'clique' && alvo?.startsWith('grupo')) grupo = 1;
      if (e.tipo === 'clique' && alvo?.startsWith('checkout')) checkout = 1;
    }
    d.prepare(`UPDATE sessoes SET paginas = paginas + ?, tempo_ativo_s = tempo_ativo_s + ?, scroll_max = max(scroll_max, ?),
      abriu_form = max(abriu_form, ?), iniciou_form = max(iniciou_form, ?), clicou_grupo = max(clicou_grupo, ?), clicou_checkout = max(clicou_checkout, ?),
      atualizado_em = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`).run(paginas, ativo, scroll, abriu, iniciou, grupo, checkout, sid);
  })();

  return new Response(null, { status: 204 });
};
