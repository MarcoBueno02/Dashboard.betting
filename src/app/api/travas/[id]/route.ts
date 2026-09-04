import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiToken, apiError } from "@/lib/api-auth";
import { serializeTrava } from "@/lib/api-serialize";

const INCLUDE = { competicao: true, mercado: true } as const;
const categoriaRiscoValues = ["BAIXO", "MEDIO", "MEDIO_ALTO", "ALTO_ESPECULATIVO"] as const;

const bodySchema = z.object({
  status: z.enum(["ATIVA", "REMOVIDA"]).optional(),
  tetoRisco: z.enum(categoriaRiscoValues).optional(),
  motivoAtivacao: z.string().trim().min(1).optional(),
  rodadasPositivasConsecutivas: z.number().int().min(0).max(3).optional(),
  incrementarRodadas: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  if (Object.keys(d).length === 0) {
    return apiError(400, "Envie ao menos um campo pra atualizar");
  }
  if (d.rodadasPositivasConsecutivas !== undefined && d.incrementarRodadas) {
    return apiError(400, "Use \"rodadasPositivasConsecutivas\" ou \"incrementarRodadas\", não os dois");
  }

  const trava = await prisma.trava.findUnique({ where: { id } });
  if (!trava) return apiError(404, `Trava "${id}" não encontrada`);

  const data: {
    status?: "ATIVA" | "REMOVIDA";
    dataRemocao?: Date | null;
    tetoRisco?: (typeof categoriaRiscoValues)[number];
    motivoAtivacao?: string;
    rodadasPositivasConsecutivas?: number;
  } = {};

  if (d.status) {
    data.status = d.status;
    data.dataRemocao = d.status === "REMOVIDA" ? new Date() : null;
  }
  if (d.tetoRisco) data.tetoRisco = d.tetoRisco;
  if (d.motivoAtivacao) data.motivoAtivacao = d.motivoAtivacao;
  if (d.rodadasPositivasConsecutivas !== undefined) {
    data.rodadasPositivasConsecutivas = d.rodadasPositivasConsecutivas;
  } else if (d.incrementarRodadas) {
    data.rodadasPositivasConsecutivas = Math.min(3, trava.rodadasPositivasConsecutivas + 1);
  }

  const atualizada = await prisma.trava.update({
    where: { id },
    data,
    include: INCLUDE,
  });

  return NextResponse.json({ trava: serializeTrava(atualizada) });
}
