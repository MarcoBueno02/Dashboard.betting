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
  data: z.string().min(1),
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

  const { data, competicaoId, mercadoId, rows } = parsed.data;
  // Ancorado ao meio-dia BRT para não cair no dia anterior/seguinte por
  // arredondamento de timezone, independente de onde isso for lido depois.
  const dataJogos = new Date(`${data}T12:00:00-03:00`);

  const trava = await prisma.trava.findFirst({
    where: { status: "ATIVA", mercadoId, OR: [{ competicaoId }, { competicaoId: null }] },
  });

  await prisma.aposta.createMany({
    data: rows.map((r) => ({
      data: dataJogos,
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
