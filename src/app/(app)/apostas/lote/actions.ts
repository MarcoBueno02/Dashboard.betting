"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const rowSchema = z.object({
  jogoDescricao: z.string().min(1),
  entradaDescricao: z.string().min(1),
  casaId: z.string().min(1),
  odd: z.number().gt(1),
  stake: z.number().gt(0),
});

const loteSchema = z.object({
  competicaoId: z.string().min(1),
  mercadoId: z.string().min(1),
  rows: z.array(rowSchema).min(1),
});

export type LoteActionState = { error?: string; success?: boolean; criadas?: number };

export async function createApostasLoteAction(
  input: z.infer<typeof loteSchema>
): Promise<LoteActionState> {
  const parsed = loteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { competicaoId, mercadoId, rows } = parsed.data;

  const trava = await prisma.trava.findFirst({
    where: { status: "ATIVA", mercadoId, OR: [{ competicaoId }, { competicaoId: null }] },
  });

  await prisma.aposta.createMany({
    data: rows.map((r) => ({
      data: new Date(),
      competicaoId,
      mercadoId,
      jogoDescricao: r.jogoDescricao,
      entradaDescricao: r.entradaDescricao,
      casaId: r.casaId,
      odd: r.odd,
      stake: r.stake,
      status: "PENDENTE" as const,
      travaAtiva: Boolean(trava),
    })),
  });

  revalidatePath("/apostas");
  revalidatePath("/apostas/pendentes");
  revalidatePath("/");
  revalidatePath("/segmentado");

  return { success: true, criadas: rows.length };
}
