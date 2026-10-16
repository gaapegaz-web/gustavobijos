/** Conteúdos (/conteudos): leitura do banco, Markdown e YouTube. A edição fica no /admin/conteudos. */
import { marked } from 'marked';
import { db } from './db';

export type Conteudo = {
  id: number; slug: string; titulo: string; resumo: string; tema: string | null; video_url: string | null; capa: string | null; capa_alt: string | null;
  corpo: string; status: 'rascunho' | 'publicado'; origem: string | null; publicado_em: string | null;
  created_at: string; atualizado_em: string;
};

const PUBLICADO = `status = 'publicado'`;
const ORDEM = 'ORDER BY publicado_em DESC, id DESC';

export const publicados = () => db().prepare(`SELECT * FROM conteudos WHERE ${PUBLICADO} ${ORDEM}`).all() as Conteudo[];
export const recentes = (n: number) => db().prepare(`SELECT * FROM conteudos WHERE ${PUBLICADO} ${ORDEM} LIMIT ?`).all(n) as Conteudo[];
export const porSlug = (slug: string) => db().prepare('SELECT * FROM conteudos WHERE slug = ?').get(slug) as Conteudo | undefined;
export const porId = (id: number) => db().prepare('SELECT * FROM conteudos WHERE id = ?').get(id) as Conteudo | undefined;

/** Até `n` publicados do mesmo tema (depois os mais recentes de outros temas), sem o próprio. */
export function relacionados(c: Conteudo, n = 3) {
  return db().prepare(`SELECT * FROM conteudos WHERE ${PUBLICADO} AND id != ? ORDER BY (tema IS ? ) DESC, publicado_em DESC LIMIT ?`).all(c.id, c.tema, n) as Conteudo[];
}

/** "Como produzir rainhas?" → "como-produzir-rainhas" */
export function slugify(t: string) {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');
}
export const SLUG_OK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** O Google corta o título perto de 60 caracteres: a marca (" | Gustavo Bijos") só entra quando o título inteiro cabe. */
export const TITULO_MAX = 60;
export function tituloGoogle(titulo: string, marca: string) {
  const comMarca = `${titulo} | ${marca}`;
  return comMarca.length <= TITULO_MAX ? comMarca : titulo;
}

/** ID do vídeo a partir de qualquer link do YouTube (watch, youtu.be, shorts, embed, live). */
export function youtubeId(url?: string | null) {
  if (!url) return null;
  const m = url.trim().match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/);
  return m ? m[1] : /^[\w-]{11}$/.test(url.trim()) ? url.trim() : null;
}
/** Capa do YouTube: a hqdefault (480x360) existe para todo vídeo; a maxres nem sempre. */
export const capaYoutube = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** Capa enviada no admin (lib/upload.ts): versões 16:9 para a página e o card, e a JPG 1200x630 do preview. */
export const capaEnviada = (base: string) => ({
  src: `${base}-1200.webp`, srcset: `${base}-720.webp 720w, ${base}-1200.webp 1200w`, largura: 1200, altura: 675, og: `${base}-og.jpg`,
});

/** Imagem de compartilhamento (og:image) e do Article: capa enviada > miniatura do vídeo > nenhuma (o layout usa a padrão). */
export function imagemSocial(c: Conteudo) {
  if (c.capa) return { url: capaEnviada(c.capa).og, largura: 1200, altura: 630 };
  const v = youtubeId(c.video_url);
  return v ? { url: capaYoutube(v), largura: 480, altura: 360 } : null;
}

/**
 * Markdown → HTML. O título da página já é o H1: um "# Título" no começo do texto (comum nos .md importados) sai,
 * e os demais H1 viram H2. Links externos abrem em outra aba. Só o /admin escreve aqui, então o HTML do Markdown é confiável.
 */
export function renderCorpo(md: string, titulo?: string) {
  let texto = md.replace(/\r\n/g, '\n').trim();
  const primeiro = texto.match(/^#\s+(.+)\n?/);
  if (primeiro && (!titulo || slugify(primeiro[1]) === slugify(titulo))) texto = texto.slice(primeiro[0].length).trim();
  return (marked.parse(texto, { async: false }) as string)
    .replace(/<(\/?)h1>/g, '<$1h2>')
    .replace(/<a href="(https?:\/\/(?!gustavobijos\.com\.br)[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"')
    .replace(/<table>[\s\S]*?<\/table>/g, rotularTabela)
    .replace(/<img ([^>]*?)\/?>/g, imagemLeve);
}

/** Fotos do texto: carregam só perto da tela; as medidas vêm do nome do arquivo enviado (…-1200x800.webp), sem pulo de layout. */
function imagemLeve(_: string, attrs: string) {
  const m = attrs.match(/src="[^"]*-(\d+)x(\d+)\.webp"/);
  return `<img ${attrs.trim()}${m ? ` width="${m[1]}" height="${m[2]}"` : ''} loading="lazy" decoding="async">`;
}

/** Cada célula ganha data-label com o nome da coluna: no celular a tabela vira cartões ("Vantagem: ..."). */
function rotularTabela(t: string) {
  const cols = [...(t.match(/<thead>[\s\S]*?<\/thead>/)?.[0] ?? '').matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/"/g, '&quot;').trim());
  return t.replace(/<tr>([\s\S]*?)<\/tr>/g, (linha, cel: string) => {
    let i = 0;
    return `<tr>${cel.replace(/<td([^>]*)>/g, (_: string, attrs: string) => `<td${attrs} data-label="${cols[i++] ?? ''}">`)}</tr>`;
  });
}

/** Minutos de leitura (200 palavras por minuto, no mínimo 1). */
export const minutosLeitura = (md: string) => Math.max(1, Math.round(md.split(/\s+/).filter(Boolean).length / 200));

const TZ = 'America/Sao_Paulo';
export const fmtData = (iso?: string | null) => (iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)) : '');
