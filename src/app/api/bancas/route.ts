import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiToken } from "@/lib/api-auth";
import { serializeCasa } from "@/lib/api-serialize";
import { round2, unidadeSugerida } from "@/lib/betting";

export async function GET(request: NextRequest) {
  const unauthorized = requireApiToken(request);
  if (unauthorized) return unauthorized;

  const [casas, ultimaUnidade] = await Promise.all([
    prisma.casa.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } }),
    prisma.unidade.findFirst({ orderBy: { data: "desc" } }),
  ]);

  const bancaTotal = round2(casas.reduce((acc, c) => acc + Number(c.saldoAtual), 0));
  const unidadeAtual = ultimaUnidade ? Number(ultimaUnidade.valor) : unidadeSugerida(bancaTotal);

  return NextResponse.json({
    casas: casas.map(serializeCasa),
    bancaTotal,
    unidadeAtual,
  });
}
