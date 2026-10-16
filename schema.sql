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
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
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

-- ============================================================
-- Comportamento na página (analytics próprio, first-party)
-- Uma linha por sessão (visita) e uma linha por ação dentro dela.
-- Guia de análise: ANALISE.md
-- ============================================================
CREATE TABLE IF NOT EXISTS sessoes (
  id TEXT PRIMARY KEY,               -- ta_sid (cookie, expira após 30 min sem atividade)
  visitante_id TEXT NOT NULL,        -- ta_vid (cookie de 400 dias): mesma pessoa em visitas diferentes
  primeira_pagina TEXT,
  referrer TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
  tem_fbclid INTEGER NOT NULL DEFAULT 0,
  dispositivo TEXT,                  -- celular | tablet | computador
  largura INTEGER, altura INTEGER,
  user_agent TEXT,
  ip TEXT,                           -- junta a mesma pessoa quando o cookie muda (aba anônima, cookie apagado)
  robo INTEGER NOT NULL DEFAULT 0,   -- 1 = robô/teste automático (ver ehRobo em lib/tracking.ts); fica fora do painel
  paginas INTEGER NOT NULL DEFAULT 0,
  tempo_ativo_s INTEGER NOT NULL DEFAULT 0,   -- segundos com a aba visível e a pessoa interagindo
  scroll_max INTEGER NOT NULL DEFAULT 0,      -- maior % rolado em qualquer página da sessão
  abriu_form INTEGER NOT NULL DEFAULT 0,
  iniciou_form INTEGER NOT NULL DEFAULT 0,
  lead_id INTEGER REFERENCES leads(id),
  clicou_grupo INTEGER NOT NULL DEFAULT 0,
  clicou_checkout INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_sessoes_created ON sessoes(created_at);
CREATE INDEX IF NOT EXISTS idx_sessoes_visitante ON sessoes(visitante_id);

CREATE TABLE IF NOT EXISTS comportamento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sessao_id TEXT NOT NULL REFERENCES sessoes(id),
  pagina TEXT,                       -- caminho, ex: /black
  tipo TEXT NOT NULL,                -- ver ANALISE.md: pagina, scroll, secao_vista, secao_tempo, clique, popup_aberto, popup_fechado, form_inicio, form_campo, form_erro, form_envio, tempo_ativo, saida
  alvo TEXT,                         -- seção, botão ou campo
  valor INTEGER,                     -- %, segundos ou ms conforme o tipo
  t_ms INTEGER,                      -- ms desde que a página abriu
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_comp_sessao ON comportamento(sessao_id);
CREATE INDEX IF NOT EXISTS idx_comp_tipo ON comportamento(tipo, alvo);
CREATE INDEX IF NOT EXISTS idx_comp_created ON comportamento(created_at);

-- Visões prontas para análise (horário de Brasília)
CREATE VIEW IF NOT EXISTS v_funil_diario AS
SELECT date(created_at, '-3 hours') AS dia,
  count(*) AS sessoes,
  count(DISTINCT visitante_id) AS visitantes,
  sum(scroll_max >= 50) AS rolou_50,
  sum(abriu_form) AS abriu_form,
  sum(iniciou_form) AS iniciou_form,
  sum(lead_id IS NOT NULL) AS leads,
  sum(clicou_grupo) AS clicou_grupo,
  sum(clicou_checkout) AS clicou_checkout,
  round(avg(tempo_ativo_s), 1) AS tempo_ativo_medio_s
FROM sessoes WHERE robo = 0 GROUP BY dia ORDER BY dia DESC;

CREATE VIEW IF NOT EXISTS v_funil_origem AS
SELECT coalesce(utm_source, CASE WHEN referrer IS NOT NULL THEN 'referencia' ELSE '(direto)' END) AS origem,
  coalesce(utm_medium, '') AS midia, coalesce(utm_content, '') AS conteudo,
  count(*) AS sessoes, sum(abriu_form) AS abriu_form, sum(lead_id IS NOT NULL) AS leads,
  round(100.0 * sum(lead_id IS NOT NULL) / count(*), 1) AS conv_pct,
  round(avg(tempo_ativo_s), 1) AS tempo_ativo_medio_s, round(avg(scroll_max), 0) AS scroll_medio
FROM sessoes GROUP BY origem, midia, conteudo ORDER BY sessoes DESC;

CREATE VIEW IF NOT EXISTS v_secoes AS
SELECT c.pagina, c.alvo AS secao,
  count(DISTINCT c.sessao_id) AS sessoes_que_viram,
  round(100.0 * count(DISTINCT c.sessao_id) / (SELECT count(DISTINCT sessao_id) FROM comportamento p WHERE p.tipo = 'pagina' AND p.pagina = c.pagina), 1) AS alcance_pct,
  (SELECT round(avg(soma) / 1000.0, 1) FROM (SELECT sum(valor) AS soma FROM comportamento t WHERE t.tipo = 'secao_tempo' AND t.alvo = c.alvo AND t.pagina = c.pagina GROUP BY t.sessao_id)) AS tempo_medio_s
FROM comportamento c WHERE c.tipo = 'secao_vista' GROUP BY c.pagina, c.alvo;

CREATE VIEW IF NOT EXISTS v_cliques AS
SELECT pagina, alvo, count(*) AS cliques, count(DISTINCT sessao_id) AS sessoes
FROM comportamento WHERE tipo = 'clique' GROUP BY pagina, alvo ORDER BY cliques DESC;

-- Conteúdos (/conteudos): artigos com ou sem vídeo do YouTube, editados no /admin/conteudos
CREATE TABLE IF NOT EXISTS conteudos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,             -- endereço: /conteudos/<slug>
  titulo TEXT NOT NULL,
  resumo TEXT NOT NULL DEFAULT '',       -- vira a descrição no Google e o texto do card
  tema TEXT,                             -- slug de TEMAS_CONTEUDO (src/config/conteudos.ts)
  video_url TEXT,                        -- link do YouTube (opcional; sem ele a página é só texto)
  capa TEXT,                             -- imagem de capa: caminho-base em /uploads (ver lib/upload.ts); sem ela, miniatura do YouTube ou capa desenhada
  capa_alt TEXT,                         -- descrição da capa (acessibilidade e Google Imagens)
  corpo TEXT NOT NULL DEFAULT '',        -- Markdown
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado')),
  origem TEXT,                           -- arquivo do cérebro de onde veio (importação)
  publicado_em TEXT,                     -- primeira publicação; não muda ao editar
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  atualizado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_conteudos_publicados ON conteudos(status, publicado_em);
