import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildApostaOrderBy, buildApostaWhere } from "@/lib/aposta-filters";
import { STATUS_LABELS, RISCO_LABELS } from "@/lib/betting";

function csvEscape(value: string) {
  if (/[";\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
  const where = buildApostaWhere(sp);
  const orderBy = buildApostaOrderBy(sp);

  const apostas = await prisma.aposta.findMany({
    where,
    orderBy,
    include: { casa: true, competicao: true, mercado: true },
  });

  const headers = [
    "Data",
    "Jogo",
    "Competicao",
    "Mercado",
    "Entrada",
    "Casa",
    "Odd",
    "Stake",
    "PJusta",
    "EV",
    "Risco",
    "OMA",
    "Status",
    "RetornoReal",
    "LucroPrejuizo",
    "TravaAtiva",
    "Notas",
  ];

  const rows = apostas.map((a) =>
    [
      a.data.toISOString(),
      a.jogoDescricao,
      a.competicao.nome,
      a.mercado.nome,
      a.entradaDescricao,
      a.casa.nome,
      a.odd.toString(),
      a.stake.toString(),
      a.pJusta?.toString() ?? "",
      a.evPercentual?.toString() ?? "",
      a.categoriaRisco ? RISCO_LABELS[a.categoriaRisco] : "",
      a.omaEfetiva?.toString() ?? "",
      STATUS_LABELS[a.status],
      a.retornoReal?.toString() ?? "",
      a.lucroPrejuizo?.toString() ?? "",
      a.travaAtiva ? "Sim" : "Não",
      a.notas ?? "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(";")
  );

  const csv = [headers.join(";"), ...rows].join("\n");
  const bom = "﻿";

  return new Response(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="apostas.csv"`,
    },
  });
}
