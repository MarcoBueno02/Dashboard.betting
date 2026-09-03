"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string; success?: boolean };

const categoriaRiscoValues = ["BAIXO", "MEDIO", "MEDIO_ALTO", "ALTO_ESPECULATIVO"] as const;

const createTravaSchema = z.object({
  competicaoId: z.string().optional().nullable(),
  mercadoId: z.string().min(1, "Selecione o mercado"),
  motivoAtivacao: z.string().trim().min(1, "Informe o motivo"),
  tetoRisco: z.enum(categoriaRiscoValues),
});

export async function createTravaAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = createTravaSchema.safeParse({
    competicaoId: formData.get("competicaoId") || null,
    mercadoId: formData.get("mercadoId"),
    motivoAtivacao: formData.get("motivoAtivacao"),
    tetoRisco: formData.get("tetoRisco"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await prisma.trava.create({
    data: {
      competicaoId: parsed.data.competicaoId || null,
      mercadoId: parsed.data.mercadoId,
      motivoAtivacao: parsed.data.motivoAtivacao,
      tetoRisco: parsed.data.tetoRisco,
      status: "ATIVA",
    },
  });

  revalidatePath("/travas");
  revalidatePath("/apostas/nova");
  return { success: true };
}

export async function removerTravaAction(travaId: string) {
  await prisma.trava.update({
    where: { id: travaId },
    data: { status: "REMOVIDA", dataRemocao: new Date() },
  });
  revalidatePath("/travas");
  revalidatePath("/apostas/nova");
}

export async function reativarTravaAction(travaId: string) {
  await prisma.trava.update({
    where: { id: travaId },
    data: { status: "ATIVA", dataRemocao: null },
  });
  revalidatePath("/travas");
  revalidatePath("/apostas/nova");
}

const editarTravaSchema = z.object({
  travaId: z.string().min(1),
  motivoAtivacao: z.string().trim().min(1, "Informe o motivo"),
  tetoRisco: z.enum(categoriaRiscoValues),
  rodadasPositivasConsecutivas: z.coerce.number().int().min(0).max(3),
});

export async function editarTravaAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = editarTravaSchema.safeParse({
    travaId: formData.get("travaId"),
    motivoAtivacao: formData.get("motivoAtivacao"),
    tetoRisco: formData.get("tetoRisco"),
    rodadasPositivasConsecutivas: formData.get("rodadasPositivasConsecutivas"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await prisma.trava.update({
    where: { id: parsed.data.travaId },
    data: {
      motivoAtivacao: parsed.data.motivoAtivacao,
      tetoRisco: parsed.data.tetoRisco,
      rodadasPositivasConsecutivas: parsed.data.rodadasPositivasConsecutivas,
    },
  });

  revalidatePath("/travas");
  revalidatePath("/apostas/nova");
  return { success: true };
}
