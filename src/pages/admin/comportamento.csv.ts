import type { APIRoute } from 'astro';
import { db } from '~/lib/db';
import { csv } from './leads.csv';
export const prerender = false;
/** Uma linha por ação na página, com os dados da visita ao lado. */
export const GET: APIRoute = () => {
  const rows = db().prepare(`SELECT c.id, c.created_at, c.sessao_id, s.visitante_id, c.pagina, c.tipo, c.alvo, c.valor, c.t_ms,
      s.utm_source, s.utm_medium, s.utm_campaign, s.utm_content, s.dispositivo, s.lead_id
    FROM comportamento c JOIN sessoes s ON s.id = c.sessao_id ORDER BY c.id`).all() as Record<string, unknown>[];
  return csv(rows, 'comportamento.csv');
};
