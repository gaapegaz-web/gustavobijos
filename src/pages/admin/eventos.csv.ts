import type { APIRoute } from 'astro';
import { db } from '~/lib/db';
import { csv } from './leads.csv';
export const prerender = false;
export const GET: APIRoute = () => {
  const rows = db().prepare('SELECT e.id, e.created_at, e.tipo, e.origem, e.valor, e.capi_status, e.event_id, e.lead_id, l.nome, l.whatsapp, l.email, e.utm_source, e.utm_campaign, e.utm_content FROM eventos e LEFT JOIN leads l ON l.id = e.lead_id ORDER BY e.id').all() as Record<string, unknown>[];
  return csv(rows, 'eventos.csv');
};
