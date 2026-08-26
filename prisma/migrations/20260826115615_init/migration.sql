-- CreateEnum
CREATE TYPE "OrigemSnapshot" AS ENUM ('CONFIRMACAO_MANUAL', 'RESULTADO_APOSTA');

-- CreateEnum
CREATE TYPE "StatusAposta" AS ENUM ('PENDENTE', 'GREEN', 'RED', 'REEMBOLSO', 'MEIA_GREEN', 'MEIA_RED', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CategoriaRisco" AS ENUM ('BAIXO', 'MEDIO', 'MEDIO_ALTO', 'ALTO_ESPECULATIVO');

-- CreateEnum
CREATE TYPE "StatusTrava" AS ENUM ('ATIVA', 'REMOVIDA');

-- CreateTable
CREATE TABLE "Casa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "saldoAtual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Casa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaldoSnapshot" (
    "id" TEXT NOT NULL,
    "casaId" TEXT NOT NULL,
    "saldo" DECIMAL(12,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origem" "OrigemSnapshot" NOT NULL,

    CONSTRAINT "SaldoSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competicao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "pais" TEXT,

    CONSTRAINT "Competicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mercado" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Mercado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aposta" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "competicaoId" TEXT NOT NULL,
    "jogoDescricao" TEXT NOT NULL,
    "mercadoId" TEXT NOT NULL,
    "entradaDescricao" TEXT NOT NULL,
    "casaId" TEXT NOT NULL,
    "odd" DECIMAL(8,3) NOT NULL,
    "stake" DECIMAL(12,2) NOT NULL,
    "pJusta" DECIMAL(6,3),
    "evPercentual" DECIMAL(8,3),
    "categoriaRisco" "CategoriaRisco",
    "omaEfetiva" DECIMAL(8,3),
    "status" "StatusAposta" NOT NULL DEFAULT 'PENDENTE',
    "retornoReal" DECIMAL(12,2),
    "lucroPrejuizo" DECIMAL(12,2),
    "travaAtiva" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aposta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trava" (
    "id" TEXT NOT NULL,
    "competicaoId" TEXT,
    "mercadoId" TEXT NOT NULL,
    "status" "StatusTrava" NOT NULL DEFAULT 'ATIVA',
    "motivoAtivacao" TEXT NOT NULL,
    "tetoRisco" "CategoriaRisco" NOT NULL,
    "dataAtivacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataRemocao" TIMESTAMP(3),
    "rodadasPositivasConsecutivas" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Trava_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "bancaTotalNaEpoca" DECIMAL(12,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Casa_nome_key" ON "Casa"("nome");

-- CreateIndex
CREATE INDEX "Casa_ativa_idx" ON "Casa"("ativa");

-- CreateIndex
CREATE INDEX "SaldoSnapshot_casaId_data_idx" ON "SaldoSnapshot"("casaId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "Competicao_nome_key" ON "Competicao"("nome");

-- CreateIndex
CREATE INDEX "Competicao_nome_idx" ON "Competicao"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Mercado_nome_key" ON "Mercado"("nome");

-- CreateIndex
CREATE INDEX "Mercado_nome_idx" ON "Mercado"("nome");

-- CreateIndex
CREATE INDEX "Aposta_status_idx" ON "Aposta"("status");

-- CreateIndex
CREATE INDEX "Aposta_competicaoId_mercadoId_idx" ON "Aposta"("competicaoId", "mercadoId");

-- CreateIndex
CREATE INDEX "Aposta_casaId_idx" ON "Aposta"("casaId");

-- CreateIndex
CREATE INDEX "Aposta_data_idx" ON "Aposta"("data");

-- CreateIndex
CREATE INDEX "Trava_competicaoId_mercadoId_idx" ON "Trava"("competicaoId", "mercadoId");

-- CreateIndex
CREATE INDEX "Trava_status_idx" ON "Trava"("status");

-- CreateIndex
CREATE INDEX "Unidade_data_idx" ON "Unidade"("data");

-- AddForeignKey
ALTER TABLE "SaldoSnapshot" ADD CONSTRAINT "SaldoSnapshot_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aposta" ADD CONSTRAINT "Aposta_competicaoId_fkey" FOREIGN KEY ("competicaoId") REFERENCES "Competicao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aposta" ADD CONSTRAINT "Aposta_mercadoId_fkey" FOREIGN KEY ("mercadoId") REFERENCES "Mercado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aposta" ADD CONSTRAINT "Aposta_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trava" ADD CONSTRAINT "Trava_competicaoId_fkey" FOREIGN KEY ("competicaoId") REFERENCES "Competicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trava" ADD CONSTRAINT "Trava_mercadoId_fkey" FOREIGN KEY ("mercadoId") REFERENCES "Mercado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
