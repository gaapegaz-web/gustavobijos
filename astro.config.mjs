import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  site: 'https://gustavobijos.com.br',
  server: { host: '127.0.0.1', port: 4321 },
  security: { checkOrigin: false }, // forms vêm do nosso próprio domínio; Hubla posta de fora
  // CSS dentro do HTML: tira 2 a 3 requisições do caminho crítico (o HTML já não é cacheado)
  build: { inlineStylesheets: 'always' },
  vite: { ssr: { external: ['better-sqlite3', 'sharp'] } },
});
