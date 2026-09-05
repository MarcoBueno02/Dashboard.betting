import { OddsPapiQuotaExceededError } from "./client";
import { resolverTournamentId } from "./torneios";
import { listarFixturesProximas } from "./fixtures";
import { encontrarFixture } from "./jogos";
import { parseEntrada, type EntradaResolvida } from "./mercados";
import { buscarOddsFixture } from "./odds";

// Casas confirmadas com odd real pras ligas já testadas (ver README, Fase
// 3). "betnacional" ainda não entra aqui — só depois de confirmado
// manualmente com um teste real (ver Seção 8 do prompt original: nunca usar
// antes de confirmar).
export const BOOKMAKERS_CONFIRMADAS = ["betano.bet.br", "estrelabet.bet.br", "superbet.bet.br"];

type Motivo = "torneio_nao_mapeado" | "jogo_nao_localizado" | "mercado_nao_suportado" | "sem_odd_nenhuma_casa" | "cota_excedida";

type OddPorCasa = { casa: string; odd: number | null; erro?: string };

export type ResultadoMelhorOdd =
  | {
      encontrado: true;
      jogo: string;
      entrada: string;
      melhorOdd: number;
      casa: string;
      todasAsOdds: OddPorCasa[];
      atualizadoEm: string;
    }
  | { encontrado: false; motivo: Motivo };

/**
 * Extrai a odd de um bookmaker específico pro marketId/outcomeId já
 * resolvido. Distingue explicitamente duas situações que antes colapsavam
 * as duas em `null` (bug real encontrado em produção, Fase 3.1 seção 0):
 * "essa casa não tem esse mercado agora" (odd: null, sem `erro` — a forma
 * mais comum e normal) vs. "a resposta da API veio num formato que o
 * código não esperava" (`erro` preenchido — um bug de parsing de verdade,
 * não deve nunca se disfarçar de simplesmente "sem odd").
 */
function extrairOdd(
  bookmakerOdds: Record<string, unknown> | undefined,
  casa: string,
  entradaResolvida: EntradaResolvida
): OddPorCasa {
  try {
    const dadosCasa = bookmakerOdds?.[casa] as
      | { markets?: Record<string, { outcomes?: Record<string, { players?: Record<string, { active: boolean; price: number }> }> }> }
      | undefined;
    if (!dadosCasa) return { casa, odd: null };

    const mercado = dadosCasa.markets?.[String(entradaResolvida.marketId)];
    if (!mercado) return { casa, odd: null };

    const outcome = mercado.outcomes?.[String(entradaResolvida.outcomeId)];
    if (!outcome) return { casa, odd: null };

    const player0 = outcome.players?.["0"];
    if (!player0) return { casa, odd: null };

    if (typeof player0.price !== "number") {
      return { casa, odd: null, erro: `campo "price" ausente ou não-numérico: ${JSON.stringify(player0)}` };
    }

    return { casa, odd: player0.active ? player0.price : null };
  } catch (err) {
    return { casa, odd: null, erro: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fluxo completo (ver Seção 5 do prompt original da Fase 3, ampliado na
 * Fase 3.1): resolve o torneio, encontra o jogo, resolve o mercado/linha
 * (alguns mercados só depois de saber quem é participant1/participant2 —
 * ver EntradaParcial em mercados.ts), busca odds nas casas confirmadas e
 * devolve a melhor — ou um motivo claro de não-encontrado. Nunca inventa
 * ou aproxima um valor.
 */
export async function buscarMelhorOdd(params: {
  jogo: string;
  competicao: string;
  mercado: string;
  entrada: string;
}): Promise<ResultadoMelhorOdd> {
  const { jogo, competicao, mercado, entrada } = params;

  const parcial = parseEntrada(mercado, entrada);
  if (!parcial) return { encontrado: false, motivo: "mercado_nao_suportado" };

  try {
    const torneio = await resolverTournamentId(competicao);
    if (!torneio) return { encontrado: false, motivo: "torneio_nao_mapeado" };

    const fixtures = await listarFixturesProximas(torneio.tournamentId);
    const fixture = encontrarFixture(jogo, fixtures);
    if (!fixture) return { encontrado: false, motivo: "jogo_nao_localizado" };

    const entradaResolvida = parcial.pronta ? parcial.resolvida : parcial.resolver(fixture);
    if (!entradaResolvida) return { encontrado: false, motivo: "mercado_nao_suportado" };

    const odds = await buscarOddsFixture(fixture.fixtureId, BOOKMAKERS_CONFIRMADAS);

    const todasAsOdds = BOOKMAKERS_CONFIRMADAS.map((casa) => extrairOdd(odds.bookmakerOdds, casa, entradaResolvida));

    const disponiveis = todasAsOdds.filter((o): o is { casa: string; odd: number } => o.odd !== null);
    if (disponiveis.length === 0) return { encontrado: false, motivo: "sem_odd_nenhuma_casa" };

    const melhor = disponiveis.reduce((max, cur) => (cur.odd > max.odd ? cur : max));

    return {
      encontrado: true,
      jogo,
      entrada,
      melhorOdd: melhor.odd,
      casa: melhor.casa,
      todasAsOdds,
      atualizadoEm: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof OddsPapiQuotaExceededError) return { encontrado: false, motivo: "cota_excedida" };
    throw err;
  }
}
