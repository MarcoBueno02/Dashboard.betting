import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiToken, apiError } from "@/lib/api-auth";
import { serializeTrava, upsertCompeticao, upsertMercado, parseDataOnlyBRT } from "@/lib/api-serialize";
import type { StatusTrava } from "@prisma/client";

const INCLUDE = { competicao: true, mercado: true } as const;
const categoriaRiscoValues = ["BAIXO", "MEDIO", "MEDIO_ALTO", "ALTO_ESPECULATIVO"] as const;

export async function GET(request: NextRequest) {
  const unauthorized = requireApiToken(request);
  if (unauthorized) return unauthorized;

  const status = request.nextUrl.searchParams.get("status");
  if (status && status !== "ATIVA" && status !== "REMOVIDA") {
    return apiError(400, '"status" precisa ser "ATIVA" ou "REMOVIDA"', "status");
  }

  const travas = await prisma.trava.findMany({
    where: status ? { status: status as StatusTrava } : undefined,
    orderBy: [{ status: "asc" }, { dataAtivacao: "desc" }],
    include: INCLUDE,
  });

  return NextResponse.json({ travas: travas.map(serializeTrava) });
}

const bodySchema = z.object({
  competicao: z.string().trim().min(1).nullable().optional(),
  mercado: z.string().trim().min(1, "\"mercado\" é obrigatório"),
  tetoRisco: z.enum(categoriaRiscoValues, { message: "\"tetoRisco\" precisa ser uma categoria de risco válida" }),
  motivoAtivacao: z.string().trim().min(1, "\"motivoAtivacao\" é obrigatório"),
  dataAtivacao: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const unauthorized = requireApiToken(request);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "Corpo da requisição precisa ser JSON válido");
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return apiError(400, issue?.message ?? "Dados inválidos", issue?.path.join("."));
  }
  const d = parsed.data;

  let trava;
  try {
    trava = await prisma.$transaction(async (tx) => {
      const mercado = await upsertMercado(d.mercado, tx);
      const competicao = d.competicao ? await upsertCompeticao(d.competicao, tx) : null;

      return tx.trava.create({
        data: {
          competicaoId: competicao?.id ?? null,
          mercadoId: mercado.id,
          tetoRisco: d.tetoRisco,
          motivoAtivacao: d.motivoAtivacao,
          status: "ATIVA",
          ...(d.dataAtivacao ? { dataAtivacao: parseDataOnlyBRT(d.dataAtivacao) } : {}),
        },
        include: INCLUDE,
      });
    });
  } catch (err) {
    return apiError(500, err instanceof Error ? err.message : "Erro ao criar trava");
  }

  return NextResponse.json({ trava: serializeTrava(trava) }, { status: 201 });
}
