import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiToken, apiError } from "@/lib/api-auth";
import { serializeAposta } from "@/lib/api-serialize";

export async function GET(request: NextRequest) {
  const unauthorized = requireApiToken(request);
  if (unauthorized) return unauthorized;

  const jogo = request.nextUrl.searchParams.get("jogo")?.trim();
  const data = request.nextUrl.searchParams.get("data")?.trim();

  if (!jogo && !data) {
    return apiError(400, "Informe ao menos um dos parâmetros: jogo ou data");
  }

  const where: Prisma.ApostaWhereInput = {};
  if (jogo) where.jogoDescricao = { contains: jogo, mode: "insensitive" };
  if (data) {
    where.data = {
      gte: new Date(`${data}T00:00:00-03:00`),
      lte: new Date(`${data}T23:59:59-03:00`),
    };
  }

  const apostas = await prisma.aposta.findMany({
    where,
    orderBy: { data: "desc" },
    include: { casa: true, competicao: true, mercado: true },
    take: 25,
  });

  return NextResponse.json({ apostas: apostas.map(serializeAposta) });
}
