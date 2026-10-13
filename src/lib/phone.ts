/** DDDs válidos no Brasil */
const DDDS = new Set([
  11,12,13,14,15,16,17,18,19, 21,22,24, 27,28, 31,32,33,34,35,37,38, 41,42,43,44,45,46, 47,48,49,
  51,53,54,55, 61, 62,64, 63, 65,66, 67, 68, 69, 71,73,74,75,77, 79, 81,87, 82, 83, 84, 85,88, 86,89, 91,93,94, 92,97, 95, 96, 98,99,
]);

/**
 * Normaliza um WhatsApp brasileiro para E.164 (+55DDDNÚMERO).
 * Aceita com/sem +55, com/sem máscara. Celular precisa ter 9 dígitos começando com 9.
 */
export function normalizarWhatsapp(raw: string): { ok: true; e164: string } | { ok: false; erro: string } {
  let digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) {
    // fixo ou celular antigo sem o 9; adiciona o 9 se parecer celular
    const ddd = digits.slice(0, 2), n = digits.slice(2);
    if (/^[6-9]/.test(n)) digits = ddd + '9' + n;
  }
  if (digits.length !== 11) return { ok: false, erro: 'Digite o WhatsApp com DDD, ex: (67) 99999-9999' };
  const ddd = Number(digits.slice(0, 2));
  if (!DDDS.has(ddd)) return { ok: false, erro: 'DDD inválido' };
  if (digits[2] !== '9') return { ok: false, erro: 'O número precisa ser de celular (começa com 9)' };
  if (/^(\d)\1+$/.test(digits.slice(2))) return { ok: false, erro: 'Número inválido' };
  return { ok: true, e164: '+55' + digits };
}

export function formatarWhatsapp(e164: string) {
  const d = e164.replace(/\D/g, '').replace(/^55/, '');
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : e164;
}
