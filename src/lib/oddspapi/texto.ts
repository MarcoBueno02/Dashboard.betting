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

function palavras(s: string): string[] {
  return s.split(" ").filter(Boolean);
}

/**
 * Um nome "cabe" no outro se todas as palavras do mais curto aparecem
 * (como palavra inteira, em qualquer ordem) no mais longo. Comparação por
 * palavra, não por substring contígua — "botafogo sp" precisa bater com
 * "botafogo fc sp" mesmo com o "fc" no meio quebrando a contiguidade
 * (bug real da Fase 3.4: nomes reais da fonte inserem um sufixo de tipo de
 * clube — "FC"/"EC"/"AC" — entre o nome e o sufixo de estado).
 */
function palavrasContidas(menor: string, maior: string): boolean {
  const doMenor = palavras(menor);
  const doMaior = new Set(palavras(maior));
  return doMenor.length > 0 && doMenor.every((p) => doMaior.has(p));
}

/**
 * Compara um nome já normalizado (`alvo`) contra o nome completo e o nome
 * curto (também normalizados) de um participante — igualdade exata, ou
 * correspondência por conjunto de palavras nos dois sentidos.
 */
export function nomeCorresponde(alvo: string, nomeCompleto: string, nomeCurto: string): boolean {
  if (!nomeCompleto && !nomeCurto) return false;
  if (nomeCompleto === alvo || nomeCurto === alvo) return true;

  return [nomeCompleto, nomeCurto].some(
    (nome) => nome.length > 0 && (palavrasContidas(alvo, nome) || palavrasContidas(nome, alvo))
  );
}
