import catalogo from "./catalogo-mercados.json";
import { semAcentos, normalizarNome, nomeCorresponde } from "./texto";

type MarketType = "totals" | "totals-corners" | "totals-bookings" | "bothteamsscore" | "1x2" | "1x2-corners" | "doublechance";
type Period = "fulltime" | "p1" | "p2";

type CatalogoMercado = {
  marketId: number;
  marketType: MarketType;
  period: Period;
  handicap: number;
  outcomes: { outcomeId: number; outcomeName: string }[];
};

const CATALOGO = catalogo as CatalogoMercado[];

export type EntradaResolvida = {
  marketId: number;
  outcomeId: number;
  outcomeName: string;
  marketType: MarketType;
  period: Period;
  handicap: number;
};

export type FixtureParaResolucao = { participant1Name: string; participant2Name: string };

/**
 * Resultado de `parseEntrada`. Mercados sem dependência de time (Gols/
 * Escanteios/Cartões O/U, Ambas Marcam) resolvem de cara — não precisam de
 * nenhuma chamada de API pra saber se são suportados. Mercados que citam um
 * lado ("Fluminense vence", "Mandante ou Empate") só podem ser resolvidos
 * depois de saber quem é participant1/participant2 na fixture real — por
 * isso viram um resolvedor adiado, chamado só depois do jogo ser
 * encontrado.
 */
export type EntradaParcial =
  | { pronta: true; resolvida: EntradaResolvida }
  | { pronta: false; resolver: (fixture: FixtureParaResolucao) => EntradaResolvida | null };

function detectarPeriodo(texto: string): Period {
  if (/\b1[ºo°]?\s*tempo\b|primeiro tempo|\b1t\b|\bht\b/.test(texto)) return "p1";
  if (/\b2[ºo°]?\s*tempo\b|segundo tempo|\b2t\b/.test(texto)) return "p2";
  return "fulltime";
}

function acharMercado(marketType: MarketType, period: Period, handicap: number): CatalogoMercado | undefined {
  return CATALOGO.find(
    (m) => m.marketType === marketType && m.period === period && Math.abs(m.handicap - handicap) < 0.001
  );
}

function acharOutcomePorNome(mercado: CatalogoMercado, nomeAlvo: string) {
  return mercado.outcomes.find((o) => normalizarNome(o.outcomeName) === nomeAlvo);
}

function resolvido(mercado: CatalogoMercado, outcome: { outcomeId: number; outcomeName: string }): EntradaResolvida {
  return {
    marketId: mercado.marketId,
    outcomeId: outcome.outcomeId,
    outcomeName: outcome.outcomeName,
    marketType: mercado.marketType,
    period: mercado.period,
    handicap: mercado.handicap,
  };
}

function parseAmbasMarcam(textoCompleto: string, period: Period): EntradaParcial | null {
  const querSim = /\bsim\b/.test(textoCompleto);
  const querNao = /\bnao\b/.test(textoCompleto);
  if (querSim === querNao) return null;

  const mercado = acharMercado("bothteamsscore", period, 0);
  if (!mercado) return null;
  const outcome = acharOutcomePorNome(mercado, querSim ? "sim" : "nao");
  if (!outcome) return null;

  return { pronta: true, resolvida: resolvido(mercado, outcome) };
}

function parseOverUnder(mercadoNome: string, entradaTexto: string, textoCompleto: string, period: Period): EntradaParcial | null {
  // Direção só pode vir da entrada, nunca do mercado combinado: o nome real
  // usado no app é literalmente "Over/Under Gols" (ver seed.ts) — que
  // contém as duas palavras ao mesmo tempo e quebrava a detecção quando
  // ambas eram buscadas no texto combinado (bug real da Fase 3, corrigido
  // na 3.1).
  const textoEntrada = semAcentos(entradaTexto).toLowerCase();
  const ehOver = /\b(mais de|over|acima de)\b/.test(textoEntrada);
  const ehUnder = /\b(menos de|under|abaixo de)\b/.test(textoEntrada);
  if (ehOver === ehUnder) return null;

  const numeroMatch = entradaTexto.match(/(\d+[.,]\d+|\d+)/);
  if (!numeroMatch) return null;
  const linha = parseFloat(numeroMatch[1].replace(",", "."));
  if (Number.isNaN(linha)) return null;

  const marketType: MarketType = /cart[aã]o|cartoes/.test(textoCompleto)
    ? "totals-bookings"
    : /escanteio|corner|canto/.test(textoCompleto)
      ? "totals-corners"
      : "totals";

  const mercado = acharMercado(marketType, period, linha);
  if (!mercado) return null;
  const outcome = acharOutcomePorNome(mercado, ehOver ? "mais" : "menos");
  if (!outcome) return null;

  return { pronta: true, resolvida: resolvido(mercado, outcome) };
}

/** "1", "x"/"empate", "2", "mandante"/"casa", "visitante"/"fora", ou um nome de time cru. */
type LadoOuTime = { lado: "1" | "x" | "2" } | { time: string };

function detectarLadoOuTime(entradaTexto: string): LadoOuTime | null {
  const limpo = entradaTexto.trim();
  const t = normalizarNome(limpo);

  if (/^(1x2)?\s*1$/.test(t)) return { lado: "1" };
  if (/^(1x2)?\s*2$/.test(t)) return { lado: "2" };
  if (t === "x" || /\bempate\b/.test(t)) return { lado: "x" };
  if (/\bmandante\b|\bcasa\b/.test(t)) return { lado: "1" };
  if (/\bvisitante\b|\bfora\b/.test(t)) return { lado: "2" };

  const nomeTime = limpo.replace(/\b(vence|vencer|ganha|ganhar)\b/gi, "").trim();
  return nomeTime ? { time: nomeTime } : null;
}

function resolverLado(alvo: LadoOuTime, fixture: FixtureParaResolucao): "1" | "x" | "2" | null {
  if ("lado" in alvo) return alvo.lado;

  const nome = normalizarNome(alvo.time);
  const p1 = normalizarNome(fixture.participant1Name);
  const p2 = normalizarNome(fixture.participant2Name);
  const bate1 = nomeCorresponde(nome, p1, "");
  const bate2 = nomeCorresponde(nome, p2, "");
  if (bate1 === bate2) return null; // nenhum time bateu, ou os dois — não adivinha

  return bate1 ? "1" : "2";
}

function parse1x2(marketType: "1x2" | "1x2-corners", entradaTexto: string, period: Period): EntradaParcial | null {
  const alvo = detectarLadoOuTime(entradaTexto);
  if (!alvo) return null;

  const resolverOutcome = (lado: "1" | "x" | "2") => {
    const mercado = acharMercado(marketType, period, 0);
    if (!mercado) return null;
    const outcome = acharOutcomePorNome(mercado, lado);
    if (!outcome) return null;
    return resolvido(mercado, outcome);
  };

  if ("lado" in alvo) {
    const resolvida = resolverOutcome(alvo.lado);
    return resolvida ? { pronta: true, resolvida } : null;
  }

  return {
    pronta: false,
    resolver: (fixture) => {
      const lado = resolverLado(alvo, fixture);
      return lado ? resolverOutcome(lado) : null;
    },
  };
}

function parseDuplaChance(entradaTexto: string, period: Period): EntradaParcial | null {
  const direto = normalizarNome(entradaTexto).replace(/\s+/g, "");
  const diretoParaOutcome: Record<string, string> = { "1x": "1x", "12": "12", x2: "2x", "2x": "2x" };
  if (diretoParaOutcome[direto]) {
    return resolverDuplaChanceOutcome(diretoParaOutcome[direto], period);
  }

  const partes = entradaTexto.split(/\bou\b/i).map((p) => p.trim()).filter(Boolean);
  if (partes.length !== 2) return null;

  const lados = partes.map(detectarLadoOuTime);
  if (lados.some((l) => l === null)) return null;
  const [a, b] = lados as LadoOuTime[];

  const combinar = (la: "1" | "x" | "2", lb: "1" | "x" | "2"): string | null => {
    const par = [la, lb].sort().join("");
    if (par === "1x") return "1x";
    if (par === "2x") return "2x";
    if (par === "12") return "12";
    return null;
  };

  const ambosProntos = "lado" in a && "lado" in b;
  if (ambosProntos) {
    const par = combinar((a as { lado: "1" | "x" | "2" }).lado, (b as { lado: "1" | "x" | "2" }).lado);
    return par ? resolverDuplaChanceOutcome(par, period) : null;
  }

  return {
    pronta: false,
    resolver: (fixture) => {
      const ladoA = resolverLado(a, fixture);
      const ladoB = resolverLado(b, fixture);
      if (!ladoA || !ladoB) return null;
      const par = combinar(ladoA, ladoB);
      if (!par) return null;
      const parcial = resolverDuplaChanceOutcome(par, period);
      return parcial?.pronta ? parcial.resolvida : null;
    },
  };
}

function resolverDuplaChanceOutcome(par: string, period: Period): EntradaParcial | null {
  const mercado = acharMercado("doublechance", period, 0);
  if (!mercado) return null;
  const outcome = acharOutcomePorNome(mercado, par);
  if (!outcome) return null;
  return { pronta: true, resolvida: resolvido(mercado, outcome) };
}

/**
 * Traduz (mercado + entrada) do formato livre do dashboard pro marketId +
 * outcomeId da OddsPapi. Nunca adivinha: qualquer padrão não reconhecido
 * retorna null sem gastar nenhuma chamada de API. Mercados que dependem de
 * saber quem é qual time (Resultado, Dupla Chance) retornam um resolvedor
 * adiado — só executado depois que o jogo real já foi encontrado.
 */
export function parseEntrada(mercadoNome: string, entradaTexto: string): EntradaParcial | null {
  const textoCompleto = semAcentos(`${mercadoNome} ${entradaTexto}`).toLowerCase();
  const nomeMercadoNorm = semAcentos(mercadoNome).toLowerCase();
  const period = detectarPeriodo(textoCompleto);

  // Mercados compostos/exóticos já cadastrados no app (ex: "Resultado/DC",
  // "Resultado/DC/DNB") não correspondem a um único mercado da OddsPapi —
  // são produtos combinados de casa específica. Recusar explicitamente em
  // vez de deixar "dc" ou "resultado" acionar o mercado errado por engano.
  const ehComposto = /\bdnb\b/.test(nomeMercadoNorm) || (/\bdc\b/.test(nomeMercadoNorm) && !/dupla chance/.test(nomeMercadoNorm));
  if (ehComposto) return null;

  if (/ambas\s*(as\s*)?(equipes\s*|times\s*)?marca/.test(textoCompleto)) {
    return parseAmbasMarcam(textoCompleto, period);
  }

  if (/dupla chance/.test(textoCompleto)) {
    return parseDuplaChance(entradaTexto, period);
  }

  if (/resultado|\b1x2\b/.test(textoCompleto) && !/cart[aã]o|cartoes|escanteio|corner|canto/.test(textoCompleto)) {
    return parse1x2("1x2", entradaTexto, period);
  }

  if (/escanteio|corner|canto/.test(textoCompleto) && /\b1x2\b|resultado/.test(textoCompleto)) {
    return parse1x2("1x2-corners", entradaTexto, period);
  }

  const overUnder = parseOverUnder(mercadoNome, entradaTexto, textoCompleto, period);
  if (overUnder) return overUnder;

  return null;
}
