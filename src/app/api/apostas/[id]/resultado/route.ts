import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiToken, apiError } from "@/lib/api-auth";
import { serializeAposta } from "@/lib/api-serialize";
import { computeLucro } from "@/lib/betting";

const statusResolvidoValues = ["GREEN", "RED", "REEMBOLSO", "MEIA_GREEN", "MEIA_RED", "CANCELADA"] as const;

const bodySchema = z.object({
  status: z.enum(statusResolvidoValues, { message: "\"status\" precisa ser um dos resultados válidos" }),
  retornoReal: z.number({ message: "\"retornoReal\" é obrigatório e deve ser um número" }).min(0),
  forcar: z.boolean().optional(),
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

  const aposta = await prisma.aposta.findUnique({ where: { id } });
  if (!aposta) return apiError(404, `Aposta "${id}" não encontrada`);

  if (aposta.status !== "PENDENTE" && !parsed.data.forcar) {
    return apiError(
      400,
      `Aposta já está com status "${aposta.status}". Envie "forcar": true pra sobrescrever.`
    );
  }

  const lucroPrejuizo = computeLucro(parsed.data.retornoReal, aposta.stake);

  const atualizada = await prisma.aposta.update({
    where: { id },
    data: {
      status: parsed.data.status,
      retornoReal: parsed.data.retornoReal,
      lucroPrejuizo,
    },
    include: { casa: true, competicao: true, mercado: true },
  });

  return NextResponse.json({ aposta: serializeAposta(atualizada) });
}
