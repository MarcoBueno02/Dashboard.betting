import { NextRequest, NextResponse } from "next/server";
import { requireApiToken } from "@/lib/api-auth";
import { getSegmentacao } from "@/lib/segmentado";

export async function GET(request: NextRequest) {
  const unauthorized = requireApiToken(request);
  if (unauthorized) return unauthorized;

  const linhas = await getSegmentacao();

  return NextResponse.json({
    segmentado: linhas.map((l) => ({
      competicao: l.competicaoNome,
      mercado: l.mercadoNome,
      green: l.green,
      red: l.red,
    })),
  });
}
