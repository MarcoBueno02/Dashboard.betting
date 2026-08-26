"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { computeLucro } from "@/lib/betting";
import { CategoriaRisco, StatusAposta } from "@prisma/client";

export type ActionState = { error?: string; success?: boolean };

const categoriaRiscoValues = ["BAIXO", "MEDIO", "MEDIO_ALTO", "ALTO_ESPECULATIVO"] as const;

const novaApostaSchema = z.object({
  data: z.string().min(1),
  competicaoId: z.string().min(1, "Selecione a competição"),
  jogoDescricao: z.string().trim().min(1, "Informe o jogo"),
  mercadoId: z.string().min(1, "Selecione o mercado"),
  entradaDescricao: z.string().trim().min(1, "Informe a entrada"),
  casaId: z.string().min(1, "Selecione a casa"),
  odd: z.coerce.number().gt(1, "Odd deve ser maior que 1"),
  stake: z.coerce.number().gt(0, "Stake deve ser maior que 0"),
  pJusta: z.coerce.number().optional().nullable(),
  evPercentual: z.coerce.number().optional().nullable(),
  categoriaRisco: z.enum(categoriaRiscoValues).optional().nullable(),
  omaEfetiva: z.coerce.number().optional().nullable(),
  notas: z.string().trim().optional().nullable(),
});

async function isTravaAtiva(competicaoId: string, mercadoId: string) {
  const trava = await prisma.trava.findFirst({
    where: {
      status: "ATIVA",
      mercadoId,
      OR: [{ competicaoId }, { competicaoId: null }],
    },
  });
  return Boolean(trava);
}

export async function createApostaAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = novaApostaSchema.safeParse({
    ...raw,
    pJusta: raw.pJusta || null,
    evPercentual: raw.evPercentual || null,
    categoriaRisco: raw.categoriaRisco || null,
    omaEfetiva: raw.omaEfetiva || null,
    notas: raw.notas || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const d = parsed.data;
  const travaAtiva = await isTravaAtiva(d.competicaoId, d.mercadoId);

  await prisma.aposta.create({
    data: {
      data: new Date(d.data),
      competicaoId: d.competicaoId,
      jogoDescricao: d.jogoDescricao,
      mercadoId: d.mercadoId,
      entradaDescricao: d.entradaDescricao,
      casaId: d.casaId,
      odd: d.odd,
      stake: d.stake,
      pJusta: d.pJusta ?? null,
      evPercentual: d.evPercentual ?? null,
      categoriaRisco: (d.categoriaRisco as CategoriaRisco | null) ?? null,
      omaEfetiva: d.omaEfetiva ?? null,
      notas: d.notas ?? null,
      status: "PENDENTE",
      travaAtiva,
    },
  });

  revalidatePath("/apostas");
  revalidatePath("/apostas/pendentes");
  revalidatePath("/");
  revalidatePath("/segmentado");
  return { success: true };
}

const resolveSchema = z.object({
  apostaId: z.string().min(1),
  status: z.enum(["GREEN", "RED", "REEMBOLSO", "MEIA_GREEN", "MEIA_RED", "CANCELADA"]),
  retornoReal: z.coerce.number().min(0),
  atualizarSaldo: z.coerce.boolean().optional(),
});

export async function resolverApostaAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resolveSchema.safeParse({
    apostaId: formData.get("apostaId"),
    status: formData.get("status"),
    retornoReal: formData.get("retornoReal"),
    atualizarSaldo: formData.get("atualizarSaldo") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { apostaId, status, retornoReal, atualizarSaldo } = parsed.data;

  const aposta = await prisma.aposta.findUnique({ where: { id: apostaId } });
  if (!aposta) return { error: "Aposta não encontrada." };

  const lucroPrejuizo = computeLucro(retornoReal, aposta.stake);

  await prisma.$transaction(async (tx) => {
    await tx.aposta.update({
      where: { id: apostaId },
      data: {
        status: status as StatusAposta,
        retornoReal,
        lucroPrejuizo,
      },
    });

    if (atualizarSaldo) {
      const casa = await tx.casa.findUnique({ where: { id: aposta.casaId } });
      if (casa) {
        const novoSaldo = Number(casa.saldoAtual) + Number(lucroPrejuizo ?? 0);
        await tx.casa.update({
          where: { id: casa.id },
          data: { saldoAtual: novoSaldo },
        });
        await tx.saldoSnapshot.create({
          data: {
            casaId: casa.id,
            saldo: novoSaldo,
            origem: "RESULTADO_APOSTA",
          },
        });
      }
    }

    if (status === "GREEN" || status === "RED") {
      const trava = await tx.trava.findFirst({
        where: {
          status: "ATIVA",
          mercadoId: aposta.mercadoId,
          OR: [{ competicaoId: aposta.competicaoId }, { competicaoId: null }],
        },
      });
      if (trava) {
        await tx.trava.update({
          where: { id: trava.id },
          data: {
            rodadasPositivasConsecutivas:
              status === "GREEN" ? trava.rodadasPositivasConsecutivas + 1 : 0,
          },
        });
      }
    }
  });

  revalidatePath("/apostas");
  revalidatePath("/apostas/pendentes");
  revalidatePath("/");
  revalidatePath("/segmentado");
  revalidatePath("/travas");
  revalidatePath("/bancas");
  return { success: true };
}
