# gustavobijos.com.br

Site do Gustavo Bijos, médico veterinário e apicultor, criador do Clube Tecnoapis. Tem a home institucional, a página de venda do Clube, as campanhas de captação, os artigos e um painel próprio com leads e tracking da Meta (Pixel + CAPI).

Tudo é auto-hospedado numa VPS: Astro SSR + Node 22 + SQLite, atrás do Caddy.

## Páginas

| Rota | O que é | Onde mexer |
|---|---|---|
| `/` | Home sobre o Gustavo | `src/config/site.ts`, `src/components/home/` |
| `/tecnoapis` | Clube Tecnoapis + venda da assinatura anual | `src/config/clube.ts` |
| `/black` | Campanha temporária de captação (live) | `src/config/black.ts`, `src/components/black/` |
| `/conteudos` | Artigos (editados no `/admin/conteudos`) | tabela `conteudos`, `src/config/conteudos.ts` |
| `/bio` | Links da bio do Instagram | `src/config/bio.ts` |
| `/obrigado` | Pós-cadastro: Lead + grupo do WhatsApp | `src/pages/obrigado.astro` |
| `/privacidade` | Política de privacidade (LGPD) | `src/pages/privacidade.astro` |
| `/r/<slug>` | Links curtos com UTM | `/admin/links` (e `LINKS` em `src/config/black.ts`) |
| `/admin` | Painel: leads, origem, comportamento, Meta, links, conteúdos | `src/pages/admin/`, `src/lib/painel.ts` |

APIs: `POST /api/lead`, `POST /api/event`, `POST /api/comportamento`, `POST /api/hubla-webhook?token=…`. Também são geradas na hora: `/sitemap.xml`, `/llms.txt` e `/indexnow.txt`.

## Rodar localmente

```bash
npm ci
cp .env.example .env    # troque DB_PATH por ./data/dev.db; META_PIXEL_ID e META_CAPI_TOKEN vazios
npm run dev             # http://127.0.0.1:4321
```

> **Nunca teste com o Pixel e a CAPI reais.** Qualquer evento de teste entra na conta de anúncios, e a Meta não apaga. Use `META_TEST_EVENT_CODE` ou deixe o token vazio.

## Produção

| O que | Onde |
|---|---|
| Código | `/srv/tecnoapis/app` |
| Segredos | `/srv/tecnoapis/.env` (fora do git) |
| Banco | `/srv/tecnoapis/data/app.db` (SQLite WAL, esquema em `schema.sql`) |
| Uploads | `/srv/tecnoapis/uploads/` |
| Serviço | `tecnoapis.service` → Node em `127.0.0.1:4321` |
| Proxy e HTTPS | Caddy (`deploy/Caddyfile`) |
| Backup | `deploy/backup.sh`, todo dia às 3h |

```bash
deploy/deploy.sh                 # npm ci, build, restart e checagem HTTP
journalctl -u tecnoapis -f       # logs
node scripts/analise.mjs 7       # funil dos últimos 7 dias (só leitura)
```

`npm run build` grava na mesma `dist/` que o serviço usa. Depois de compilar, reinicie sempre o serviço, senão o site fica sem estilo.

## Regras

- **Checkout:** todo botão para a Hubla usa `src/components/BotaoCheckout.astro` (detalhes em `CLAUDE.md`).
- **Tracking:** guia completo em `ANALISE.md`. O Pixel carrega atrasado (`public/js/ta-v5.js`) e a CAPI manda a cópia pelo servidor.
- **Cache:** `/img/*` e `/js/*` ficam 7 dias em cache. Ao trocar um arquivo, use um nome novo em vez de sobrescrever o antigo.
- **Design:** fundo `#0a0a0a`, mel `#f2a900`, PT Sans nos títulos e Inter no texto (`src/styles/tokens.css`). O público é de apicultores 40+ no celular, então confira em 360px e 412px.
- **Campanhas** (como `/black`) são independentes. A home e a `/tecnoapis` não linkam para elas.
