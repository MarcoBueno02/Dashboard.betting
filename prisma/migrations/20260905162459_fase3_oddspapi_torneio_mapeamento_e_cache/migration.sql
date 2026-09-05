-- CreateTable
CREATE TABLE "TorneioMapeamento" (
    "id" TEXT NOT NULL,
    "nomeInterno" TEXT NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "tournamentName" TEXT NOT NULL,
    "confirmadoManualmente" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TorneioMapeamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OddsCacheEntry" (
    "chave" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "buscadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OddsCacheEntry_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "TorneioMapeamento_nomeInterno_key" ON "TorneioMapeamento"("nomeInterno");

-- CreateIndex
CREATE INDEX "TorneioMapeamento_tournamentId_idx" ON "TorneioMapeamento"("tournamentId");

-- Seed: as duas competições já confirmadas manualmente (testadas com odd
-- real antes da Fase 3), pra não depender da correspondência automática por
-- nome, que não bate ("Primera División Argentina" x "Liga Profissional").
INSERT INTO "TorneioMapeamento" ("id", "nomeInterno", "tournamentId", "tournamentName", "confirmadoManualmente", "atualizadoEm")
VALUES
  (gen_random_uuid()::text, 'Brasileirão Série B', 390, 'Brasileirão Série B', true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Primera División Argentina', 155, 'Liga Profissional', true, CURRENT_TIMESTAMP);
