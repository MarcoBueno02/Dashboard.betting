import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireApiToken, apiError } from "@/lib/api-auth";
import { buscarMelhorOdd } from "@/lib/oddspapi/melhor-odd";

const querySchema = z.object({
  jogo: z.string().trim().min(1, '"jogo" é obrigatório'),
  competicao: z.string().trim().min(1, '"competicao" é obrigatória'),
  mercado: z.string().trim().min(1, '"mercado" é obrigatório'),
  entrada: z.string().trim().min(1, '"entrada" é obrigatória'),
});

export async function GET(request: NextRequest) {
  const unauthorized = requireApiToken(request);
  if (unauthorized) return unauthorized;

  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(sp);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return apiError(400, issue?.message ?? "Parâmetros inválidos", issue?.path.join("."));
  }

  const resultado = await buscarMelhorOdd(parsed.data);
  return NextResponse.json(resultado);
}
