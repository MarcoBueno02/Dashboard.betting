import { oddsPapiGet } from "./client";
import { getCached, setCached } from "./cache";

const ODDS_TTL_MS = 5 * 60 * 1000;

export type OddsResponse = {
  fixtureId: string;
  bookmakerOdds?: Record<
    string,
    {
      suspended?: boolean;
      markets?: Record<
        string,
        {
          marketActive?: boolean;
          outcomes?: Record<
            string,
            {
              players?: Record<string, { active: boolean; price: number }>;
            }
          >;
        }
      >;
    }
  >;
};

/**
 * Odds de um fixture nas casas pedidas, cacheadas por ODDS_TTL_MS — odds
 * pré-jogo não mudam segundo a segundo, e a cota é de só 250/mês (ver Fase
 * 3 seção 6).
 */
export async function buscarOddsFixture(fixtureId: string, bookmakers: string[]): Promise<OddsResponse> {
  const bookmakersKey = [...bookmakers].sort().join(",");
  const chave = `odds:${fixtureId}:${bookmakersKey}`;

  const cached = await getCached<OddsResponse>(chave, ODDS_TTL_MS);
  if (cached) return cached;

  const dados = await oddsPapiGet<OddsResponse>("/odds", {
    fixtureId,
    bookmakers: bookmakersKey,
    language: "pt",
  });

  await setCached(chave, dados);
  return dados;
}
