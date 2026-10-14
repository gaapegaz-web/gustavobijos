# Tracking e análise: gustavobijos.com.br

Dois fluxos independentes saem da página. Os dois ficam no `public/js/ta-v4.js`.

1. **Meta (anúncios):** Pixel no navegador + cópia no servidor pela Conversions API, com o mesmo `event_id` para a Meta não contar duas vezes.
2. **Comportamento (nosso):** o que a pessoa faz na página, gravado no SQLite em `sessoes` e `comportamento`. Nada disso vai para a Meta.

## Eventos enviados à Meta

| Evento | Tipo | Quando dispara | Onde |
|---|---|---|---|
| PageView | padrão | toda página | todas |
| ViewContent | padrão | página carregou | /black |
| AbriuFormulario | personalizado | clique em "Garantir minha vaga" | /black (`content_name`: topo_cta, hero_cta, trava_cta) |
| Lead | padrão | a página /obrigado carrega (servidor E navegador, mesmo event_id, disparado uma única vez por lead) | /obrigado |
| Schedule | padrão | clique em "Entrar no grupo" | /obrigado |
| Purchase | padrão | webhook da Hubla (servidor), para a futura página do produto | /api/hubla-webhook |
| Contact | padrão | clique no WhatsApp de suporte | rodapé |

Mantemos poucos eventos de propósito: scroll e tempo de engajamento (ver "Tabelas de comportamento" abaixo) ficam só no nosso banco, não viram evento de pixel — a Meta otimiza melhor com poucos sinais limpos do que com muitos eventos ruidosos.

**Lead, em detalhe:** o cadastro em `/api/lead` grava o lead mas NÃO dispara nada para a Meta. O disparo acontece quando a pessoa abre `/obrigado`: o servidor marca `leads.lead_enviado_em` de forma atômica (um F5 ou "voltar" na página não duplica) e manda a CAPI; o mesmo `event_id` é passado para o Pixel no navegador na mesma carga. Cadastro repetido com o mesmo WhatsApp, ou outro número no mesmo aparelho em 24h (`meta_lead = 0`), nunca dispara Lead.

Correspondência (match quality): o servidor manda telefone, nome e external_id (id do lead) em SHA-256, mais fbp, fbc, IP e user agent. Na /obrigado o Pixel também recebe telefone, nome e external_id em hash (advanced matching).

Configuração em `/srv/tecnoapis/.env`: `META_PIXEL_ID`, `META_CAPI_TOKEN` e, só para testar no Gerenciador de Eventos, `META_TEST_EVENT_CODE` (apagar depois).

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
