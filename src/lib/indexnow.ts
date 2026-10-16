import { SITE } from '~/config/site';
import { ENV } from '~/lib/env';

/**
 * IndexNow (indexnow.org): avisa Bing, Yandex, Seznam e Naver que uma URL mudou, sem esperar o robô passar.
 * O Bing alimenta a busca do ChatGPT e do Copilot. O Google não usa IndexNow (lá vale o sitemap).
 * A chave fica em INDEXNOW_KEY (.env) e é publicada em /indexnow.txt (src/pages/indexnow.txt.ts).
 * Sem chave (testes, cópias em outra porta) não manda nada. Nunca trava nem derruba quem chamou.
 */
export const INDEXNOW_ARQUIVO = '/indexnow.txt';

export function avisarIndexNow(caminhos: string[]) {
  const key = ENV.INDEXNOW_KEY;
  if (!key) return;
  const host = new URL(SITE.dominio).host;
  const urlList = [...new Set(caminhos.map((p) => new URL(p, SITE.dominio).toString()))];
  if (!urlList.length) return;
  fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation: new URL(INDEXNOW_ARQUIVO, SITE.dominio).toString(), urlList }),
    signal: AbortSignal.timeout(10_000),
  })
    .then((r) => { if (r.status >= 300) console.warn(`[indexnow] HTTP ${r.status} para ${urlList.join(', ')}`); })
    .catch((e) => console.warn('[indexnow] falhou:', e?.message ?? e));
}
