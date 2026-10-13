CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,            -- E.164, ex: +5567999999999
  email TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
  fbclid TEXT, fbp TEXT, fbc TEXT,
  ip TEXT, user_agent TEXT,
  pagina TEXT, variante TEXT, referrer TEXT,
  consentimento INTEGER NOT NULL DEFAULT 1,
  comprou INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp ON leads(whatsapp);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER REFERENCES leads(id),
  tipo TEXT NOT NULL,                -- PageView, ViewContent, Lead, InitiateCheckout, Purchase, Abandono, Reembolso
  valor REAL,
  event_id TEXT,
  origem TEXT NOT NULL,              -- browser | server | hubla
  utm_source TEXT, utm_campaign TEXT, utm_content TEXT,
  capi_status TEXT,                  -- ok | erro | pulado
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_eventos_event_id ON eventos(event_id);
CREATE INDEX IF NOT EXISTS idx_eventos_created ON eventos(created_at);

CREATE TABLE IF NOT EXISTS links (
  slug TEXT PRIMARY KEY,
  destino TEXT NOT NULL,             -- caminho interno ou URL completa
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT,
  descricao TEXT,
  cliques INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fonte TEXT NOT NULL,
  tipo TEXT,
  processado INTEGER NOT NULL DEFAULT 0,
  erro TEXT,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
