/**
 * Peças comuns das abas do /admin: período escolhido (?dias=), formatação e o status da Meta.
 * O painel vale para o site inteiro (home, /tecnoapis, campanhas, conteúdos), não para uma campanha só.
 */
import { db } from '~/lib/db';
import { ENV } from '~/lib/env';
import { fmtDataHora } from '~/lib/texto';
import { PERIODOS, diasDoPeriodo } from '~/lib/periodo';

export { PERIODOS };

/** Lê ?dias= e devolve o período e as consultas já presas a ele (o 1º parâmetro do SQL é sempre o início do período). */
export function periodo(url: URL) {
  const dias = diasDoPeriodo(url);
  const desde = `-${dias} days`;
  const d = db();
  return {
    dias, desde,
    desdeAnterior: `-${dias * 2} days`,
    temAnterior: dias !== 3650,
    rotulo: dias === 3650 ? 'desde o início' : dias === 1 ? 'últimas 24 h' : `últimos ${dias} dias`,
    rotuloAnterior: dias === 1 ? '24 h anteriores' : `${dias} dias anteriores`,
    q: <T = any>(sql: string, ...p: unknown[]) => d.prepare(sql).all(desde, ...p) as T[],
    q1: <T = any>(sql: string, ...p: unknown[]) => d.prepare(sql).get(desde, ...p) as T,
  };
}

/** Filtro de sessão humana: robôs ficam fora de todas as contas. */
export const HUMANO = (a = 'sessao_id') => `${a} NOT IN (SELECT id FROM sessoes WHERE robo = 1)`;
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
export const seg = (s: number | null) => (s == null ? '' : s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`);
export const num = (n: number) => new Intl.NumberFormat('pt-BR').format(n ?? 0);
export const dt = (x: string) => fmtDataHora(new Date(x));
export const geradoEm = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
export const NOME_DISP: Record<string, string> = { celular: 'Celular', computador: 'Computador', tablet: 'Tablet', '?': 'Não identificado' };
/** +5567999999999 → (67) 99999-9999; outro formato fica como veio. */
export const fone = (n: string) => { const m = n?.match(/^\+55(\d{2})(\d{4,5})(\d{4})$/); return m ? `(${m[1]}) ${m[2]}-${m[3]}` : n; };
/** Rótulo de uma página do site: "/" vira "Home"; o resto fica com o caminho. */
export const nomePagina = (p: string | null) => (!p ? '—' : p === '/' ? 'Home' : p);

/** Configuração da Meta e o que está quebrado (pixel, CAPI, webhooks da Hubla). */
export function statusMeta(desde: string) {
  const d = db();
  const meta = {
    pixel: !!ENV.META_PIXEL_ID, token: !!ENV.META_CAPI_TOKEN, teste: !!ENV.META_TEST_EVENT_CODE,
    ...(d.prepare(`SELECT sum(capi_status='ok') ok, sum(capi_status LIKE 'erro%') erro, sum(capi_status='pulado') pulado FROM eventos WHERE created_at >= datetime('now', ?)`).get(desde) as any),
  };
  const webhooksErro = d.prepare('SELECT * FROM webhooks WHERE processado = 0 ORDER BY id DESC LIMIT 10').all() as any[];
  const comprasSemValor = (d.prepare("SELECT count(*) n FROM eventos WHERE tipo='Purchase' AND capi_status LIKE 'pulado: sem valor%' AND created_at >= datetime('now','-30 days')").get() as any).n;
  const alertas: string[] = [];
  if (!meta.pixel || !meta.token) alertas.push(`A Meta não está recebendo eventos. Falta ${[!meta.pixel && 'META_PIXEL_ID', !meta.token && 'META_CAPI_TOKEN'].filter(Boolean).join(' e ')} no arquivo /srv/tecnoapis/.env.`);
  if ((meta.erro ?? 0) > 0) alertas.push(`${meta.erro} eventos com erro na Conversions API. Veja a aba Meta.`);
  if (comprasSemValor > 0) alertas.push(`${comprasSemValor} compra(s) da Hubla chegaram sem valor e NÃO foram enviadas à Meta (a Meta recusa Purchase sem valor). Provável mudança no formato do webhook da Hubla: o payload bruto está na tabela webhooks.`);
  if (webhooksErro.length > 0) alertas.push(`${webhooksErro.length} webhooks da Hubla com erro (último: ${webhooksErro[0].erro}).`);
  return { meta, webhooksErro, alertas };
}
