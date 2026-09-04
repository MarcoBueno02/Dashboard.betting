import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiToken, apiError } from "@/lib/api-auth";
import { resolveCasa } from "@/lib/api-serialize";
import { registrarNovaUnidade } from "@/lib/unidade";
import { round2 } from "@/lib/betting";

const bodySchema = z.object({
  saldo: z.number({ message: "\"saldo\" é obrigatório e deve ser um número" }).min(0, "saldo não pode ser negativo"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ casa: string }> }
) {
  const unauthorized = requireApiToken(request);
  if (unauthorized) return unauthorized;

  const { casa: nomeOuId } = await params;
  const casa = await resolveCasa(decodeURIComponent(nomeOuId));
  if (!casa) return apiError(404, `Casa "${nomeOuId}" não encontrada`);

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

  const saldoAnterior = Number(casa.saldoAtual);
  const saldoNovo = round2(parsed.data.saldo);

  await prisma.$transaction(async (tx) => {
    await tx.casa.update({ where: { id: casa.id }, data: { saldoAtual: saldoNovo } });
    await tx.saldoSnapshot.create({
      data: { casaId: casa.id, saldo: saldoNovo, origem: "CONFIRMACAO_MANUAL" },
    });
    await registrarNovaUnidade(tx);
  });

  return NextResponse.json({
    casa: casa.nome,
    saldoAnterior,
    saldoNovo,
    diferenca: round2(saldoNovo - saldoAnterior),
  });
}
