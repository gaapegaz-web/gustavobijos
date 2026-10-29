/**
 * Ficha do lead (/admin/leads/<id>): todas as visitas da pessoa, o que ela fez em cada uma e os eventos da Meta e da Hubla.
 * Junta as visitas pelo cookie de visitante (ta_vid, 400 dias) e pela visita do cadastro. Mesmo IP + mesmo navegador
 * com outro cookie (aba anônima, navegador do Instagram x Chrome) entra como visita "provável".
 */
import { db, type Lead } from '~/lib/db';

export type Acao = { quando: number; pagina: string | null; tipo: string; alvo: string | null; valor: number | null };
export type Evento = { quando: number; tipo: string; origem: string; valor: number | null; capi_status: string | null; event_id: string | null; pagina: string | null; sessao_id: string | null };
export type Item = { quando: number; tipo: 'acao'; a: Acao } | { quando: number; tipo: 'evento'; e: Evento } | { quando: number; tipo: 'cadastro'; envio: number };
export type Visita = Record<string, any> & {
  provavel: boolean; cadastrou: boolean; inicio: number; fim: number;
  itens: Item[]; secoes: { pagina: string; secao: string; ms: number }[]; paginasVistas: string[];
};

const ms = (x: string) => Date.parse(x.endsWith('Z') ? x : `${x.replace(' ', 'T')}Z`);

export function fichaLead(id: number) {
  const d = db();
  const lead = d.prepare('SELECT * FROM leads WHERE id = ?').get(id) as (Lead & Record<string, any>) | undefined;
  if (!lead) return null;

  const certas = d.prepare(`SELECT * FROM sessoes WHERE robo = 0 AND (id = ? OR (? IS NOT NULL AND visitante_id = ?) OR lead_id = ?)`)
    .all(lead.sessao_id, lead.visitante_id, lead.visitante_id, id) as any[];
  const ids = new Set(certas.map((s) => s.id));
  // Prováveis: mesmo IP e mesmo navegador (user agent inteiro, com a versão do app). Fica de fora o cookie que já é de outro lead (a esposa no mesmo celular).
  const pares = new Map<string, [string, string]>();
  for (const s of [lead, ...certas]) if (s.ip && s.user_agent) pares.set(`${s.ip}|${s.user_agent}`, [s.ip, s.user_agent]);
  const provaveis: any[] = [];
  for (const [ip, ua] of pares.values()) {
    for (const s of d.prepare(`SELECT * FROM sessoes s WHERE robo = 0 AND ip = ? AND user_agent = ? AND (lead_id IS NULL OR lead_id = ?)
      AND NOT EXISTS (SELECT 1 FROM leads o WHERE o.visitante_id = s.visitante_id AND o.id != ?)`).all(ip, ua, id, id) as any[]) {
      if (!ids.has(s.id)) { ids.add(s.id); provaveis.push(s); }
    }
  }

  const lista = JSON.stringify([...ids]);
  const acoes = d.prepare(`SELECT sessao_id, pagina, tipo, alvo, valor, t_ms, created_at FROM comportamento WHERE sessao_id IN (SELECT value FROM json_each(?)) ORDER BY id`).all(lista) as any[];
  const eventos = (d.prepare(`SELECT tipo, origem, valor, capi_status, event_id, pagina, sessao_id, created_at FROM eventos
    WHERE lead_id = ? OR sessao_id IN (SELECT value FROM json_each(?)) ORDER BY id`).all(id, lista) as any[])
    .map((e): Evento => ({ ...e, quando: ms(e.created_at) }));

  // O navegador manda as ações em lotes: o horário de cada uma é a chegada do lote menos o quanto ela veio antes da última do lote.
  const fimLote = new Map<string, number>();
  for (const a of acoes) fimLote.set(a.sessao_id + a.created_at, Math.max(fimLote.get(a.sessao_id + a.created_at) ?? 0, a.t_ms ?? 0));

  const visitas: Visita[] = [...certas.map((s) => ({ ...s, provavel: false })), ...provaveis.map((s) => ({ ...s, provavel: true }))]
    .map((s) => ({ ...s, cadastrou: s.id === lead.sessao_id, inicio: ms(s.created_at), fim: ms(s.atualizado_em), itens: [] as Item[], secoes: [], paginasVistas: [] }))
    .sort((a, b) => a.inicio - b.inicio);
  const porId = new Map(visitas.map((v) => [v.id, v]));

  for (const a of acoes) {
    const v = porId.get(a.sessao_id)!;
    if (a.tipo === 'secao_tempo') {
      const s = v.secoes.find((x) => x.pagina === a.pagina && x.secao === a.alvo);
      if (s) s.ms += a.valor ?? 0; else v.secoes.push({ pagina: a.pagina, secao: a.alvo, ms: a.valor ?? 0 });
      continue;
    }
    if (a.tipo === 'tempo_ativo') continue;
    if (a.tipo === 'pagina' && !v.paginasVistas.includes(a.pagina)) v.paginasVistas.push(a.pagina);
    const quando = ms(a.created_at) - (a.t_ms == null ? 0 : fimLote.get(a.sessao_id + a.created_at)! - a.t_ms);
    v.itens.push({ quando, tipo: 'acao', a: { quando, pagina: a.pagina, tipo: a.tipo, alvo: a.alvo, valor: a.valor } });
  }

  // Evento sem sessao_id (gravado antes de existir a coluna, ou da Hubla): entra na visita aberta naquele horário.
  const fora: Evento[] = [];
  for (const e of eventos) {
    const v = (e.sessao_id && porId.get(e.sessao_id)) || (e.origem !== 'hubla' ? visitas.find((x) => e.quando >= x.inicio - 60_000 && e.quando <= x.fim + 300_000) : undefined);
    if (v) v.itens.push({ quando: e.quando, tipo: 'evento', e }); else fora.push(e);
  }
  const cad = porId.get(lead.sessao_id);
  if (cad) cad.itens.push({ quando: ms(lead.created_at), tipo: 'cadastro', envio: 1 });
  if (lead.envios > 1 && lead.ultimo_envio_em) {
    const t = ms(lead.ultimo_envio_em);
    const v = visitas.find((x) => t >= x.inicio - 60_000 && t <= x.fim + 300_000);
    if (v) v.itens.push({ quando: t, tipo: 'cadastro', envio: lead.envios });
  }
  for (const v of visitas) v.itens.sort((a, b) => a.quando - b.quando);

  const iCad = visitas.findIndex((v) => v.cadastrou);
  const anuncios = new Map<string, { fonte: string; campanha: string; conjunto: string; anuncio: string; visitas: number }>();
  for (const v of visitas) {
    if (!v.utm_content && !v.utm_campaign) continue;
    const k = [v.utm_source, v.utm_campaign, v.utm_term, v.utm_content].join('|');
    const a = anuncios.get(k) ?? { fonte: v.utm_source ?? '', campanha: v.utm_campaign ?? '', conjunto: v.utm_term ?? '', anuncio: v.utm_content ?? '', visitas: 0 };
    a.visitas++; anuncios.set(k, a);
  }
  const outros = lead.visitante_id
    ? d.prepare('SELECT id, nome, whatsapp, created_at FROM leads WHERE visitante_id = ? AND id != ? ORDER BY id').all(lead.visitante_id, id) as any[]
    : [];

  return {
    lead, visitas, fora, outros, anuncios: [...anuncios.values()],
    resumo: {
      visitas: visitas.length,
      antes: iCad > 0 ? iCad : 0,
      depois: iCad >= 0 ? visitas.length - iCad - 1 : 0,
      nVisitaCadastro: iCad + 1,
      ateCadastro: visitas.length ? ms(lead.created_at) - visitas[0].inicio : 0,
      tempoAtivo: visitas.reduce((n, v) => n + (v.tempo_ativo_s ?? 0), 0),
      scroll: Math.max(0, ...visitas.map((v) => v.scroll_max ?? 0)),
      paginas: [...new Set(visitas.flatMap((v) => v.paginasVistas))],
      grupo: visitas.some((v) => v.clicou_grupo) || eventos.some((e) => e.tipo === 'Schedule'),
      checkout: visitas.some((v) => v.clicou_checkout) || eventos.some((e) => e.tipo === 'InitiateCheckout'),
    },
  };
}

/** De onde a visita veio, pelo referrer: o site anterior. App do WhatsApp e link digitado chegam sem referrer. */
export function veioDe(ref: string | null) {
  if (!ref) return 'Direto (app, link copiado ou digitado)';
  try {
    const h = new URL(ref).hostname.replace(/^(www|m|l|lm)\./, '');
    if (h.includes('facebook')) return 'Facebook';
    if (h.includes('instagram')) return 'Instagram';
    if (h.includes('threads')) return 'Threads';
    if (h.includes('google')) return 'Google';
    if (h.includes('bing')) return 'Bing';
    if (h.includes('youtube')) return 'YouTube';
    if (h.includes('whatsapp')) return 'WhatsApp';
    if (h.includes('gustavobijos')) return 'O próprio site';
    return h;
  } catch { return ref; }
}

/** Navegador e aparelho em palavras, a partir do user agent. */
export function navegador(ua: string | null) {
  if (!ua) return '—';
  const app = /Instagram/.test(ua) ? 'navegador do Instagram' : /FB_IAB|FBAN|FBAV/.test(ua) ? 'navegador do Facebook' : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
    : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'outro navegador';
  const so = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : (ua.match(/Android [\d.]+/) || [])[0] ?? (/Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : '');
  const modelo = (ua.match(/Android [\d.]+; ([^;)]+?)(?: Build|\))/) || [])[1];
  return [app, so, modelo].filter(Boolean).join(' · ');
}

const secao = (s: string) => s.replace(/^(\d+)-/, '$1 · ').replace(/-/g, ' ');
export const nomeSecao = secao;
const CAMPO: Record<string, string> = { nome: 'nome', whatsapp: 'WhatsApp', email: 'e-mail', geral: 'formulário' };

/** Texto de uma ação da visita. tom: ok (avançou), warn (travou), acc (formulário), '' (navegação). */
export function textoAcao(a: Acao): { texto: string; tom: string } {
  const v = a.valor, alvo = a.alvo ?? '';
  switch (a.tipo) {
    case 'pagina': return { texto: alvo === 'nova_sessao' ? `Chegou em ${a.pagina}` : `Foi para ${a.pagina}`, tom: '' };
    case 'scroll': return { texto: `Rolou ${v}% da página`, tom: '' };
    case 'secao_vista': return { texto: `Viu: ${secao(alvo)}`, tom: '' };
    case 'saida': return { texto: `Saiu de ${a.pagina} (rolou ${v ?? 0}%)`, tom: '' };
    case 'popup_aberto': return { texto: 'Abriu o formulário', tom: 'acc' };
    case 'popup_fechado': return { texto: `Fechou o formulário sem enviar${v ? ` (ficou ${v} s aberto)` : ''}`, tom: 'warn' };
    case 'form_inicio': return { texto: `Começou a preencher (${CAMPO[alvo] ?? alvo})`, tom: 'acc' };
    case 'form_campo': return { texto: `Preencheu ${CAMPO[alvo] ?? alvo}`, tom: 'acc' };
    case 'form_erro': return { texto: `Erro no ${CAMPO[alvo] ?? alvo}: o formulário não aceitou`, tom: 'warn' };
    case 'form_envio': return { texto: 'Enviou o formulário', tom: 'ok' };
    case 'clique': {
      if (alvo === 'form:enviar') return { texto: 'Clicou em enviar', tom: 'acc' };
      if (alvo.startsWith('form:')) return { texto: `Clicou no botão de inscrição (${alvo.slice(5)})`, tom: 'acc' };
      if (alvo.startsWith('grupo')) return { texto: 'Clicou para entrar no grupo do WhatsApp', tom: 'ok' };
      if (alvo.startsWith('checkout')) return { texto: `Clicou para ir ao checkout${alvo.includes(':') ? ` (${alvo.split(':')[1]})` : ''}`, tom: 'ok' };
      const [txt, sec] = alvo.split(' @');
      return { texto: `Clicou em “${txt}”${sec ? ` · ${secao(sec)}` : ''}`, tom: '' };
    }
    default: return { texto: `${a.tipo}${alvo ? ` · ${alvo}` : ''}`, tom: '' };
  }
}

const NOME_EVENTO: Record<string, string> = {
  Lead: 'Lead', Schedule: 'Schedule (clicou no grupo)', AbriuFormulario: 'AbriuFormulario', Contact: 'Contact (WhatsApp de suporte)',
  InitiateCheckout: 'InitiateCheckout (foi ao checkout)', ViewContent: 'ViewContent', Purchase: 'Compra aprovada', Abandono: 'Abandonou o checkout', Reembolso: 'Reembolso',
};
export const nomeEvento = (t: string) => NOME_EVENTO[t] ?? t;
export const ORIGEM_EVENTO: Record<string, string> = { browser: 'Pixel + CAPI', server: 'CAPI', hubla: 'Hubla' };
/** Situação do envio à Meta: ok, erro ou não enviado. */
export function statusCapi(s: string | null): { texto: string; tom: string } | null {
  if (!s) return null;
  if (s === 'ok') return { texto: 'Meta recebeu', tom: 'ok' };
  if (s.startsWith('erro')) return { texto: 'erro na Meta', tom: 'err' };
  return { texto: 'não foi à Meta', tom: '' };
}

/** 3 dias e 4 h · 2 h 10 min · 12 min · 40 s */
export function duracao(msTotal: number) {
  const s = Math.max(0, Math.round(msTotal / 1000));
  const dd = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (dd) return `${dd} ${dd === 1 ? 'dia' : 'dias'}${h ? ` e ${h} h` : ''}`;
  if (h) return `${h} h${m ? ` ${m} min` : ''}`;
  if (m) return `${m} min`;
  return `${s} s`;
}
export const hora = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
