"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { computeLucro, parseDataInputBRT } from "@/lib/betting";
import { registrarNovaUnidade } from "@/lib/unidade";
import { CategoriaRisco, Prisma, StatusAposta } from "@prisma/client";

export type ActionState = { error?: string; success?: boolean };

const categoriaRiscoValues = ["BAIXO", "MEDIO", "MEDIO_ALTO", "ALTO_ESPECULATIVO"] as const;
const statusResolvidoValues = ["GREEN", "RED", "REEMBOLSO", "MEIA_GREEN", "MEIA_RED", "CANCELADA"] as const;

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

async function ajustarContadorTrava(
  tx: Prisma.TransactionClient,
  competicaoId: string,
  mercadoId: string,
  status: StatusAposta
) {
  if (status !== "GREEN" && status !== "RED") return;
  const trava = await tx.trava.findFirst({
    where: {
      status: "ATIVA",
      mercadoId,
      OR: [{ competicaoId }, { competicaoId: null }],
    },
  });
  if (!trava) return;
  await tx.trava.update({
    where: { id: trava.id },
    data: {
      rodadasPositivasConsecutivas: status === "GREEN" ? trava.rodadasPositivasConsecutivas + 1 : 0,
    },
  });
}

function revalidarTudo() {
  revalidatePath("/apostas");
  revalidatePath("/apostas/pendentes");
  revalidatePath("/");
  revalidatePath("/segmentado");
  revalidatePath("/travas");
  revalidatePath("/bancas");
  revalidatePath("/analises");
}

// ============================================================
// Criar aposta (pendente, ou já com resultado)
// ============================================================
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
  jaResolvida: z.coerce.boolean().optional(),
  status: z.enum(statusResolvidoValues).optional().nullable(),
  retornoReal: z.coerce.number().optional().nullable(),
  atualizarSaldo: z.coerce.boolean().optional(),
});

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
    jaResolvida: raw.jaResolvida === "on",
    status: raw.status || null,
    retornoReal: raw.retornoReal || null,
    atualizarSaldo: raw.atualizarSaldo === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const d = parsed.data;
  const travaAtiva = await isTravaAtiva(d.competicaoId, d.mercadoId);

  const resolvida = d.jaResolvida && d.status;
  const status: StatusAposta = resolvida ? (d.status as StatusAposta) : "PENDENTE";
  const retornoReal = resolvida ? (d.retornoReal ?? 0) : null;
  const lucroPrejuizo = resolvida ? computeLucro(retornoReal, d.stake) : null;

  await prisma.$transaction(async (tx) => {
    await tx.aposta.create({
      data: {
        data: parseDataInputBRT(d.data),
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
        status,
        retornoReal,
        lucroPrejuizo,
        travaAtiva,
      },
    });

    if (resolvida) {
      if (d.atualizarSaldo) {
        await tx.casa.update({
          where: { id: d.casaId },
          data: { saldoAtual: { increment: lucroPrejuizo ?? 0 } },
        });
        const casaAtualizada = await tx.casa.findUnique({ where: { id: d.casaId } });
        if (casaAtualizada) {
          await tx.saldoSnapshot.create({
            data: { casaId: d.casaId, saldo: casaAtualizada.saldoAtual, origem: "RESULTADO_APOSTA" },
          });
          await registrarNovaUnidade(tx);
        }
      }
      await ajustarContadorTrava(tx, d.competicaoId, d.mercadoId, status);
    }
  });

  revalidarTudo();
  return { success: true };
}

// ============================================================
// Resolver aposta pendente
// ============================================================
const resolveSchema = z.object({
  apostaId: z.string().min(1),
  status: z.enum(statusResolvidoValues),
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
      data: { status: status as StatusAposta, retornoReal, lucroPrejuizo },
    });

    if (atualizarSaldo) {
      const casaAtualizada = await tx.casa.update({
        where: { id: aposta.casaId },
        data: { saldoAtual: { increment: lucroPrejuizo ?? 0 } },
      });
      await tx.saldoSnapshot.create({
        data: { casaId: casaAtualizada.id, saldo: casaAtualizada.saldoAtual, origem: "RESULTADO_APOSTA" },
      });
      await registrarNovaUnidade(tx);
    }

    await ajustarContadorTrava(tx, aposta.competicaoId, aposta.mercadoId, status as StatusAposta);
  });

  revalidarTudo();
  return { success: true };
}

// ============================================================
// Editar aposta existente
// ============================================================
const editarApostaSchema = z.object({
  apostaId: z.string().min(1),
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
  status: z.enum(["PENDENTE", ...statusResolvidoValues]),
  retornoReal: z.coerce.number().optional().nullable(),
});

export async function atualizarApostaAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = editarApostaSchema.safeParse({
    ...raw,
    pJusta: raw.pJusta || null,
    evPercentual: raw.evPercentual || null,
    categoriaRisco: raw.categoriaRisco || null,
    omaEfetiva: raw.omaEfetiva || null,
    notas: raw.notas || null,
    retornoReal: raw.retornoReal || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const d = parsed.data;
  const status = d.status as StatusAposta;
  const resolvida = status !== "PENDENTE";
  const retornoReal = resolvida ? (d.retornoReal ?? 0) : null;
  const lucroPrejuizo = resolvida ? computeLucro(retornoReal, d.stake) : null;
  const travaAtiva = await isTravaAtiva(d.competicaoId, d.mercadoId);

  await prisma.aposta.update({
    where: { id: d.apostaId },
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
      status,
      retornoReal,
      lucroPrejuizo,
      travaAtiva,
    },
  });

  // Nota: editar não mexe em saldo de casa nem em contador de trava —
  // essas correções são feitas manualmente pelo usuário quando necessário,
  // já que a edição serve para consertar dados registrados errados, não
  // para reprocessar efeitos colaterais que já aconteceram.

  revalidarTudo();
  return { success: true };
}

export async function excluirApostaAction(apostaId: string) {
  await prisma.aposta.delete({ where: { id: apostaId } });
  revalidarTudo();
}
