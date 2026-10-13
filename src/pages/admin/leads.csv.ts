import type { APIRoute } from 'astro';
import { db } from '~/lib/db';
export const prerender = false;
export const GET: APIRoute = () => {
  const rows = db().prepare('SELECT id, created_at, nome, whatsapp, email, utm_source, utm_medium, utm_campaign, utm_content, utm_term, variante, pagina, referrer, comprou FROM leads ORDER BY id').all() as Record<string, unknown>[];
  return csv(rows, 'leads.csv');
};
export function csv(rows: Record<string, unknown>[], nome: string) {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\r\n');
  return new Response('﻿' + body, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${nome}"` } });
}
