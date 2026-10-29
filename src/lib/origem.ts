import type Database from 'better-sqlite3';
import { diasDoPeriodo } from './periodo';

export const pago = (medium: string) => /^(paid_social|paid_search|paid|cpc|ppc|cpm|display|social_paid)$/i.test(medium);
export const fonteNome = (s: string) => ({fb: 'Facebook', ig: 'Instagram', an: 'Audience Network', msg: 'Messenger', '(direto)': 'Direto / sem origem', '(referencia)': 'Outro site'}[s] || s);
export const campos = ['fonte', 'midia', 'campanha', 'conjunto', 'anuncio', 'pagina'] as const;
export type Dim = typeof campos[number];
export type Linha = Record<Dim, string> & { visitas: number; converteu: number; abriu: number; iniciou: number; grupo: number; checkout: number; leads: number; compras: number };
export const vazio = () => ({ visitas: 0, converteu: 0, abriu: 0, iniciou: 0, grupo: 0, checkout: 0, leads: 0, compras: 0 });
export function somar(rows: Linha[]) {
  const n = vazio();
  for (const r of rows) for (const k of Object.keys(n) as (keyof typeof n)[]) n[k] += r[k];
  return n;
}
export function agrupar(rows: Linha[], dims: readonly Dim[]) {
  const groups = new Map<string, Linha>();
  for (const r of rows) {
    const key = JSON.stringify(dims.map(k => r[k]));
    if (!groups.has(key)) groups.set(key, { ...r, ...vazio() });
    const a = groups.get(key)!;
    for (const k of Object.keys(vazio()) as (keyof ReturnType<typeof vazio>)[]) a[k] += r[k];
  }
  return [...groups.values()].sort((a,b) => b.leads-a.leads || b.visitas-a.visitas);
}
export function dadosOrigem(d: Database.Database, url: URL) {
  const dias = diasDoPeriodo(url);
  const filtros = Object.fromEntries(['canal','fonte','campanha','conjunto','anuncio','pagina'].map(k => [k, url.searchParams.get(k) || '']));
  const dims = (a: string, pagina: string) => `coalesce(nullif(${a}.utm_source,''),CASE WHEN nullif(${a}.referrer,'') IS NOT NULL THEN '(referencia)' ELSE '(direto)' END) fonte,
    coalesce(${a}.utm_medium,'') midia, coalesce(${a}.utm_campaign,'') campanha, coalesce(${a}.utm_term,'') conjunto,
    coalesce(${a}.utm_content,'') anuncio, coalesce(${a}.${pagina},'') pagina`;
  // Bases separadas: uma sessão pode estar ligada a vários cadastros; o JOIN não pode multiplicar visitas.
  const sessoes = d.prepare(`SELECT ${dims('s','primeira_pagina')}, count(*) visitas,
    sum(s.lead_id IS NOT NULL) converteu, sum(s.abriu_form != 0 OR s.iniciou_form != 0 OR s.lead_id IS NOT NULL) abriu,
    sum(s.iniciou_form != 0 OR s.lead_id IS NOT NULL) iniciou, sum(s.clicou_grupo != 0) grupo, sum(s.clicou_checkout != 0) checkout,
    0 leads, 0 compras FROM sessoes s WHERE s.robo = 0 AND datetime(s.created_at) >= datetime('now', ?)
    GROUP BY 1,2,3,4,5,6`).all(`-${dias} days`) as Linha[];
  const leads = d.prepare(`SELECT ${dims('l','pagina')}, 0 visitas, 0 converteu, 0 abriu, 0 iniciou, 0 grupo, 0 checkout,
    count(*) leads, sum(l.comprou != 0) compras FROM leads l
    WHERE datetime(l.created_at) >= datetime('now', ?) AND NOT EXISTS (SELECT 1 FROM sessoes s WHERE s.id = l.sessao_id AND s.robo = 1)
    GROUP BY 1,2,3,4,5,6`).all(`-${dias} days`) as Linha[];
  const todos = agrupar([...sessoes,...leads].map(r => ({ ...r,
    fonte: ({ facebook: 'fb', instagram: 'ig' }[r.fonte.trim().toLowerCase()] || r.fonte.trim().toLowerCase()),
    midia: r.midia.trim().toLowerCase(),
  })), campos);
  const combina = (r: Linha, ignorar = '') => Object.entries(filtros).every(([k,v]) => !v || k === ignorar || (k === 'canal' ? (v === 'pago' ? pago(r.midia) : !pago(r.midia)) : r[k as Dim] === v));
  const rows = todos.filter(r => combina(r));
  const opcoes = Object.fromEntries(['fonte','campanha','conjunto','anuncio','pagina'].map(k => [k, [...new Set(todos.filter(r=>combina(r,k)).map(r=>r[k as Dim]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'))]));
  return { dias, filtros, rows, opcoes, total: somar(rows) };
}
