import { StatusAposta } from "@prisma/client";
import { Prisma } from "@prisma/client";

type Dec = Prisma.Decimal | number | string;

function n(value: Dec): number {
  if (typeof value === "number") return value;
  return Number(value.toString());
}

/**
 * Calcula o retorno real default para uma aposta resolvida.
 * Sempre editável manualmente depois (cash-out parcial, reembolso parcial etc).
 */
export function computeRetornoDefault(
  status: StatusAposta,
  stake: Dec,
  odd: Dec
): number | null {
  const s = n(stake);
  const o = n(odd);
  switch (status) {
    case "GREEN":
      return round2(s * o);
    case "RED":
      return 0;
    case "REEMBOLSO":
    case "CANCELADA":
      return round2(s);
    case "MEIA_GREEN":
      return round2((s / 2) * o + s / 2);
    case "MEIA_RED":
      return round2(s / 2);
    case "PENDENTE":
    default:
      return null;
  }
}

export function computeLucro(retornoReal: Dec | null, stake: Dec): number | null {
  if (retornoReal === null || retornoReal === undefined) return null;
  return round2(n(retornoReal) - n(stake));
}

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export const STATUS_RESOLVIDOS_PARA_STATS: StatusAposta[] = [
  "GREEN",
  "RED",
  "REEMBOLSO",
  "MEIA_GREEN",
  "MEIA_RED",
];

export const STATUS_LABELS: Record<StatusAposta, string> = {
  PENDENTE: "Pendente",
  GREEN: "Green",
  RED: "Red",
  REEMBOLSO: "Reembolso",
  MEIA_GREEN: "Meia Green",
  MEIA_RED: "Meia Red",
  CANCELADA: "Cancelada",
};

export const RISCO_LABELS: Record<string, string> = {
  BAIXO: "Baixo",
  MEDIO: "Médio",
  MEDIO_ALTO: "Médio-Alto",
  ALTO_ESPECULATIVO: "Alto Especulativo",
};

export function winRate(apostas: { status: StatusAposta }[]) {
  const resolvidas = apostas.filter((a) => STATUS_RESOLVIDOS_PARA_STATS.includes(a.status));
  if (resolvidas.length === 0) return 0;
  const greens = resolvidas.filter((a) => a.status === "GREEN" || a.status === "MEIA_GREEN").length;
  return (greens / resolvidas.length) * 100;
}

export function roi(apostas: { status: StatusAposta; stake: Dec; lucroPrejuizo: Dec | null }[]) {
  const resolvidas = apostas.filter((a) => STATUS_RESOLVIDOS_PARA_STATS.includes(a.status));
  const stakeTotal = resolvidas.reduce((acc, a) => acc + n(a.stake), 0);
  const lucroTotal = resolvidas.reduce((acc, a) => acc + n(a.lucroPrejuizo ?? 0), 0);
  if (stakeTotal === 0) return 0;
  return (lucroTotal / stakeTotal) * 100;
}

export function lucroTotal(apostas: { lucroPrejuizo: Dec | null }[]) {
  return round2(apostas.reduce((acc, a) => acc + n(a.lucroPrejuizo ?? 0), 0));
}

export function stakeTotal(apostas: { stake: Dec }[]) {
  return round2(apostas.reduce((acc, a) => acc + n(a.stake), 0));
}

/**
 * Streak atual: conta GREEN ou RED consecutivos a partir da aposta resolvida
 * mais recente (ordenada por data desc). Para no primeiro resultado misto
 * ou status que não seja GREEN/RED.
 */
export function currentStreak(
  apostasOrdenadasDesc: { status: StatusAposta }[]
): { tipo: "GREEN" | "RED" | null; contagem: number } {
  const relevantes = apostasOrdenadasDesc.filter((a) => a.status === "GREEN" || a.status === "RED");
  if (relevantes.length === 0) return { tipo: null, contagem: 0 };
  const tipo = relevantes[0].status as "GREEN" | "RED";
  let contagem = 0;
  for (const a of relevantes) {
    if (a.status === tipo) contagem++;
    else break;
  }
  return { tipo, contagem };
}

/**
 * Maior sequência histórica de GREEN e de RED (ordem cronológica asc).
 */
export function maioresSequencias(apostasOrdenadasAsc: { status: StatusAposta }[]) {
  let maiorGreen = 0;
  let maiorRed = 0;
  let atualGreen = 0;
  let atualRed = 0;
  for (const a of apostasOrdenadasAsc) {
    if (a.status === "GREEN") {
      atualGreen++;
      atualRed = 0;
    } else if (a.status === "RED") {
      atualRed++;
      atualGreen = 0;
    } else {
      continue;
    }
    maiorGreen = Math.max(maiorGreen, atualGreen);
    maiorRed = Math.max(maiorRed, atualRed);
  }
  return { maiorGreen, maiorRed };
}

export function unidadeSugerida(bancaTotal: Dec, percentual = 0.02) {
  return round2(n(bancaTotal) * percentual);
}
