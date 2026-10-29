/** Lê o payload do webhook da Hubla (vários formatos) e devolve tipo, valor em reais e dados da pessoa. Sem imports de propósito: scripts/test-hubla.mjs carrega este arquivo isolado. */
export type Norm = { tipo: 'Purchase' | 'InitiateCheckout' | 'Abandono' | 'Reembolso' | null; tipoOriginal: string; nome?: string; email?: string; telefone?: string; valor?: number | null; produto?: string; transacaoId?: string; utm_source?: string; utm_campaign?: string };

export function normalizar(p: any): Norm {
  const tipoOriginal = String(p.type || p.event || p.event_type || p.name || '').trim();
  const t = tipoOriginal.toLowerCase();
  const ev = p.event && typeof p.event === 'object' ? p.event : p.data || p;
  const user = ev.user || ev.customer || ev.buyer || ev.client || p.user || {};
  const inv = ev.invoice || ev.payment || ev.transaction || ev;
  const prod = ev.product || ev.offer || p.product || {};

  const pick = (...vals: unknown[]) => vals.find((v) => v != null && v !== '') as string | undefined;
  const valorRaw = pick(inv.amount?.totalCents, inv.totalCents, inv.total_cents, inv.amount?.total, inv.total, inv.value, inv.price, ev.amount, ev.value);
  let valor: number | null = valorRaw != null ? Number(valorRaw) : null;
  if (valor != null && (inv.amount?.totalCents != null || inv.totalCents != null || inv.total_cents != null || valor > 100000)) valor = valor / 100;

  let tipo: Norm['tipo'] = null;
  // Reembolso primeiro: "refund.approved" e "chargeback.paid" também têm palavra de compra, mas não são compra
  if (/refund|chargeback|canceledsale|cancel|estorn|reembols/.test(t)) tipo = 'Reembolso';
  else if (/payment_succeeded|newsale|(?<!un)paid|approved|aprovad|purchase|sale\.completed|invoice\.paid/.test(t)) tipo = 'Purchase';
  else if (/abandon/.test(t)) tipo = 'Abandono';
  else if (/invoice\.created|checkout|pending|waiting|aguardando/.test(t)) tipo = 'InitiateCheckout';

  return {
    tipo, tipoOriginal,
    nome: pick(user.name, user.fullName, user.full_name, user.firstName && `${user.firstName} ${user.lastName || ''}`),
    email: pick(user.email)?.toLowerCase(),
    telefone: pick(user.phone, user.phoneNumber, user.phone_number, user.whatsapp, user.cellphone),
    valor, produto: pick(prod.name, prod.title, ev.productName, ev.product_name),
    transacaoId: pick(inv.id, inv.transactionId, inv.transaction_id, ev.id, p.id),
    utm_source: pick(ev.utm_source, ev.utm?.source, ev.tracking?.utm_source, inv.utm_source),
    utm_campaign: pick(ev.utm_campaign, ev.utm?.campaign, ev.tracking?.utm_campaign, inv.utm_campaign),
  };
}
