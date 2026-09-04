import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiToken } from "@/lib/api-auth";
import { serializeAposta } from "@/lib/api-serialize";

export async function GET(request: NextRequest) {
  const unauthorized = requireApiToken(request);
  if (unauthorized) return unauthorized;

  const apostas = await prisma.aposta.findMany({
    where: { status: "PENDENTE" },
    orderBy: { data: "asc" },
    include: { casa: true, competicao: true, mercado: true },
  });

  return NextResponse.json({ apostas: apostas.map(serializeAposta) });
}
