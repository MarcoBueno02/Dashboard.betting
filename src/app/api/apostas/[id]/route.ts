import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiToken, apiError } from "@/lib/api-auth";
import { serializeAposta, upsertCasa, upsertCompeticao, upsertMercado } from "@/lib/api-serialize";
import { computeEvPercentual } from "@/lib/betting";

const INCLUDE = { casa: true, competicao: true, mercado: true } as const;
const categoriaRiscoValues = ["BAIXO", "MEDIO", "MEDIO_ALTO", "ALTO_ESPECULATIVO"] as const;

const bodySchema = z
  .object({
    casa: z.string().trim().min(1, '"casa" não pode ser vazia').optional(),
    odd: z.number().gt(1, '"odd" deve ser maior que 1').optional(),
    stake: z.number().gt(0, '"stake" deve ser maior que 0').optional(),
    entrada: z.string().trim().min(1, '"entrada" não pode ser vazia').optional(),
    mercado: z.string().trim().min(1, '"mercado" não pode ser vazio').optional(),
    competicao: z.string().trim().min(1, '"competicao" não pode ser vazia').optional(),
    notas: z.string().trim().nullable().optional(),
    categoriaRisco: z.enum(categoriaRiscoValues).nullable().optional(),
    pJusta: z.number().nullable().optional(),
    evPercentual: z.number().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Envie pelo menos um campo para atualizar" });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = requireApiToken(request);
  if (unauthorized) return unauthorized;

  const { id } = await params;

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

  const existente = await prisma.aposta.findUnique({ where: { id } });
  if (!existente) return apiError(404, `Aposta "${id}" não encontrada`);

  if (existente.status !== "PENDENTE") {
    return apiError(
      400,
      `Aposta já resolvida (status "${existente.status}"), use /resultado se for corrigir o resultado, ou entre em contato se for erro de digitação no histórico`
    );
  }

  // evPercentual explícito no corpo sempre vence. Sem isso, só recalcula se
  // odd e/ou pJusta vieram na edição E os dois valores (novo ou já
  // existente) estiverem disponíveis — nunca inventa um EV com dado faltando.
  let evPercentual: number | null | undefined = d.evPercentual;
  if (evPercentual === undefined && ("odd" in d || "pJusta" in d)) {
    const oddFinal = d.odd ?? Number(existente.odd);
    const pJustaFinal = "pJusta" in d ? d.pJusta : existente.pJusta === null ? null : Number(existente.pJusta);
    if (pJustaFinal !== null && pJustaFinal !== undefined) {
      evPercentual = computeEvPercentual(pJustaFinal, oddFinal);
    }
  }

  let atualizada;
  try {
    atualizada = await prisma.$transaction(
      async (tx) => {
        const [casa, competicao, mercado] = await Promise.all([
          d.casa !== undefined ? upsertCasa(d.casa, tx) : null,
          d.competicao !== undefined ? upsertCompeticao(d.competicao, tx) : null,
          d.mercado !== undefined ? upsertMercado(d.mercado, tx) : null,
        ]);

        return tx.aposta.update({
          where: { id },
          data: {
            ...(casa ? { casaId: casa.id } : {}),
            ...(competicao ? { competicaoId: competicao.id } : {}),
            ...(mercado ? { mercadoId: mercado.id } : {}),
            ...("odd" in d ? { odd: d.odd } : {}),
            ...("stake" in d ? { stake: d.stake } : {}),
            ...("entrada" in d ? { entradaDescricao: d.entrada } : {}),
            ...("notas" in d ? { notas: d.notas } : {}),
            ...("categoriaRisco" in d ? { categoriaRisco: d.categoriaRisco } : {}),
            ...("pJusta" in d ? { pJusta: d.pJusta } : {}),
            ...(evPercentual !== undefined ? { evPercentual } : {}),
          },
          include: INCLUDE,
        });
      },
      { timeout: 20_000, maxWait: 10_000 }
    );
  } catch (err) {
    return apiError(500, err instanceof Error ? err.message : "Erro ao editar aposta");
  }

  return NextResponse.json({ aposta: serializeAposta(atualizada) });
}
