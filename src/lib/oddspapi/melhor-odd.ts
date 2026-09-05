import { OddsPapiQuotaExceededError } from "./client";
import { resolverTournamentId } from "./torneios";
import { listarFixturesProximas } from "./fixtures";
import { encontrarFixture } from "./jogos";
import { parseEntrada } from "./mercados";
import { buscarOddsFixture } from "./odds";

// Casas confirmadas com odd real pras ligas já testadas (ver README, Fase
// 3). "betnacional" ainda não entra aqui — só depois de confirmado
// manualmente com um teste real (ver Seção 8 do prompt original: nunca usar
// antes de confirmar).
export const BOOKMAKERS_CONFIRMADAS = ["betano.bet.br", "estrelabet.bet.br", "superbet.bet.br"];

type Motivo = "torneio_nao_mapeado" | "jogo_nao_localizado" | "mercado_nao_suportado" | "sem_odd_nenhuma_casa" | "cota_excedida";

export type ResultadoMelhorOdd =
  | {
      encontrado: true;
      jogo: string;
      entrada: string;
      melhorOdd: number;
      casa: string;
      todasAsOdds: { casa: string; odd: number | null }[];
      atualizadoEm: string;
    }
  | { encontrado: false; motivo: Motivo };

/**
 * Fluxo completo da Fase 3 (ver Seção 5 do prompt original): resolve o
 * torneio, encontra o jogo, resolve o mercado/linha, busca odds nas casas
 * confirmadas e devolve a melhor — ou um motivo claro de não-encontrado.
 * Nunca inventa ou aproxima um valor.
 */
export async function buscarMelhorOdd(params: {
  jogo: string;
  competicao: string;
  mercado: string;
  entrada: string;
}): Promise<ResultadoMelhorOdd> {
  const { jogo, competicao, mercado, entrada } = params;

  const entradaResolvida = parseEntrada(mercado, entrada);
  if (!entradaResolvida) return { encontrado: false, motivo: "mercado_nao_suportado" };

  try {
    const torneio = await resolverTournamentId(competicao);
    if (!torneio) return { encontrado: false, motivo: "torneio_nao_mapeado" };

    const fixtures = await listarFixturesProximas(torneio.tournamentId);
    const fixture = encontrarFixture(jogo, fixtures);
    if (!fixture) return { encontrado: false, motivo: "jogo_nao_localizado" };

    const odds = await buscarOddsFixture(fixture.fixtureId, BOOKMAKERS_CONFIRMADAS);

    const todasAsOdds = BOOKMAKERS_CONFIRMADAS.map((casa) => {
      const mercadoCasa = odds.bookmakerOdds?.[casa]?.markets?.[String(entradaResolvida.marketId)];
      const outcome = mercadoCasa?.outcomes?.[String(entradaResolvida.outcomeId)];
      const player0 = outcome?.players?.["0"];
      const odd = player0?.active ? player0.price : null;
      return { casa, odd: odd ?? null };
    });

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
