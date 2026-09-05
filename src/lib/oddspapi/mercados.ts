import catalogo from "./catalogo-mercados.json";
import { semAcentos, normalizarNome } from "./texto";

type MarketType = "totals" | "totals-corners" | "bothteamsscore";
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

function detectarPeriodo(texto: string): Period {
  if (/\b1[ºo°]?\s*tempo\b|primeiro tempo|\b1t\b/.test(texto)) return "p1";
  if (/\b2[ºo°]?\s*tempo\b|segundo tempo|\b2t\b/.test(texto)) return "p2";
  return "fulltime";
}

function acharMercado(marketType: MarketType, period: Period, handicap: number): CatalogoMercado | undefined {
  return CATALOGO.find(
    (m) => m.marketType === marketType && m.period === period && Math.abs(m.handicap - handicap) < 0.001
  );
}

function acharOutcome(mercado: CatalogoMercado, nomeAlvo: string) {
  return mercado.outcomes.find((o) => normalizarNome(o.outcomeName) === nomeAlvo);
}

/**
 * Traduz (mercado + entrada) do formato livre do dashboard pro marketId +
 * outcomeId da OddsPapi. Nunca adivinha: qualquer padrão não reconhecido
 * (ex: "Resultado Mandante") ou qualquer menção a cartões (mercado que
 * sabemos não ter odd real disponível — ver Fase 3, seção 0) retorna null
 * sem gastar nenhuma chamada de API.
 */
export function parseEntrada(mercadoNome: string, entradaTexto: string): EntradaResolvida | null {
  const textoCompleto = semAcentos(`${mercadoNome} ${entradaTexto}`).toLowerCase();

  // Nunca buscar odd de Cartões — confirmado que essa integração não tem
  // esse mercado com odd real de partida (só prop por jogador).
  if (/cart[aã]o|cartoes/.test(textoCompleto)) return null;

  const period = detectarPeriodo(textoCompleto);

  if (/ambas\s*(as\s*)?(equipes\s*|times\s*)?marca/.test(textoCompleto)) {
    const querSim = /\bsim\b/.test(textoCompleto);
    const querNao = /\bnao\b/.test(textoCompleto);
    if (querSim === querNao) return null; // nem um nem outro, ou os dois — ambíguo

    const mercado = acharMercado("bothteamsscore", period, 0);
    if (!mercado) return null;
    const outcome = acharOutcome(mercado, querSim ? "sim" : "nao");
    if (!outcome) return null;

    return {
      marketId: mercado.marketId,
      outcomeId: outcome.outcomeId,
      outcomeName: outcome.outcomeName,
      marketType: mercado.marketType,
      period: mercado.period,
      handicap: mercado.handicap,
    };
  }

  const ehOver = /\b(mais de|over|acima de)\b/.test(textoCompleto);
  const ehUnder = /\b(menos de|under|abaixo de)\b/.test(textoCompleto);
  if (ehOver === ehUnder) return null; // não achou direção, ou achou as duas

  const numeroMatch = entradaTexto.match(/(\d+[.,]\d+|\d+)/);
  if (!numeroMatch) return null;
  const linha = parseFloat(numeroMatch[1].replace(",", "."));
  if (Number.isNaN(linha)) return null;

  const marketType: MarketType = /escanteio|corner|canto/.test(textoCompleto) ? "totals-corners" : "totals";

  const mercado = acharMercado(marketType, period, linha);
  if (!mercado) return null;
  const outcome = acharOutcome(mercado, ehOver ? "mais" : "menos");
  if (!outcome) return null;

  return {
    marketId: mercado.marketId,
    outcomeId: outcome.outcomeId,
    outcomeName: outcome.outcomeName,
    marketType: mercado.marketType,
    period: mercado.period,
    handicap: mercado.handicap,
  };
}
