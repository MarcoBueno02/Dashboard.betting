import { prisma } from "@/lib/prisma";
import { oddsPapiGet } from "./client";
import { getCached, setCached } from "./cache";
import { normalizarNome } from "./texto";

const SPORT_ID_FUTEBOL = 10;
const TOURNAMENTS_CACHE_KEY = `tournaments:${SPORT_ID_FUTEBOL}:pt`;
const TOURNAMENTS_TTL_MS = 24 * 60 * 60 * 1000;

type TournamentDto = {
  tournamentId: number;
  tournamentName: string;
  categoryName: string;
};

async function listarTorneios(): Promise<TournamentDto[]> {
  const cached = await getCached<TournamentDto[]>(TOURNAMENTS_CACHE_KEY, TOURNAMENTS_TTL_MS);
  if (cached) return cached;

  const dados = await oddsPapiGet<TournamentDto[]>("/tournaments", {
    sportId: SPORT_ID_FUTEBOL,
    language: "pt",
  });
  await setCached(TOURNAMENTS_CACHE_KEY, dados);
  return dados;
}

/**
 * Tenta achar, sem adivinhar, um torneio da OddsPapi cujo nome corresponda
 * de forma inequívoca a `nomeCompeticao`: igualdade normalizada, ou um nome
 * contendo o outro desde que só um torneio do catálogo bata com esse
 * critério. Se mais de um candidato bater, ou nenhum, retorna null — nunca
 * escolhe "o mais parecido" às cegas.
 */
function encontrarCorrespondenciaUnica(
  nomeCompeticao: string,
  torneios: TournamentDto[]
): TournamentDto | null {
  const alvo = normalizarNome(nomeCompeticao);

  const exatos = torneios.filter((t) => normalizarNome(t.tournamentName) === alvo);
  if (exatos.length === 1) return exatos[0];
  if (exatos.length > 1) return null;

  const candidatos = torneios.filter((t) => {
    const nome = normalizarNome(t.tournamentName);
    return nome.includes(alvo) || alvo.includes(nome);
  });
  return candidatos.length === 1 ? candidatos[0] : null;
}

export type ResolucaoTorneio = { tournamentId: number; tournamentName: string };

/**
 * Resolve o tournamentId da OddsPapi pro nome de competição do dashboard.
 * 1. Tabela TorneioMapeamento (já resolvido antes, manual ou automático).
 * 2. Sob demanda: busca o catálogo de torneios (cacheado) e tenta uma
 *    correspondência inequívoca; se achar, grava em TorneioMapeamento pra
 *    não repetir a busca. Nunca vincula um nome ambíguo.
 */
export async function resolverTournamentId(nomeCompeticao: string): Promise<ResolucaoTorneio | null> {
  // Comparação normalizada (não findUnique por igualdade exata): a tabela
  // é seedada com o nome exato que o usuário nos passou, que pode diferir
  // em acento/caixa do Competicao.nome real gravado no banco.
  const alvo = normalizarNome(nomeCompeticao);
  const mapeamentos = await prisma.torneioMapeamento.findMany();
  const existente = mapeamentos.find((m) => normalizarNome(m.nomeInterno) === alvo);
  if (existente) return { tournamentId: existente.tournamentId, tournamentName: existente.tournamentName };

  const torneios = await listarTorneios();
  const match = encontrarCorrespondenciaUnica(nomeCompeticao, torneios);
  if (!match) return null;

  await prisma.torneioMapeamento.create({
    data: {
      nomeInterno: nomeCompeticao,
      tournamentId: match.tournamentId,
      tournamentName: match.tournamentName,
      confirmadoManualmente: false,
    },
  });

  return { tournamentId: match.tournamentId, tournamentName: match.tournamentName };
}
