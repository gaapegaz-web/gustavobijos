// Leitura do webhook da Hubla: tipo do evento e valor em reais (é o que vai para a Meta como Purchase). Sem banco nem rede.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const code = ts.transpileModule(readFileSync(new URL('../src/lib/hubla.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const { normalizar } = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));

const user = { name: 'Ana Souza', email: 'ANA@x.com', phone: '67991234567' };
const evento = (type, extra = {}) => normalizar({ type, event: { user, invoice: { id: 'T1', amount: { totalCents: 69700 }, ...extra } } });

// Tipo do evento
for (const t of ['invoice.payment_succeeded', 'NewSale', 'sale.completed', 'invoice.paid', 'Compra Aprovada']) assert.equal(evento(t).tipo, 'Purchase', t);
for (const t of ['invoice.refunded', 'chargeback', 'CanceledSale', 'Estorno', 'reembolso solicitado']) assert.equal(evento(t).tipo, 'Reembolso', t);
for (const t of ['invoice.created', 'checkout.started', 'pending']) assert.equal(evento(t).tipo, 'InitiateCheckout', t);
assert.equal(evento('abandoned_checkout').tipo, 'Abandono');
assert.equal(evento('user.updated').tipo, null, 'evento desconhecido é ignorado');
// Reembolso aprovado/pago NÃO é compra: Purchase falso na Meta infla o resultado e não se apaga
for (const t of ['refund.approved', 'refund_paid', 'invoice.refund.approved', 'chargeback.paid']) assert.equal(evento(t).tipo, 'Reembolso', t);
// Pagamento que não aconteceu NÃO é compra
for (const t of ['invoice.unpaid', 'payment.unpaid', 'invoice.payment_failed']) assert.notEqual(evento(t).tipo, 'Purchase', t);

// Valor em reais
assert.equal(evento('invoice.paid').valor, 697, 'totalCents 69700 = R$ 697');
assert.equal(evento('invoice.paid', { amount: { totalCents: 150000 } }).valor, 1500, 'totalCents sempre é dividido, mesmo acima de 100000');
assert.equal(normalizar({ type: 'paid', event: { user, invoice: { id: 'a', total: 697 } } }).valor, 697, 'total já em reais não é dividido');
assert.equal(normalizar({ type: 'paid', event: { user, invoice: { id: 'a', total_cents: 49700 } } }).valor, 497, 'total_cents');
assert.equal(normalizar({ type: 'paid', event: { user, invoice: { id: 'a' } } }).valor, null, 'sem valor: null (o webhook não envia à Meta)');
assert.ok(!(normalizar({ type: 'paid', event: { user, invoice: { id: 'a', total: 'R$ 697,00' } } }).valor > 0), 'valor ilegível não passa como positivo');

// Pessoa e transação
const n = evento('invoice.paid');
assert.equal(n.email, 'ana@x.com', 'e-mail em minúsculas');
assert.equal(n.nome, 'Ana Souza'); assert.equal(n.telefone, '67991234567'); assert.equal(n.transacaoId, 'T1');
assert.equal(normalizar({ type: 'invoice.paid', data: { customer: { email: 'b@x.com' }, payment: { id: 'P9', value: 97 } } }).transacaoId, 'P9', 'formato data/customer/payment');
assert.equal(normalizar({}).tipo, null, 'payload vazio não quebra');

console.log('OK: tipo do evento, reembolso/pagamento falho, valor em reais e dados da pessoa.');
