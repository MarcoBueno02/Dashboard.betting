export function semAcentos(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Normalização agressiva pra comparar nomes (torneios, times): só letras/números/espaço. */
export function normalizarNome(s: string): string {
  return semAcentos(s)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
