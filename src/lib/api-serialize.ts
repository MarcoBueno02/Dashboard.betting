import type { Prisma, PrismaClient, Casa } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TxOrClient = PrismaClient | Prisma.TransactionClient;

type ApostaComRelacoes = Prisma.ApostaGetPayload<{
  include: { casa: true; competicao: true; mercado: true };
}>;

function toNum(v: Prisma.Decimal | null | undefined): number | null {
  return v === null || v === undefined ? null : Number(v);
}

/**
 * Formato de resposta da API: usa nomes (competicao/jogo/mercado/entrada/casa)
 * em vez dos campos internos do Prisma (competicaoId/jogoDescricao/...) —
 * mais simples pra um cliente que não guarda os IDs internos entre chamadas.
 */
export function serializeAposta(a: ApostaComRelacoes) {
  return {
    id: a.id,
    data: a.data.toISOString(),
    competicao: a.competicao.nome,
    jogo: a.jogoDescricao,
    mercado: a.mercado.nome,
    entrada: a.entradaDescricao,
    casa: a.casa.nome,
    odd: Number(a.odd),
    stake: Number(a.stake),
    pJusta: toNum(a.pJusta),
    evPercentual: toNum(a.evPercentual),
    categoriaRisco: a.categoriaRisco,
    omaEfetiva: toNum(a.omaEfetiva),
    status: a.status,
    retornoReal: toNum(a.retornoReal),
    lucroPrejuizo: toNum(a.lucroPrejuizo),
    travaAtiva: a.travaAtiva,
    notas: a.notas,
  };
}

export function serializeCasa(c: Casa) {
  return {
    id: c.id,
    nome: c.nome,
    saldoAtual: Number(c.saldoAtual),
    ativa: c.ativa,
  };
}

type TravaComRelacoes = Prisma.TravaGetPayload<{
  include: { competicao: true; mercado: true };
}>;

export function serializeTrava(t: TravaComRelacoes) {
  return {
    id: t.id,
    competicao: t.competicao?.nome ?? null,
    mercado: t.mercado.nome,
    status: t.status,
    tetoRisco: t.tetoRisco,
    motivoAtivacao: t.motivoAtivacao,
    dataAtivacao: t.dataAtivacao.toISOString(),
    dataRemocao: t.dataRemocao ? t.dataRemocao.toISOString() : null,
    rodadasPositivasConsecutivas: t.rodadasPositivasConsecutivas,
  };
}

/** Resolve uma casa por id (cuid) ou por nome exato. */
export async function resolveCasa(nomeOuId: string) {
  return prisma.casa.findFirst({
    where: { OR: [{ id: nomeOuId }, { nome: nomeOuId }] },
  });
}

/** Busca-ou-cria uma Competicao pelo nome exato (mesmo comportamento do resto do app). */
export async function upsertCompeticao(nome: string, tx: TxOrClient = prisma) {
  return tx.competicao.upsert({
    where: { nome },
    update: {},
    create: { nome },
  });
}

/** Busca-ou-cria um Mercado pelo nome exato (mesmo comportamento do resto do app). */
export async function upsertMercado(nome: string, tx: TxOrClient = prisma) {
  return tx.mercado.upsert({
    where: { nome },
    update: {},
    create: { nome },
  });
}

/**
 * Busca-ou-cria uma Casa pelo nome exato. Diferente de Competicao/Mercado,
 * criar uma casa tem efeito colateral financeiro (ela passa a contar na
 * banca total), então cria com saldo zerado e um snapshot inicial.
 */
export async function upsertCasa(nome: string, tx: TxOrClient = prisma) {
  const existente = await tx.casa.findUnique({ where: { nome } });
  if (existente) return existente;
  return tx.casa.create({
    data: {
      nome,
      saldoAtual: 0,
      snapshots: { create: { saldo: 0, origem: "CONFIRMACAO_MANUAL" } },
    },
  });
}

/** Parseia uma data solta "YYYY-MM-DD" como meio-dia BRT (evita virar o dia adjacente). */
export function parseDataOnlyBRT(value: string): Date {
  return new Date(`${value}T12:00:00-03:00`);
}
