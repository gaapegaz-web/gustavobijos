# Black Tecnoapis 2026 — gustavobijos.com.br

Site de captação + página de vendas + tracking Meta (Pixel + CAPI) + webhook Hubla. Roda nesta VPS.

## Rotas
- `/` captação (live "De 10 para 100 colmeias") · `/c/iniciante`, `/c/rainhas`, `/c/renda` variantes
- `/obrigado` dispara Lead no pixel e manda para o grupo do WhatsApp
- `/black` captação da Black Friday (live de abertura em `src/config/black.ts`) · `/tecnoapis` página fixa do Clube · `/bio` links · `/` home
- `/r/<slug>` links curtos com UTM (ver `src/config/black.ts` → `LINKS`)
- `/admin` painel (basic auth, usuário/senha no `.env`) · `/admin/leads.csv` · `/admin/eventos.csv`
- `POST /api/lead` · `POST /api/event` · `POST /api/hubla-webhook?token=...`

## Onde mexer
- **Oferta, datas, preços, bônus, FAQ, links**: `src/config/black.ts` (único arquivo). Itens `[CONFIRMAR]` são placeholders.
- **Segredos**: `/srv/tecnoapis/.env` (ver `.env.example`).
- **Foto do Gustavo**: `public/img/gustavo.webp` (960×1200), achada por `acharImagem('gustavo')`. **OG image**: `public/img/og-gustavo.jpg` (1200×630).

## Deploy
```
/srv/tecnoapis/app/deploy/deploy.sh      # build + restart
journalctl -u tecnoapis -f               # logs
sqlite3 /srv/tecnoapis/data/app.db       # banco
```

## Hubla
Configure o webhook com a URL `https://gustavobijos.com.br/api/hubla-webhook?token=<HUBLA_WEBHOOK_TOKEN>` para os eventos de compra aprovada, reembolso e carrinho abandonado. O payload bruto fica na tabela `webhooks`.

## Meta
Preencha `META_PIXEL_ID` e `META_CAPI_TOKEN`. Para validar, coloque o código do Test Events em `META_TEST_EVENT_CODE`, navegue no site e confira no Gerenciador de Eventos que `PageView`, `Lead`, `InitiateCheckout` chegam por navegador e servidor deduplicados. Depois limpe o `META_TEST_EVENT_CODE`.
