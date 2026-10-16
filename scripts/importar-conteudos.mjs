#!/usr/bin/env node
/**
 * Importa artigos em Markdown para a tabela `conteudos` como RASCUNHO (a publicação é sempre no /admin/conteudos).
 *
 *   node scripts/importar-conteudos.mjs /srv/tecnoapis/conteudos-rascunhos            # pasta inteira
 *   node scripts/importar-conteudos.mjs arquivo.md outro.md --simular                 # só mostra o que faria
 *
 * Cada arquivo começa com um cabeçalho:
 *   ---
 *   titulo: Como multiplicar enxames
 *   slug: como-multiplicar-enxames        (opcional; sem ele, vem do título)
 *   resumo: Uma ou duas frases para o Google e o card.
 *   tema: multiplicacao                   (slug de src/config/conteudos.ts)
 *   video: https://youtu.be/...           (opcional)
 *   origem: Cérebro 2                      (opcional; de onde veio o texto)
 *   ---
 * Mesmo endereço já existente: rascunho é atualizado; publicado NUNCA é sobrescrito (edite pelo admin).
 */
import Database from 'better-sqlite3';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const args = process.argv.slice(2);
const simular = args.includes('--simular');
const alvos = args.filter((a) => !a.startsWith('--'));
if (!alvos.length) { console.error('Uso: node scripts/importar-conteudos.mjs <pasta|arquivo.md...> [--simular]'); process.exit(1); }

const TEMAS = ['comecando', 'multiplicacao', 'rainhas', 'manejo', 'produtos', 'gestao'];
const slugify = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');

const arquivos = alvos.flatMap((a) => (statSync(a).isDirectory() ? readdirSync(a).filter((f) => f.endsWith('.md')).sort().map((f) => join(a, f)) : [a]));
const db = new Database(process.env.DB_PATH || '/srv/tecnoapis/data/app.db', { fileMustExist: true });
db.pragma('busy_timeout = 5000');

let novos = 0, atualizados = 0, pulados = 0;
for (const arq of arquivos) {
  const txt = readFileSync(arq, 'utf8').replace(/\r\n/g, '\n');
  const m = txt.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) { console.log(`PULADO  ${basename(arq)}: sem cabeçalho ---`); pulados++; continue; }
  const cab = Object.fromEntries(m[1].split('\n').map((l) => l.match(/^(\w+):\s*(.*)$/)).filter(Boolean).map(([, k, v]) => [k, v.trim()]));
  const corpo = txt.slice(m[0].length).trim();
  const titulo = cab.titulo;
  const slug = cab.slug || slugify(titulo || '');
  if (!titulo || !slug) { console.log(`PULADO  ${basename(arq)}: falta titulo`); pulados++; continue; }
  if (cab.tema && !TEMAS.includes(cab.tema)) console.log(`AVISO   ${basename(arq)}: tema "${cab.tema}" não existe; vai sem tema`);
  const d = { slug, titulo, resumo: cab.resumo || '', tema: TEMAS.includes(cab.tema) ? cab.tema : null, video_url: cab.video || null, corpo, origem: cab.origem || basename(arq) };

  const atual = db.prepare('SELECT id, status FROM conteudos WHERE slug = ?').get(slug);
  if (atual?.status === 'publicado') { console.log(`PULADO  /conteudos/${slug}: já publicado (edite pelo admin)`); pulados++; continue; }
  if (atual) {
    if (!simular) db.prepare(`UPDATE conteudos SET titulo=@titulo, resumo=@resumo, tema=@tema, video_url=@video_url, corpo=@corpo, origem=@origem, atualizado_em=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=@id`).run({ ...d, id: atual.id });
    console.log(`ATUALIZ /conteudos/${slug} (rascunho ${atual.id})`); atualizados++;
  } else {
    if (!simular) db.prepare(`INSERT INTO conteudos (slug, titulo, resumo, tema, video_url, corpo, origem) VALUES (@slug, @titulo, @resumo, @tema, @video_url, @corpo, @origem)`).run(d);
    console.log(`NOVO    /conteudos/${slug}`); novos++;
  }
}
console.log(`\n${simular ? '[simulação] ' : ''}${novos} novos, ${atualizados} atualizados, ${pulados} pulados. Revise e publique em /admin/conteudos.`);
