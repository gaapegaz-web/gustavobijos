#!/usr/bin/env node
/**
 * Avisa o IndexNow (Bing, Yandex, Seznam, Naver) de todas as URLs do sitemap no ar, ou só das passadas.
 * Uso: node scripts/indexnow.mjs              → todas do https://gustavobijos.com.br/sitemap.xml
 *      node scripts/indexnow.mjs /tecnoapis /  → só essas
 *      --simular                               → só lista, não envia
 * Os artigos já avisam sozinhos pelo /admin (src/lib/indexnow.ts). Use isto quando mudar página fixa (home, /tecnoapis).
 * A chave vem de INDEXNOW_KEY no /srv/tecnoapis/.env.
 */
import { readFileSync } from 'node:fs';

const DOMINIO = 'https://gustavobijos.com.br';
const args = process.argv.slice(2);
const simular = args.includes('--simular');
const caminhos = args.filter((a) => !a.startsWith('--'));

const env = readFileSync(process.env.ENV_FILE || '/srv/tecnoapis/.env', 'utf8');
const key = (env.match(/^INDEXNOW_KEY=(.*)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
if (!key) { console.error('INDEXNOW_KEY vazio no .env'); process.exit(1); }

const confere = await fetch(`${DOMINIO}/indexnow.txt`).then((r) => r.text()).catch(() => '');
if (confere.trim() !== key) { console.error(`${DOMINIO}/indexnow.txt não devolve a chave do .env (o deploy já foi feito?)`); process.exit(1); }

let urlList = caminhos.map((p) => new URL(p, DOMINIO).toString());
if (!urlList.length) {
  const xml = await fetch(`${DOMINIO}/sitemap.xml`).then((r) => r.text());
  urlList = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
}
console.log(urlList.join('\n'));
if (simular) process.exit(0);

const r = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(DOMINIO).host, key, keyLocation: `${DOMINIO}/indexnow.txt`, urlList }),
});
// 200 = aceito; 202 = aceito, chave ainda em validação; 403 = chave não confere; 422 = URL fora do domínio; 429 = muitos envios
console.log(`IndexNow: HTTP ${r.status} (${urlList.length} URLs)`);
process.exit(r.status < 300 ? 0 : 1);
