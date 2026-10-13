import { BONUS, CAMPANHA, type Bonus } from '~/config/black';
import { ENV } from './env';

export const TZ = 'America/Sao_Paulo';

export type Fase =
  | 'captacao'      // antes da abertura das vendas
  | 'abertura'      // 1/11 a 6/11 (bônus de abertura)
  | 'semanal'       // 7/11 a 26/11 (um bônus por semana)
  | 'black'         // 27/11
  | 'encerrado';

export type Estado = {
  agora: Date;
  fase: Fase;
  vendasAbertas: boolean;
  bonusAtivos: Bonus[];
  bonusEncerrados: Bonus[];
  /** Próximo prazo que o contador deve apontar */
  proximoPrazo: Date | null;
  proximoPrazoLabel: string;
  faixa: string; // texto da faixa de bônus
};

const d = (iso: string) => new Date(iso);

/** Resolve "agora", permitindo ?agora=... para simulação quando ALLOW_TIME_TRAVEL=1. */
export function resolverAgora(url: URL): Date {
  const q = url.searchParams.get('agora');
  if (q && ENV.ALLOW_TIME_TRAVEL) {
    const parsed = new Date(q.includes('T') && !/[Z+-]\d{2}:?\d{2}$/.test(q) ? `${q}:00-03:00`.replace(/:00:00-03:00$/, ':00-03:00') : q);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function estado(agora = new Date()): Estado {
  const abre = d(CAMPANHA.aberturaVendas);
  const fim = d(CAMPANHA.fimVendas);
  const blackDia = d('2026-11-27T00:00:00-03:00');
  const fimAbertura = d('2026-11-06T23:59:59-03:00');

  let fase: Fase;
  if (agora < abre) fase = 'captacao';
  else if (agora > fim) fase = 'encerrado';
  else if (agora >= blackDia) fase = 'black';
  else if (agora <= fimAbertura) fase = 'abertura';
  else fase = 'semanal';

  const vendasAbertas = fase !== 'captacao' && fase !== 'encerrado';
  const bonusAtivos = BONUS.filter((b) => agora >= d(b.inicio) && agora <= d(b.fim));
  const bonusEncerrados = BONUS.filter((b) => agora > d(b.fim));

  // Próximo prazo = o fim mais próximo entre os bônus ativos; senão o fim das vendas.
  let proximoPrazo: Date | null = null;
  let proximoPrazoLabel = '';
  let faixa = '';

  if (fase === 'captacao') {
    proximoPrazo = d(CAMPANHA.live.data) > agora ? d(CAMPANHA.live.data) : abre;
    proximoPrazoLabel = d(CAMPANHA.live.data) > agora ? 'para a live' : 'para a abertura';
    faixa = `Carrinho abre em ${fmtData(abre)}`;
  } else if (vendasAbertas) {
    const fins = bonusAtivos.map((b) => d(b.fim)).sort((a, b) => a.getTime() - b.getTime());
    proximoPrazo = fins[0] ?? fim;
    if (fase === 'black') {
      proximoPrazoLabel = 'para o fim da Black';
      faixa = 'Só hoje: última chance da Black Tecnoapis';
    } else if (fase === 'abertura') {
      proximoPrazoLabel = mesmoDia(proximoPrazo, agora) ? 'para o bônus de hoje acabar' : `para o bônus de abertura acabar`;
      faixa = mesmoDia(proximoPrazo, agora) ? `Bônus de hoje termina às 23:59` : `Bônus de abertura termina dia ${fmtDia(fimAbertura)}`;
    } else {
      proximoPrazoLabel = 'para o bônus da semana acabar';
      faixa = `Bônus da semana termina ${fmtDiaSemana(proximoPrazo)} (${fmtDia(proximoPrazo)})`;
    }
  } else {
    faixa = 'A Black Tecnoapis 2026 encerrou';
  }

  return { agora, fase, vendasAbertas, bonusAtivos, bonusEncerrados, proximoPrazo, proximoPrazoLabel, faixa };
}

function mesmoDia(a: Date, b: Date) {
  return fmtDia(a) === fmtDia(b);
}

export function fmtDia(x: Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' }).format(x);
}
export function fmtDiaSemana(x: Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long' }).format(x).replace('-feira', '');
}
export function fmtData(x: Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: 'long' }).format(x);
}
export function fmtDataHora(x: Date) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(x).replace(',', ' às');
}
export function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: v % 1 === 0 ? 0 : 2 });
}
