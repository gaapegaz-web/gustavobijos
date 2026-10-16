# Tracking e análise: gustavobijos.com.br

Dois fluxos independentes saem da página. Os dois ficam no `public/js/ta-v5.js`.

1. **Meta (anúncios):** Pixel no navegador + cópia no servidor pela Conversions API, com o mesmo `event_id` para a Meta não contar duas vezes.
2. **Comportamento (nosso):** o que a pessoa faz na página, gravado no SQLite em `sessoes` e `comportamento`. Nada disso vai para a Meta.

## Eventos enviados à Meta

| Evento | Tipo | Quando dispara | Onde |
|---|---|---|---|
| PageView | padrão | toda página | todas |
| AbriuFormulario | personalizado | clique em "Garantir minha vaga" | /black (`content_name`: topo_cta, hero_cta, trava_cta) |
| Lead | padrão | a página /obrigado carrega (servidor E navegador, mesmo event_id, disparado uma única vez por lead) | /obrigado |
| Schedule | padrão | clique em "Entrar no grupo" | /obrigado |
| Purchase | padrão | webhook da Hubla (servidor), para a futura página do produto | /api/hubla-webhook |
| Contact | padrão | clique no WhatsApp de suporte | rodapé |

Mantemos poucos eventos de propósito: scroll e tempo de engajamento (ver "Tabelas de comportamento" abaixo) ficam só no nosso banco, não viram evento de pixel — a Meta otimiza melhor com poucos sinais limpos do que com muitos eventos ruidosos.

**Lead, em detalhe:** o cadastro em `/api/lead` grava o lead mas NÃO dispara nada para a Meta. O disparo acontece quando a pessoa abre `/obrigado`: o servidor marca `leads.lead_enviado_em` de forma atômica (um F5 ou "voltar" na página não duplica) e manda a CAPI; o mesmo `event_id` é passado para o Pixel no navegador na mesma carga. Cadastro repetido com o mesmo WhatsApp, ou outro número no mesmo aparelho em 24h (`meta_lead = 0`), nunca dispara Lead.

Correspondência (match quality): o servidor manda telefone, nome, external_id (id do lead) e estado (`st`, tirado do DDD do WhatsApp) em SHA-256, mais fbp, fbc, IP e user agent. Na /obrigado o Pixel também recebe telefone, nome e external_id em hash (advanced matching).

**Fbp/fbc robustos:** o `_fbp` só existe depois que o fbevents.js (script de terceiro, assíncrono) termina de carregar. Num clique muito rápido logo que a página abre, a réplica para o servidor poderia sair sem esse cookie. Desde a `ta-v5.js` o próprio script cria o `_fbp` (formato `fb.1.<ms>.<aleatório>`) antes do fbevents.js, e o Pixel adota esse cookie. O fbevents.js só baixa na primeira interação (toque, tecla, rolagem) ou 3 s depois do `load`, para não pesar na primeira tela; na `/obrigado` carrega na hora. Os eventos esperam na fila do `fbq` e a cópia CAPI sai na hora. Se o navegador recusar o cookie, a espera de ~800ms pelo `_fbp` continua como rede de segurança. O `_fbc` sintético a partir de `fbclid` já é criado no middleware em qualquer página carregada com esse parâmetro, antes de qualquer clique.

## Gerador de UTM (/admin/links)

Montador em 3 passos com prévia ao vivo: (1) para onde leva (páginas de `config/paginas.ts`, um artigo publicado ou outra página), (2) onde vai divulgar (modelos que já preenchem `utm_source`/`utm_medium` no padrão da casa: instagram/bio, instagram/stories, whatsapp/grupo, youtube/descricao, youtube/live, email/email...), (3) campanha e nome. Os valores viram minúsculos, sem acento e com hífen no lugar de espaço, para "Instagram" e "instagram" não virarem duas origens.
- **Link curto (`/r/<slug>`):** grava na tabela `links`, sempre redireciona para a mesma página com as UTMs e conta cliques. Para bio, grupo, e-mail e descrição de vídeo. O botão cria e já copia.
- **URL completa:** sempre aparece na prévia, com botão de copiar, sem gravar nada.
- **Anúncio Meta Ads:** não usa link curto. Gera a URL do site + "Parâmetros de URL" para colar no anúncio: `utm_source=meta&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content={{adset.name}}&utm_term={{ad.name}}`. O Meta troca os `{{...}}` pelos nomes reais da campanha, do conjunto e do anúncio, então os números do painel batem com o Gerenciador sem digitar nada.
- Na lista, "Modelo" carrega um link existente no montador para criar uma variação.

API: `POST /api/admin/links` (criar) e `DELETE /api/admin/links?slug=...` (excluir), protegidas pela mesma basic auth do `/admin`.

Configuração em `/srv/tecnoapis/.env`: `META_PIXEL_ID`, `META_CAPI_TOKEN` e, só para testar no Gerenciador de Eventos, `META_TEST_EVENT_CODE` (apagar depois).

## Páginas novas: tracking e checkout "de fábrica"

> **Regra para páginas de vendas (ver CLAUDE.md):** todo botão de compra usa `BotaoCheckout`, com botão no topo e no fim da página. O anúncio sempre leva para a página de vendas, nunca direto para o checkout da Hubla.

O site vai ganhar mais páginas (algumas não são de vendas, outras vão mandar para o checkout da
Hubla). Tudo abaixo já funciona em QUALQUER página nova, sem configuração extra:

- **UTM e fbclid:** o middleware (`src/middleware.ts`) captura `utm_*` e `fbclid` da querystring
  em toda página HTML e grava em cookie first-party por 90 dias (`ta_utm`). Não importa a rota —
  funciona em `/`, `/black` ou qualquer página futura.
- **Pixel + CAPI:** basta a página usar o layout `~/layouts/Tecnoapis.astro`, que já carrega
  `ta-v5.js` (Pixel) e expõe `data-track-click` para eventos declarativos.
- **Checkout da Hubla com UTM:** use o componente `~/components/BotaoCheckout.astro` em vez de um
  `<a>` cru. Ele:
  1. Lê as UTMs do cookie + da querystring da própria página (cookie tem prioridade por último:
     se a página atual trouxer UTM nova na URL, ela prevalece)
  2. Monta a URL final do checkout com `utm_source/medium/campaign/content/term` + `src` (a Hubla
     aceita os dois formatos)
  3. Dispara `InitiateCheckout` (Pixel + CAPI) no clique, antes do redirecionamento

  ```astro
  import BotaoCheckout from '~/components/BotaoCheckout.astro';

  <!-- produto único (usa HUBLA_CHECKOUT_URL do .env) -->
  <BotaoCheckout valor={297}>Quero entrar</BotaoCheckout>

  <!-- página de vendas com oferta/checkout próprio -->
  <BotaoCheckout checkoutUrl="https://pay.hubla.com.br/outra-oferta" valor={497} contentName="oferta-x">
    Comprar agora
  </BotaoCheckout>
  ```

- **Casar a venda com a origem, no webhook:** `POST /api/hubla-webhook` já tenta ler `utm_source`/
  `utm_campaign` do próprio payload da Hubla (variam conforme a versão), mas o caminho confiável é
  casar o comprador pelo telefone/e-mail com o `lead` que já tem as UTMs completas da visita — é
  o que o código faz por padrão (`lead?.utm_source ?? n.utm_source`). Por isso o `BotaoCheckout`
  manda o telefone/e-mail junto não é necessário: quem compra digita isso no checkout da Hubla, e o
  webhook casa na volta.

Testado (14/10/2026): UTM na URL → grava cookie → aparece no link do checkout na mesma carga;
removendo a UTM da URL (navegação interna) → o link do checkout continua correto via cookie.

## Tabelas de comportamento

**sessoes**: uma linha por visita. A visita acaba após 30 min sem atividade (cookie `ta_sid`). A mesma pessoa em outro dia tem o mesmo `visitante_id` (cookie `ta_vid`, 400 dias).
Campos de resumo já calculados: `tempo_ativo_s`, `scroll_max`, `abriu_form`, `iniciou_form`, `lead_id`, `clicou_grupo`, `clicou_checkout`, `dispositivo`, UTMs.

**comportamento**: uma linha por ação. `tipo`:

| tipo | alvo | valor |
|---|---|---|
| pagina | nova_sessao ou mesma_sessao | |
| scroll | | marco atingido: 25, 50, 75, 90 |
| secao_vista | nome da seção | |
| secao_tempo | nome da seção | ms que a seção ficou na tela (pode vir em mais de uma linha por visita: somar) |
| clique | `form:topo`, `form:hero`, `form:meio`, `form:enviar`, `grupo`, `checkout:topo`, ... ou texto do link + `@seção` | |
| popup_aberto / popup_fechado | id do dialog | segundos aberto (no fechado) |
| form_inicio / form_campo | nome do campo | |
| form_erro | campo com erro (nome, whatsapp, geral) | |
| form_envio | | |
| tempo_ativo | | segundos novos desde o último envio (somar) |
| saida | scroll_max | maior % rolado nessa página |

Seções (`data-secao` no HTML):
- /black (só captação): `1-hero`, `2-o-que-trava`, `3-clube`, `4-gustavo`.
- /obrigado: `obrigado`.

`leads.sessao_id` e `leads.visitante_id` ligam cada lead à visita em que se cadastrou.

## Como analisar

```
cd /srv/tecnoapis/app
npm run analise              # últimos 30 dias, em tabelas
node scripts/analise.mjs 7 --json   # 7 dias em JSON
sqlite3 /srv/tecnoapis/data/app.db "SELECT * FROM v_funil_diario"
```

Visões prontas: `v_funil_diario`, `v_funil_origem`, `v_secoes`, `v_cliques`.

Painel: /admin (filtro Hoje, 7 dias, 30 dias, Tudo). Exportações: /admin/leads.csv, /admin/eventos.csv, /admin/comportamento.csv.
