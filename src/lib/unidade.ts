import type { Prisma, PrismaClient } from "@prisma/client";
import { round2, unidadeSugerida } from "@/lib/betting";

type TxOrClient = PrismaClient | Prisma.TransactionClient;

/**
 * Registra um novo ponto no histórico de Unidade (2% da banca total das
 * casas ativas), a partir do saldo atual em banco. Chamado sempre que uma
 * ação muda o saldo de alguma casa, para manter "Unidade atual" honesto
 * com o momento real em vez de um cálculo ao vivo desalinhado.
 */
export async function registrarNovaUnidade(tx: TxOrClient) {
  const casasAtivas = await tx.casa.findMany({ where: { ativa: true }, select: { saldoAtual: true } });
  const bancaTotal = round2(
    casasAtivas.reduce((acc, c) => acc + Number(c.saldoAtual), 0)
  );
  const valor = unidadeSugerida(bancaTotal);
  await tx.unidade.create({
    data: { valor, bancaTotalNaEpoca: bancaTotal },
  });
  return { valor, bancaTotal };
}
