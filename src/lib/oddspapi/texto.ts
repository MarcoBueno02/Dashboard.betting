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

// Sigla de UF <-> gentílico do estado, quando aparece como sufixo do nome
// de um time — regra geográfica fechada (27 unidades federativas), não um
// alias de time específico. A fonte de dados mistura as duas convenções
// até pro mesmo estado ("Atlético Mineiro" usa o gentílico, "Cruzeiro MG"
// usa a sigla crua), então nenhuma das duas formas pode ser assumida como
// a única válida (bug real da Fase 3.6: "Athletico PR" não batia com
// "Atlético Paranaense" porque "pr" não é a mesma palavra que "paranaense").
const SIGLA_UF_PARA_GENTILICO: Record<string, string> = {
  ac: "acreano",
  al: "alagoano",
  ap: "amapaense",
  am: "amazonense",
  ba: "baiano",
  ce: "cearense",
  df: "brasiliense",
  es: "capixaba",
  go: "goiano",
  ma: "maranhense",
  mt: "matogrossense",
  ms: "sulmatogrossense",
  mg: "mineiro",
  pa: "paraense",
  pb: "paraibano",
  pr: "paranaense",
  pe: "pernambucano",
  pi: "piauiense",
  rj: "fluminense",
  rn: "potiguar",
  rs: "gaucho",
  ro: "rondoniense",
  rr: "roraimense",
  sc: "catarinense",
  sp: "paulista",
  se: "sergipano",
  to: "tocantinense",
};

/**
 * Variantes conhecidas de uma palavra pra fins de comparação de nome de
 * time: sigla de UF <-> gentílico, e a grafia com "th" que alguns clubes
 * readotaram historicamente (o caso conhecido é Athletico Paranaense — a
 * OddsPapi usa a grafia tradicional "Atlético", sem h; a regra em si
 * ("th" equivale a "t") é genérica, não hardcoded pra esse time).
 */
function variantesDePalavra(p: string): string[] {
  const variantes = [p];
  const gentilico = SIGLA_UF_PARA_GENTILICO[p];
  if (gentilico) variantes.push(gentilico);
  if (p.includes("th")) variantes.push(p.replace(/th/g, "t"));
  return variantes;
}

function conjuntoExpandido(s: string): Set<string> {
  const set = new Set<string>();
  for (const p of palavras(s)) {
    for (const v of variantesDePalavra(p)) set.add(v);
  }
  return set;
}

/**
 * Um nome "cabe" no outro se todas as palavras do mais curto aparecem
 * (como palavra inteira, em qualquer ordem, com variantes — ver
 * variantesDePalavra) no mais longo. Comparação por palavra, não por
 * substring contígua — "botafogo sp" precisa bater com "botafogo fc sp"
 * mesmo com o "fc" no meio quebrando a contiguidade (bug real da Fase 3.4:
 * nomes reais da fonte inserem um sufixo de tipo de clube — "FC"/"EC"/"AC"
 * — entre o nome e o sufixo de estado).
 */
function palavrasContidas(menor: string, maior: string): boolean {
  const doMenor = palavras(menor);
  if (doMenor.length === 0) return false;
  const doMaiorExpandido = conjuntoExpandido(maior);
  return doMenor.every((p) => variantesDePalavra(p).some((v) => doMaiorExpandido.has(v)));
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
