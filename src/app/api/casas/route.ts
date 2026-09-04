import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiToken, apiError } from "@/lib/api-auth";
import { serializeCasa } from "@/lib/api-serialize";
import { registrarNovaUnidade } from "@/lib/unidade";
import { round2 } from "@/lib/betting";

const bodySchema = z.object({
  nome: z.string().trim().min(1, "nome é obrigatório"),
  saldoAtual: z.number().min(0, "saldoAtual não pode ser negativo").optional(),
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

  const existente = await prisma.casa.findUnique({ where: { nome: parsed.data.nome } });
  if (existente) return apiError(400, `Já existe uma casa com o nome "${parsed.data.nome}"`, "nome");

  const saldoAtual = round2(parsed.data.saldoAtual ?? 0);

  const casa = await prisma.$transaction(async (tx) => {
    const nova = await tx.casa.create({
      data: {
        nome: parsed.data.nome,
        saldoAtual,
        snapshots: { create: { saldo: saldoAtual, origem: "CONFIRMACAO_MANUAL" } },
      },
    });
    await registrarNovaUnidade(tx);
    return nova;
  });

  return NextResponse.json({ casa: serializeCasa(casa) }, { status: 201 });
}
