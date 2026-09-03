type NumericInput = number | string | { toString(): string } | null | undefined;

function toNumber(value: NumericInput): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

export function formatBRL(value: NumericInput) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(toNumber(value));
}

export function formatNumber(value: NumericInput, digits = 2) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toNumber(value));
}

export function formatPercent(value: NumericInput, digits = 1) {
  return `${formatNumber(value, digits)}%`;
}

// O app é usado só no Brasil (bancas, casas e jogos em horário BRT). O servidor
// (Vercel) roda em UTC, então sem fixar o timeZone aqui, um jogo que começou às
// 21h+ BRT (UTC-3) — muito comum no Brasileirão — vira o dia seguinte em UTC e
// aparece com a data errada na tela. BRT não observa horário de verão desde
// 2019, então o offset fixo é seguro.
const TZ = "America/Sao_Paulo";

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: TZ }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: TZ,
  }).format(date);
}

export function toInputDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
