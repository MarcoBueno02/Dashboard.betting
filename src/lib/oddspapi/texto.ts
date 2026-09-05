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

/**
 * Compara um nome já normalizado (`alvo`) contra o nome completo e o nome
 * curto (também normalizados) de um participante — igualdade exata, ou um
 * contendo o outro, com tolerância a abreviação.
 */
export function nomeCorresponde(alvo: string, nomeCompleto: string, nomeCurto: string): boolean {
  if (!nomeCompleto && !nomeCurto) return false;
  if (nomeCompleto === alvo || nomeCurto === alvo) return true;
  return (
    (nomeCompleto.length > 0 && (nomeCompleto.includes(alvo) || alvo.includes(nomeCompleto))) ||
    (nomeCurto.length > 0 && nomeCurto === alvo)
  );
}
