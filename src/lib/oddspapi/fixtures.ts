import { oddsPapiGet } from "./client";
import { getCached, setCached } from "./cache";
import type { FixtureBasico } from "./jogos";

const FIXTURES_TTL_MS = 5 * 60 * 1000;
const JANELA_PASSADO_MS = 24 * 60 * 60 * 1000; // pega jogo que já começou/está ao vivo
const JANELA_FUTURO_MS = 14 * 24 * 60 * 60 * 1000;

type FixtureDto = FixtureBasico & { hasOdds: boolean };

/**
 * Fixtures de um torneio numa janela próxima (não busca o campeonato
 * inteiro toda vez, ver Fase 3 seção 5.2), cacheadas por alguns minutos pra
 * não gastar 1 requisição a cada consulta repetida na mesma rodada.
 */
export async function listarFixturesProximas(tournamentId: number): Promise<FixtureDto[]> {
  const chave = `fixtures:${tournamentId}`;
  const cached = await getCached<FixtureDto[]>(chave, FIXTURES_TTL_MS);
  if (cached) return cached;

  const agora = Date.now();
  const dados = await oddsPapiGet<FixtureDto[]>("/fixtures", {
    tournamentId,
    from: new Date(agora - JANELA_PASSADO_MS).toISOString(),
    to: new Date(agora + JANELA_FUTURO_MS).toISOString(),
    hasOdds: true,
    language: "pt",
  });

  await setCached(chave, dados);
  return dados;
}
