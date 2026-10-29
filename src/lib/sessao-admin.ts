/**
 * Login do /admin (página /admin/login). A sessão é um cookie "<expira>.<assinatura>":
 * a assinatura usa ADMIN_USER + ADMIN_PASS, então trocar a senha no .env derruba todas as sessões.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ENV } from './env';

export const COOKIE_ADMIN = 'ta_admin';
export const SESSAO_DIAS = 30;

const assinar = (exp: string) => createHmac('sha256', `${ENV.ADMIN_USER}:${ENV.ADMIN_PASS}`).update(exp).digest('base64url');

export const novaSessao = () => { const exp = String(Date.now() + SESSAO_DIAS * 86400_000); return `${exp}.${assinar(exp)}`; };

export function sessaoValida(token?: string) {
  if (!ENV.ADMIN_PASS || !token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  const a = Buffer.from(sig), b = Buffer.from(assinar(exp));
  return a.length === b.length && timingSafeEqual(a, b);
}

export const senhaCerta = (user: string, pass: string) => !!ENV.ADMIN_PASS && user === ENV.ADMIN_USER && pass === ENV.ADMIN_PASS;

// Senha errada: 10 por IP a cada 15 min. Em memória (um processo só; zera no restart).
const FALHAS = 10, JANELA = 15 * 60_000;
const erros = new Map<string, { n: number; t: number }>();
setInterval(() => { const now = Date.now(); for (const [k, v] of erros) if (now - v.t > JANELA) erros.delete(k); }, 60_000).unref?.();

export function bloqueado(ip: string) {
  const e = erros.get(ip);
  return !!e && e.n >= FALHAS && Date.now() - e.t <= JANELA;
}
export function registrarFalha(ip: string) {
  const e = erros.get(ip), now = Date.now();
  if (!e || now - e.t > JANELA) erros.set(ip, { n: 1, t: now });
  else e.n++;
}
