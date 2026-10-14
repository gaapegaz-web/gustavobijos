#!/usr/bin/env node
/**
 * Relatório de comportamento e funil, direto do banco. Uso:
 *   node scripts/analise.mjs            # últimos 30 dias
 *   node scripts/analise.mjs 7          # últimos 7 dias
 *   node scripts/analise.mjs 7 --json   # mesmo relatório em JSON (para análise automática)
 * Somente leitura. Guia das tabelas: ANALISE.md
 */
import Database from 'better-sqlite3';
const dias = Number(process.argv[2]) || 30;
const json = process.argv.includes('--json');
const db = new Database(process.env.DB_PATH || '/srv/tecnoapis/data/app.db', { readonly: true, fileMustExist: true });
const desde = `-${dias} days`;
const all = (sql, ...p) => db.prepare(sql).all(desde, ...p);
const one = (sql, ...p) => db.prepare(sql).get(desde, ...p);

const r = {
  periodo_dias: dias,
  gerado_em: new Date().toISOString(),
  funil: one(`SELECT count(*) visitas, count(DISTINCT visitante_id) pessoas, sum(scroll_max>=50) rolaram_50, sum(abriu_form) abriram_form,
    sum(iniciou_form) comecaram_form, sum(lead_id IS NOT NULL) leads, sum(clicou_grupo) clicaram_grupo, sum(clicou_checkout) clicaram_checkout,
    round(avg(tempo_ativo_s),1) tempo_ativo_medio_s, round(avg(scroll_max)) rolagem_media FROM sessoes WHERE created_at >= datetime('now', ?)`),
  rolagem: all(`SELECT valor marco_pct, count(DISTINCT sessao_id) visitas FROM comportamento WHERE tipo='scroll' AND created_at >= datetime('now', ?) GROUP BY valor ORDER BY valor`),
  secoes: all(`SELECT pagina, alvo secao, count(DISTINCT sessao_id) visitas FROM comportamento WHERE tipo='secao_vista' AND created_at >= datetime('now', ?) GROUP BY pagina, alvo ORDER BY pagina, alvo`),
  tempo_por_secao_s: all(`SELECT pagina, alvo secao, round(avg(soma)/1000.0,1) media_s FROM (SELECT pagina, alvo, sessao_id, sum(valor) soma FROM comportamento WHERE tipo='secao_tempo' AND created_at >= datetime('now', ?) GROUP BY pagina, alvo, sessao_id) GROUP BY pagina, alvo ORDER BY pagina, alvo`),
  cliques: all(`SELECT pagina, alvo, count(*) cliques, count(DISTINCT sessao_id) visitas FROM comportamento WHERE tipo='clique' AND created_at >= datetime('now', ?) GROUP BY pagina, alvo ORDER BY cliques DESC LIMIT 30`),
  erros_form: all(`SELECT alvo campo, count(*) n FROM comportamento WHERE tipo='form_erro' AND created_at >= datetime('now', ?) GROUP BY alvo ORDER BY n DESC`),
  origem: all(`SELECT coalesce(utm_source,'(direto)') fonte, coalesce(utm_medium,'') midia, coalesce(utm_content,'') conteudo, count(*) visitas, sum(abriu_form) abriram_form,
    sum(lead_id IS NOT NULL) leads, round(100.0*sum(lead_id IS NOT NULL)/count(*),1) conv_pct, round(avg(tempo_ativo_s),1) tempo_ativo_s, round(avg(scroll_max)) rolagem
    FROM sessoes WHERE created_at >= datetime('now', ?) GROUP BY fonte, midia, conteudo ORDER BY visitas DESC`),
  dispositivo: all(`SELECT coalesce(dispositivo,'?') dispositivo, count(*) visitas, sum(lead_id IS NOT NULL) leads, round(avg(tempo_ativo_s),1) tempo_ativo_s FROM sessoes WHERE created_at >= datetime('now', ?) GROUP BY 1 ORDER BY visitas DESC`),
  por_dia: all(`SELECT date(created_at,'-3 hours') dia, count(*) visitas, sum(abriu_form) abriram_form, sum(lead_id IS NOT NULL) leads, sum(clicou_grupo) grupo FROM sessoes WHERE created_at >= datetime('now', ?) GROUP BY dia ORDER BY dia`),
  meta: all(`SELECT tipo evento, capi_status, count(*) n FROM eventos WHERE created_at >= datetime('now', ?) GROUP BY tipo, capi_status ORDER BY tipo`),
};

if (json) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
const t = (titulo, linhas) => { console.log(`\n## ${titulo}`); if (!linhas || (Array.isArray(linhas) && !linhas.length)) console.log('(sem dados)'); else console.table(linhas); };
console.log(`# Relatório Tecnoapis: últimos ${dias} dias (${r.gerado_em})`);
t('Funil', [r.funil]); t('Rolagem', r.rolagem); t('Seções vistas', r.secoes); t('Tempo por seção (s)', r.tempo_por_secao_s);
t('Cliques', r.cliques); t('Erros no formulário', r.erros_form); t('Origem', r.origem); t('Dispositivo', r.dispositivo); t('Por dia', r.por_dia); t('Eventos Meta', r.meta);
