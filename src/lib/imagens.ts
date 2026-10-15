import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Procura /img/<nome>.(webp|jpg|png) entre os arquivos estáticos. Devolve o caminho público ou undefined.
 * Em produção os estáticos são servidos de dist/client, então a imagem só "existe" depois do build.
 */
/** srcset com as variantes "<nome>-<largura>.webp" que existirem, mais o arquivo base na largura cheia. */
export function srcsetImagem(nome: string, larguras: number[], larguraBase: number) {
  const partes = larguras.map((w) => [acharImagem(`${nome}-${w}`), w] as const).filter(([f]) => f).map(([f, w]) => `${f} ${w}w`);
  const base = acharImagem(nome);
  return base ? [...partes, `${base} ${larguraBase}w`].join(', ') : undefined;
}

export function acharImagem(nome: string) {
  const pasta = import.meta.env.PROD ? 'dist/client' : 'public';
  return ['webp', 'jpg', 'png'].map((ext) => `/img/${nome}.${ext}`).find((f) => existsSync(join(process.cwd(), pasta, f)));
}
