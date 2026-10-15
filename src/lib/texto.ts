/** Ajustes de texto: viúvas, datas (sempre em Brasília) e dinheiro. */

/** Cola a última palavra na anterior com espaço não separável, para nunca ficar sozinha na linha. */
export const semViuva = (t: string) => t.replace(/\s+(\S+)\s*$/, ' $1');

const TZ = 'America/Sao_Paulo';

export function fmtDiaSemana(x: Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long' }).format(x).replace('-feira', '');
}
export function fmtDataHora(x: Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(x).replace(',', ' às');
}
export function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: v % 1 === 0 ? 0 : 2 });
}
