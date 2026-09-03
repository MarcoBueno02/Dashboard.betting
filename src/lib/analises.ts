import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { maioresSequencias, round2, STATUS_RESOLVIDOS_PARA_STATS } from "@/lib/betting";
import type { CategoriaRisco } from "@prisma/client";

const RESOLVIDOS = Prisma.sql`${Prisma.join(STATUS_RESOLVIDOS_PARA_STATS)}`;

export async function getAnalises() {
  const [porRisco, porRiscoGreenRed, porCasa, calibracaoRaw, mediaMensalRaw, sequenciaRows] = await Promise.all([
    prisma.aposta.groupBy({
      by: ["categoriaRisco"],
      where: { status: { in: STATUS_RESOLVIDOS_PARA_STATS } },
      _sum: { stake: true, lucroPrejuizo: true },
      _count: true,
    }),
    prisma.aposta.groupBy({
      by: ["categoriaRisco", "status"],
      where: { status: { in: ["GREEN", "RED"] } },
      _count: true,
    }),
    prisma.aposta.groupBy({
      by: ["casaId"],
      where: { status: { in: STATUS_RESOLVIDOS_PARA_STATS } },
      _sum: { stake: true, lucroPrejuizo: true },
      _count: true,
    }),
    prisma.$queryRaw<
      { faixa: string; quantidade: bigint; p_justa_media: number | null; green: bigint; totalgr: bigint }[]
    >`
      SELECT
        faixa,
        COUNT(*) AS quantidade,
        AVG("pJusta") AS p_justa_media,
        COUNT(*) FILTER (WHERE status = 'GREEN') AS green,
        COUNT(*) FILTER (WHERE status IN ('GREEN', 'RED')) AS totalgr
      FROM (
        SELECT status, "pJusta",
          CASE
            WHEN "pJusta" >= 50 AND "pJusta" < 60 THEN '50-59%'
            WHEN "pJusta" >= 60 AND "pJusta" < 70 THEN '60-69%'
            WHEN "pJusta" >= 70 AND "pJusta" < 80 THEN '70-79%'
            WHEN "pJusta" >= 80 AND "pJusta" < 90 THEN '80-89%'
            WHEN "pJusta" >= 90 AND "pJusta" <= 100 THEN '90-100%'
          END AS faixa
        FROM "Aposta"
        WHERE status IN (${RESOLVIDOS}) AND "pJusta" IS NOT NULL
      ) t
      WHERE faixa IS NOT NULL
      GROUP BY faixa
    `,
    prisma.$queryRaw<{ mes: string; odd_media: number; stake_medio: number }[]>`
      SELECT
        to_char(date_trunc('month', "data"), 'YYYY-MM') AS mes,
        AVG(odd) AS odd_media,
        AVG(stake) AS stake_medio
      FROM "Aposta"
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.aposta.findMany({
      where: { status: { in: ["GREEN", "RED"] } },
      select: { status: true },
      orderBy: { data: "asc" },
    }),
  ]);

  const casas = await prisma.casa.findMany({
    where: { id: { in: porCasa.map((g) => g.casaId) } },
    select: { id: true, nome: true },
  });
  const nomeCasa = new Map(casas.map((c) => [c.id, c.nome]));

  const riscos: CategoriaRisco[] = ["BAIXO", "MEDIO", "MEDIO_ALTO", "ALTO_ESPECULATIVO"];
  const roiPorRisco = riscos.map((risco) => {
    const g = porRisco.find((r) => r.categoriaRisco === risco);
    const stakeTotal = Number(g?._sum.stake ?? 0);
    const lucroTotal = Number(g?._sum.lucroPrejuizo ?? 0);
    const greens = porRiscoGreenRed.find((r) => r.categoriaRisco === risco && r.status === "GREEN")?._count ?? 0;
    const reds = porRiscoGreenRed.find((r) => r.categoriaRisco === risco && r.status === "RED")?._count ?? 0;
    const totalGR = greens + reds;
    return {
      risco,
      quantidade: g?._count ?? 0,
      stakeTotal: round2(stakeTotal),
      lucroTotal: round2(lucroTotal),
      roi: stakeTotal > 0 ? round2((lucroTotal / stakeTotal) * 100) : 0,
      winRate: totalGR > 0 ? round2((greens / totalGR) * 100) : 0,
    };
  });

  const roiPorCasa = porCasa.map((g) => {
    const stakeTotal = Number(g._sum.stake ?? 0);
    const lucroTotal = Number(g._sum.lucroPrejuizo ?? 0);
    return {
      casaId: g.casaId,
      casaNome: nomeCasa.get(g.casaId) ?? "",
      quantidade: g._count,
      stakeTotal: round2(stakeTotal),
      lucroTotal: round2(lucroTotal),
      roi: stakeTotal > 0 ? round2((lucroTotal / stakeTotal) * 100) : 0,
    };
  });

  const ordemFaixas = ["50-59%", "60-69%", "70-79%", "80-89%", "90-100%"];
  const calibracao = ordemFaixas.map((label) => {
    const row = calibracaoRaw.find((r) => r.faixa === label);
    const quantidade = Number(row?.quantidade ?? 0);
    const totalGR = Number(row?.totalgr ?? 0);
    const green = Number(row?.green ?? 0);
    return {
      faixa: label,
      quantidade,
      pJustaMedia: round2(Number(row?.p_justa_media ?? 0)),
      winRateReal: totalGR > 0 ? round2((green / totalGR) * 100) : 0,
    };
  });

  const mediaMensal = mediaMensalRaw.map((r) => ({
    mes: r.mes,
    oddMedia: round2(Number(r.odd_media)),
    stakeMedio: round2(Number(r.stake_medio)),
  }));

  const { maiorGreen, maiorRed } = maioresSequencias(sequenciaRows);

  return { roiPorRisco, roiPorCasa, calibracao, mediaMensal, maiorGreen, maiorRed };
}
