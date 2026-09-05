import { prisma } from "@/lib/prisma";

/**
 * Cache genérico em OddsCacheEntry, usado tanto pro catálogo de torneios
 * (TTL longo) quanto pra odds por fixture (TTL curto) — a cota gratuita da
 * OddsPapi é de só 250 requisições/mês, então nada aqui pode chamar a API
 * de novo sem checar isso primeiro.
 */
export async function getCached<T>(chave: string, ttlMs: number): Promise<T | null> {
  const entry = await prisma.oddsCacheEntry.findUnique({ where: { chave } });
  if (!entry) return null;
  if (Date.now() - entry.buscadoEm.getTime() > ttlMs) return null;
  return entry.payload as T;
}

export async function setCached(chave: string, payload: unknown): Promise<void> {
  await prisma.oddsCacheEntry.upsert({
    where: { chave },
    create: { chave, payload: payload as never },
    update: { payload: payload as never, buscadoEm: new Date() },
  });
}
