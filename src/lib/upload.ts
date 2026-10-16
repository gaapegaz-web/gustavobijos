/**
 * Imagens enviadas pelo /admin/conteudos. O sharp redimensiona e converte; o original não é guardado.
 * Nomes sempre novos (slug + carimbo de tempo): /uploads/* fica 1 ano no cache do navegador, então nunca se sobrescreve.
 *
 * Capa  → <base>-1200.webp (1200x675) e <base>-720.webp (720x405), cortadas em 16:9,
 *         e <base>-og.jpg (1200x630, < 300 KB) para o preview no WhatsApp/Facebook.
 * Texto → <base>-<largura>x<altura>.webp, até 1200 de largura, sem corte (as medidas no nome viram width/height no HTML).
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENV } from './env';

const PASTA = 'conteudos';
export const MAX_BYTES = 20 * 1024 * 1024;

function nomeBase(slug: string) {
  const s = (slug || 'imagem').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'imagem';
  return `${s}-${Date.now().toString(36)}`;
}
function gravar(nome: string, dados: Buffer) {
  const dir = join(ENV.UPLOADS_DIR, PASTA);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, nome), dados);
}

/** Lê e valida a imagem (rotaciona pela orientação da câmera). Erro amigável se não for imagem. */
async function abrir(buf: Buffer) {
  if (buf.length > MAX_BYTES) throw new Error('A imagem passou de 20 MB. Mande uma versão menor.');
  try {
    const img = sharp(buf, { failOn: 'error' }).rotate();
    const m = await img.metadata();
    if (!m.width || !m.height) throw new Error();
    return { img, m };
  } catch { throw new Error('Não consegui abrir esse arquivo. Envie JPG, PNG ou WebP.'); }
}

/** Capa: devolve o caminho-base público (/uploads/conteudos/<base>), que é o que fica no banco. */
export async function salvarCapa(buf: Buffer, slug: string) {
  const { img, m } = await abrir(buf);
  const base = nomeBase(slug);
  const corte = { fit: 'cover' as const, position: sharp.strategy.attention };
  gravar(`${base}-1200.webp`, await img.clone().resize(1200, 675, corte).webp({ quality: 78 }).toBuffer());
  gravar(`${base}-720.webp`, await img.clone().resize(720, 405, corte).webp({ quality: 76 }).toBuffer());
  // WhatsApp ignora preview acima de ~300 KB: baixa a qualidade até caber
  let og: Buffer = Buffer.alloc(0);
  for (const q of [82, 74, 66, 58]) {
    og = await img.clone().resize(1200, 630, corte).flatten({ background: '#0a0a0a' }).jpeg({ quality: q, mozjpeg: true }).toBuffer();
    if (og.length < 290_000) break;
  }
  gravar(`${base}-og.jpg`, og);
  return { capa: `/uploads/${PASTA}/${base}`, pequena: (m.width ?? 0) < 1200 };
}

/** Foto no meio do texto: devolve a URL pública e as medidas. */
export async function salvarImagemTexto(buf: Buffer, slug: string) {
  const { img } = await abrir(buf);
  const { data, info } = await img.resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer({ resolveWithObject: true });
  const nome = `${nomeBase(slug)}-${info.width}x${info.height}.webp`;
  gravar(nome, data);
  return { url: `/uploads/${PASTA}/${nome}`, largura: info.width, altura: info.height };
}
