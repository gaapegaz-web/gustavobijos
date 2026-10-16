import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { ENV } from './env';
import { ehRobo } from './tracking';
import { LINKS } from '~/config/black';

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  const path = ENV.DB_PATH;
  mkdirSync(dirname(path), { recursive: true });
  _db = new Database(path);
  _db.pragma('journal_mode = WAL');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('busy_timeout = 5000');
  _db.exec(readFileSync(resolve(process.cwd(), 'schema.sql'), 'utf8'));
  migrar(_db);
  seedLinks(_db);
  return _db;
}

/** Colunas novas em tabelas antigas (CREATE TABLE IF NOT EXISTS não altera tabela existente). */
function migrar(d: Database.Database) {
  const cols = (t: string) => new Set((d.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name));
  if (!cols('leads').has('sessao_id')) d.exec('ALTER TABLE leads ADD COLUMN sessao_id TEXT');
  if (!cols('leads').has('visitante_id')) d.exec('ALTER TABLE leads ADD COLUMN visitante_id TEXT');
  if (!cols('leads').has('envios')) d.exec('ALTER TABLE leads ADD COLUMN envios INTEGER NOT NULL DEFAULT 1');
  if (!cols('leads').has('ultimo_envio_em')) d.exec('ALTER TABLE leads ADD COLUMN ultimo_envio_em TEXT');
  if (!cols('leads').has('meta_lead')) d.exec('ALTER TABLE leads ADD COLUMN meta_lead INTEGER NOT NULL DEFAULT 1'); // 0 = não contou como Lead na Meta (mesmo aparelho)
  if (!cols('leads').has('lead_enviado_em')) d.exec('ALTER TABLE leads ADD COLUMN lead_enviado_em TEXT'); // marca quando o evento Lead já foi disparado (evita duplicar em reload de /obrigado)
  if (!cols('links').has('utm_term')) d.exec('ALTER TABLE links ADD COLUMN utm_term TEXT'); // granularidade de anúncio/criativo do Meta Ads
  if (!cols('leads').has('ultima_pagina_checkout')) d.exec('ALTER TABLE leads ADD COLUMN ultima_pagina_checkout TEXT'); // última página de onde a pessoa clicou em BotaoCheckout (para o sourceUrl do Purchase/InitiateCheckout no webhook da Hubla)
  if (!cols('sessoes').has('ip')) d.exec('ALTER TABLE sessoes ADD COLUMN ip TEXT');
  if (!cols('sessoes').has('robo')) {
    d.exec('ALTER TABLE sessoes ADD COLUMN robo INTEGER NOT NULL DEFAULT 0');
    const marca = d.prepare('UPDATE sessoes SET robo = 1 WHERE id = ?');
    for (const r of d.prepare('SELECT id, user_agent, largura, altura FROM sessoes').all() as any[]) if (ehRobo(r.user_agent, r.largura, r.altura)) marca.run(r.id);
    // a visão antiga contava robôs
    d.exec(`DROP VIEW IF EXISTS v_funil_diario`);
    const sql = readFileSync(resolve(process.cwd(), 'schema.sql'), 'utf8').match(/CREATE VIEW IF NOT EXISTS v_funil_diario[\s\S]*?;/);
    if (sql) d.exec(sql[0]);
  }
  if (!cols('conteudos').has('capa')) d.exec('ALTER TABLE conteudos ADD COLUMN capa TEXT');
  if (!cols('conteudos').has('capa_alt')) d.exec('ALTER TABLE conteudos ADD COLUMN capa_alt TEXT');
  // Um lead por WhatsApp (o cadastro repetido só soma em "envios")
  try { d.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_whatsapp_unico ON leads(whatsapp)'); } catch (e) { console.error('[db] há WhatsApp duplicado; índice único não criado:', (e as Error).message); }
}

function seedLinks(d: Database.Database) {
  const ins = d.prepare(`INSERT OR IGNORE INTO links (slug, destino, utm_source, utm_medium, utm_campaign, utm_content, descricao)
    VALUES (@slug, @destino, @utm_source, @utm_medium, @utm_campaign, @utm_content, @descricao)`);
  const tx = d.transaction(() => {
    for (const l of LINKS) ins.run({ utm_content: null, ...l });
  });
  tx();
}

export type Lead = {
  id: number; nome: string; whatsapp: string; email: string | null;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_content: string | null; utm_term: string | null;
  fbclid: string | null; fbp: string | null; fbc: string | null;
  ip: string | null; user_agent: string | null; pagina: string | null; variante: string | null; referrer: string | null;
  consentimento: number; comprou: number; created_at: string; ultima_pagina_checkout: string | null;
};

export function insertLead(l: Omit<Lead, 'id' | 'created_at' | 'comprou'>): number {
  const r = db().prepare(`INSERT INTO leads (nome, whatsapp, email, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      fbclid, fbp, fbc, ip, user_agent, pagina, variante, referrer, consentimento)
    VALUES (@nome, @whatsapp, @email, @utm_source, @utm_medium, @utm_campaign, @utm_content, @utm_term,
      @fbclid, @fbp, @fbc, @ip, @user_agent, @pagina, @variante, @referrer, @consentimento)`).run(l);
  return Number(r.lastInsertRowid);
}

export function findLeadByContact(whatsapp?: string | null, email?: string | null): Lead | undefined {
  const d = db();
  if (whatsapp) {
    const r = d.prepare('SELECT * FROM leads WHERE whatsapp = ? ORDER BY id DESC LIMIT 1').get(whatsapp) as Lead | undefined;
    if (r) return r;
  }
  if (email) {
    return d.prepare('SELECT * FROM leads WHERE lower(email) = lower(?) ORDER BY id DESC LIMIT 1').get(email) as Lead | undefined;
  }
  return undefined;
}

export function insertEvento(ev: {
  lead_id?: number | null; tipo: string; valor?: number | null; event_id?: string | null; origem: 'browser' | 'server' | 'hubla';
  utm_source?: string | null; utm_campaign?: string | null; utm_content?: string | null; capi_status?: string | null; payload?: unknown;
}) {
  db().prepare(`INSERT INTO eventos (lead_id, tipo, valor, event_id, origem, utm_source, utm_campaign, utm_content, capi_status, payload)
    VALUES (@lead_id, @tipo, @valor, @event_id, @origem, @utm_source, @utm_campaign, @utm_content, @capi_status, @payload)`).run({
    lead_id: ev.lead_id ?? null, tipo: ev.tipo, valor: ev.valor ?? null, event_id: ev.event_id ?? null, origem: ev.origem,
    utm_source: ev.utm_source ?? null, utm_campaign: ev.utm_campaign ?? null, utm_content: ev.utm_content ?? null,
    capi_status: ev.capi_status ?? null, payload: ev.payload == null ? null : JSON.stringify(ev.payload).slice(0, 20000),
  });
}

export function eventoExiste(event_id: string): boolean {
  return !!db().prepare('SELECT 1 FROM eventos WHERE event_id = ? AND origem = ? LIMIT 1').get(event_id, 'hubla');
}
