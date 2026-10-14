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

/** UF por DDD (Anatel). Usado como `st` no match da Meta: dado informado pela pessoa, mais confiável que geolocalização por IP. */
const UF_POR_DDD: Record<number, string> = {
  11: 'sp', 12: 'sp', 13: 'sp', 14: 'sp', 15: 'sp', 16: 'sp', 17: 'sp', 18: 'sp', 19: 'sp',
  21: 'rj', 22: 'rj', 24: 'rj', 27: 'es', 28: 'es',
  31: 'mg', 32: 'mg', 33: 'mg', 34: 'mg', 35: 'mg', 37: 'mg', 38: 'mg',
  41: 'pr', 42: 'pr', 43: 'pr', 44: 'pr', 45: 'pr', 46: 'pr', 47: 'sc', 48: 'sc', 49: 'sc',
  51: 'rs', 53: 'rs', 54: 'rs', 55: 'rs',
  61: 'df', 62: 'go', 64: 'go', 63: 'to', 65: 'mt', 66: 'mt', 67: 'ms', 68: 'ac', 69: 'ro',
  71: 'ba', 73: 'ba', 74: 'ba', 75: 'ba', 77: 'ba', 79: 'se',
  81: 'pe', 87: 'pe', 82: 'al', 83: 'pb', 84: 'rn', 85: 'ce', 88: 'ce', 86: 'pi', 89: 'pi',
  91: 'pa', 93: 'pa', 94: 'pa', 92: 'am', 97: 'am', 95: 'rr', 96: 'ap', 98: 'ma', 99: 'ma',
};

/** "+5567999999999" -> "ms". Só para números brasileiros; senão null. */
export function ufDoTelefone(e164?: string | null): string | null {
  const d = (e164 || '').replace(/\D/g, '');
  if (!d.startsWith('55') || d.length < 12) return null;
  return UF_POR_DDD[Number(d.slice(2, 4))] ?? null;
}
