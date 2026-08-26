"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string; success?: boolean };

const createCasaSchema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório"),
  saldoAtual: z.coerce.number().min(0, "Saldo não pode ser negativo"),
});

export async function createCasaAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = createCasaSchema.safeParse({
    nome: formData.get("nome"),
    saldoAtual: formData.get("saldoAtual") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const existing = await prisma.casa.findUnique({ where: { nome: parsed.data.nome } });
  if (existing) {
    return { error: "Já existe uma casa com esse nome." };
  }

  await prisma.casa.create({
    data: {
      nome: parsed.data.nome,
      saldoAtual: parsed.data.saldoAtual,
      snapshots: {
        create: {
          saldo: parsed.data.saldoAtual,
          origem: "CONFIRMACAO_MANUAL",
        },
      },
    },
  });

  revalidatePath("/bancas");
  revalidatePath("/");
  return { success: true };
}

const updateSaldoSchema = z.object({
  casaId: z.string().min(1),
  saldo: z.coerce.number().min(0, "Saldo não pode ser negativo"),
});

export async function updateSaldoAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = updateSaldoSchema.safeParse({
    casaId: formData.get("casaId"),
    saldo: formData.get("saldo"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  await prisma.$transaction([
    prisma.casa.update({
      where: { id: parsed.data.casaId },
      data: { saldoAtual: parsed.data.saldo },
    }),
    prisma.saldoSnapshot.create({
      data: {
        casaId: parsed.data.casaId,
        saldo: parsed.data.saldo,
        origem: "CONFIRMACAO_MANUAL",
      },
    }),
  ]);

  revalidatePath("/bancas");
  revalidatePath("/");
  return { success: true };
}

export async function toggleCasaAtivaAction(casaId: string, ativa: boolean) {
  await prisma.casa.update({ where: { id: casaId }, data: { ativa } });
  revalidatePath("/bancas");
  revalidatePath("/");
}
