import type { Prisma, PrismaClient, StatusAposta } from "@prisma/client";

type TxOrClient = PrismaClient | Prisma.TransactionClient;

export async function isTravaAtiva(
  tx: TxOrClient,
  competicaoId: string,
  mercadoId: string
) {
  const trava = await tx.trava.findFirst({
    where: {
      status: "ATIVA",
      mercadoId,
      OR: [{ competicaoId }, { competicaoId: null }],
    },
  });
  return Boolean(trava);
}

/** Incrementa rodadasPositivasConsecutivas em GREEN, zera em RED, se houver trava ativa pra essa combinação. */
export async function ajustarContadorTrava(
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
