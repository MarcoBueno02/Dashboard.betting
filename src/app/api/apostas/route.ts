import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { Prisma, type StatusAposta } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiToken, apiError } from "@/lib/api-auth";
import { serializeAposta, upsertCasa, upsertCompeticao, upsertMercado } from "@/lib/api-serialize";
import { parseDataInputBRT } from "@/lib/betting";
import { isTravaAtiva } from "@/lib/trava";

const INCLUDE = { casa: true, competicao: true, mercado: true } as const;

const categoriaRiscoValues = ["BAIXO", "MEDIO", "MEDIO_ALTO", "ALTO_ESPECULATIVO"] as const;

const apostaInputSchema = z.object({
  data: z.string().min(1, "\"data\" é obrigatória (formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm)"),
  competicao: z.string().trim().min(1, "\"competicao\" é obrigatória"),
  jogo: z.string().trim().min(1, "\"jogo\" é obrigatório"),
  mercado: z.string().trim().min(1, "\"mercado\" é obrigatório"),
  entrada: z.string().trim().min(1, "\"entrada\" é obrigatória"),
  casa: z.string().trim().min(1, "\"casa\" é obrigatória"),
  odd: z.number().gt(1, "\"odd\" deve ser maior que 1"),
  stake: z.number().gt(0, "\"stake\" deve ser maior que 0"),
  pJusta: z.number().nullable().optional(),
  evPercentual: z.number().nullable().optional(),
  categoriaRisco: z.enum(categoriaRiscoValues).nullable().optional(),
  omaEfetiva: z.number().nullable().optional(),
  travaAtiva: z.boolean().optional(),
  notas: z.string().trim().nullable().optional(),
});

function parseDataAposta(value: string): Date {
  // Aceita tanto "YYYY-MM-DD" quanto "YYYY-MM-DDTHH:mm" — ambos interpretados
  // como horário local de Brasília (o app só é usado no Brasil).
  return value.includes("T") ? parseDataInputBRT(value) : new Date(`${value}T12:00:00-03:00`);
}

export async function POST(request: NextRequest) {
  const unauthorized = requireApiToken(request);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "Corpo da requisição precisa ser JSON válido");
  }

  const items = Array.isArray(body) ? body : [body];
  if (items.length === 0) {
    return apiError(400, "Envie um objeto de aposta ou um array com pelo menos um item");
  }

  const parsedItems: z.infer<typeof apostaInputSchema>[] = [];
  for (let i = 0; i < items.length; i++) {
    const parsed = apostaInputSchema.safeParse(items[i]);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const prefix = items.length > 1 ? `item[${i}]: ` : "";
      return apiError(400, `${prefix}${issue?.message ?? "Dados inválidos"}`, issue?.path.join("."));
    }
    parsedItems.push(parsed.data);
  }

  const criadas = await prisma.$transaction(async (tx) => {
    const resultado = [];
    for (const item of parsedItems) {
      const [competicao, mercado, casa] = await Promise.all([
        upsertCompeticao(item.competicao, tx),
        upsertMercado(item.mercado, tx),
        upsertCasa(item.casa, tx),
      ]);
      const travaAtiva = item.travaAtiva ?? (await isTravaAtiva(tx, competicao.id, mercado.id));

      const aposta = await tx.aposta.create({
        data: {
          data: parseDataAposta(item.data),
          competicaoId: competicao.id,
          jogoDescricao: item.jogo,
          mercadoId: mercado.id,
          entradaDescricao: item.entrada,
          casaId: casa.id,
          odd: item.odd,
          stake: item.stake,
          pJusta: item.pJusta ?? null,
          evPercentual: item.evPercentual ?? null,
          categoriaRisco: item.categoriaRisco ?? null,
          omaEfetiva: item.omaEfetiva ?? null,
          travaAtiva,
          notas: item.notas ?? null,
        },
        include: INCLUDE,
      });
      resultado.push(aposta);
    }
    return resultado;
  });

  return NextResponse.json({ criadas: criadas.map(serializeAposta) }, { status: 201 });
}

const querySchema = z.object({
  competicao: z.string().optional(),
  mercado: z.string().optional(),
  status: z.enum(["PENDENTE", "GREEN", "RED", "REEMBOLSO", "MEIA_GREEN", "MEIA_RED", "CANCELADA"]).optional(),
  de: z.string().optional(),
  ate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const unauthorized = requireApiToken(request);
  if (unauthorized) return unauthorized;

  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(sp);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return apiError(400, issue?.message ?? "Parâmetros inválidos", issue?.path.join("."));
  }
  const { competicao, mercado, status, de, ate } = parsed.data;

  const where: Prisma.ApostaWhereInput = {};
  if (competicao) where.competicao = { nome: competicao };
  if (mercado) where.mercado = { nome: mercado };
  if (status) where.status = status as StatusAposta;
  if (de || ate) {
    where.data = {};
    if (de) where.data.gte = new Date(`${de}T00:00:00-03:00`);
    if (ate) where.data.lte = new Date(`${ate}T23:59:59-03:00`);
  }

  const apostas = await prisma.aposta.findMany({
    where,
    orderBy: { data: "desc" },
    include: INCLUDE,
    take: 200,
  });

  return NextResponse.json({ apostas: apostas.map(serializeAposta) });
}
