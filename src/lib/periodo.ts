/** Períodos do painel (?dias=). Sem imports de propósito: o scripts/test-origem.mjs carrega lib/origem.ts isolado. */
export const PERIODOS: [number, string][] = [[1, 'Hoje'], [7, '7 dias'], [30, '30 dias'], [3650, 'Tudo']];

/** Lê ?dias=; valor fora da lista cai em 30. */
export function diasDoPeriodo(url: URL) {
  const n = Number(url.searchParams.get('dias'));
  return PERIODOS.some(([v]) => v === n) ? n : 30;
}
