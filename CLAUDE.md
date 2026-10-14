# Regras do projeto (gustavobijos.com.br)

Guia completo de tracking: `ANALISE.md`.

## Página de vendas: botão de checkout (regra obrigatória)

Hoje o site só tem página de captação. Quando for criada uma página de vendas:

- **Todo** botão que leva ao checkout da Hubla usa `~/components/BotaoCheckout.astro`. Nunca um `<a href="https://pay.hubla...">` direto.
- A página tem botão de checkout **no topo e no fim** (mais os do meio, se houver), todos com `BotaoCheckout`.
- O `BotaoCheckout`:
  - repassa as UTMs da visita para a URL do checkout;
  - dispara `InitiateCheckout` (Pixel + CAPI) sem valor;
  - grava a página em `leads.ultima_pagina_checkout`, que vira o `event_source_url` do Purchase no webhook.
- Use `checkoutUrl="..."` quando a oferta da página tiver um link próprio da Hubla. Sem ele, o botão usa `HUBLA_CHECKOUT_URL` do `.env`.
- O anúncio deve levar para a página de vendas, nunca direto para o checkout. Quem vai direto para a Hubla gera um Purchase só com os dados que a Hubla manda (sem fbp, fbc, IP e UTM), e a nota do evento cai.
- O valor da venda vem só do webhook da Hubla (Purchase). O botão não manda valor.
