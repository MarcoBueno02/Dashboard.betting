import type { Prisma, CategoriaRisco, StatusAposta } from "@prisma/client";

export type ApostasSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function buildApostaWhere(sp: ApostasSearchParams): Prisma.ApostaWhereInput {
  const where: Prisma.ApostaWhereInput = {};

  const casaId = first(sp.casaId);
  const competicaoId = first(sp.competicaoId);
  const mercadoId = first(sp.mercadoId);
  const status = first(sp.status);
  const risco = first(sp.risco);
  const de = first(sp.de);
  const ate = first(sp.ate);
  const q = first(sp.q);

  if (casaId) where.casaId = casaId;
  if (competicaoId) where.competicaoId = competicaoId;
  if (mercadoId) where.mercadoId = mercadoId;
  if (status) where.status = status as StatusAposta;
  if (risco) where.categoriaRisco = risco as CategoriaRisco;

  if (de || ate) {
    where.data = {};
    // "de"/"ate" são datas soltas (input type=date) para o dia local (BRT,
    // UTC-3) do usuário — sem o offset explícito, o servidor (UTC) leria os
    // limites do dia errado.
    if (de) where.data.gte = new Date(`${de}T00:00:00-03:00`);
    if (ate) where.data.lte = new Date(`${ate}T23:59:59-03:00`);
  }

  if (q) {
    where.OR = [
      { jogoDescricao: { contains: q, mode: "insensitive" } },
      { entradaDescricao: { contains: q, mode: "insensitive" } },
    ];
  }

  return where;
}

const SORT_FIELDS = new Set([
  "data",
  "odd",
  "stake",
  "lucroPrejuizo",
  "status",
  "criadaEm",
]);

export function buildApostaOrderBy(sp: ApostasSearchParams): Prisma.ApostaOrderByWithRelationInput {
  const sort = first(sp.sort);
  const dir = first(sp.dir) === "asc" ? "asc" : "desc";
  if (sort && SORT_FIELDS.has(sort)) {
    return { [sort]: dir };
  }
  return { data: "desc" };
}
