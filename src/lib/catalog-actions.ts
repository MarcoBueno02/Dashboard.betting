"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const nomeSchema = z.string().trim().min(1, "Nome obrigatório").max(120);

export async function createCompeticaoAction(nome: string, pais?: string) {
  const parsed = nomeSchema.safeParse(nome);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const competicao = await prisma.competicao.upsert({
    where: { nome: parsed.data },
    update: {},
    create: { nome: parsed.data, pais: pais?.trim() || null },
  });

  revalidatePath("/apostas/nova");
  revalidatePath("/apostas/lote");
  return competicao;
}

export async function createMercadoAction(nome: string) {
  const parsed = nomeSchema.safeParse(nome);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const mercado = await prisma.mercado.upsert({
    where: { nome: parsed.data },
    update: {},
    create: { nome: parsed.data },
  });

  revalidatePath("/apostas/nova");
  revalidatePath("/apostas/lote");
  return mercado;
}
