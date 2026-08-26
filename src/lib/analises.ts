import { prisma } from "@/lib/prisma";
import { STATUS_RESOLVIDOS_PARA_STATS, maioresSequencias, round2 } from "@/lib/betting";
import type { CategoriaRisco } from "@prisma/client";

export async function getAnalises() {
  const apostas = await prisma.aposta.findMany({
    select: {
      status: true,
      stake: true,
      odd: true,
      lucroPrejuizo: true,
      categoriaRisco: true,
      pJusta: true,
      data: true,
      casa: { select: { id: true, nome: true } },
    },
    orderBy: { data: "asc" },
  });

  const norm = apostas.map((a) => ({
    status: a.status,
    stake: Number(a.stake),
    odd: Number(a.odd),
    lucroPrejuizo: a.lucroPrejuizo === null ? null : Number(a.lucroPrejuizo),
    categoriaRisco: a.categoriaRisco,
    pJusta: a.pJusta === null ? null : Number(a.pJusta),
    data: a.data,
    casaId: a.casa.id,
    casaNome: a.casa.nome,
  }));

  const resolvidas = norm.filter((a) => STATUS_RESOLVIDOS_PARA_STATS.includes(a.status));

  // ROI por categoria de risco
  const riscos: CategoriaRisco[] = ["BAIXO", "MEDIO", "MEDIO_ALTO", "ALTO_ESPECULATIVO"];
  const roiPorRisco = riscos.map((risco) => {
    const doGrupo = resolvidas.filter((a) => a.categoriaRisco === risco);
    const stakeTotal = doGrupo.reduce((acc, a) => acc + a.stake, 0);
    const lucroTotal = doGrupo.reduce((acc, a) => acc + (a.lucroPrejuizo ?? 0), 0);
    const greens = doGrupo.filter((a) => a.status === "GREEN").length;
    const totalGR = doGrupo.filter((a) => a.status === "GREEN" || a.status === "RED").length;
    return {
      risco,
      quantidade: doGrupo.length,
      stakeTotal: round2(stakeTotal),
      lucroTotal: round2(lucroTotal),
      roi: stakeTotal > 0 ? round2((lucroTotal / stakeTotal) * 100) : 0,
      winRate: totalGR > 0 ? round2((greens / totalGR) * 100) : 0,
    };
  });

  // ROI por casa
  const casaIds = Array.from(new Set(resolvidas.map((a) => a.casaId)));
  const roiPorCasa = casaIds.map((casaId) => {
    const doGrupo = resolvidas.filter((a) => a.casaId === casaId);
    const stakeTotal = doGrupo.reduce((acc, a) => acc + a.stake, 0);
    const lucroTotal = doGrupo.reduce((acc, a) => acc + (a.lucroPrejuizo ?? 0), 0);
    return {
      casaId,
      casaNome: doGrupo[0]?.casaNome ?? "",
      quantidade: doGrupo.length,
      stakeTotal: round2(stakeTotal),
      lucroTotal: round2(lucroTotal),
      roi: stakeTotal > 0 ? round2((lucroTotal / stakeTotal) * 100) : 0,
    };
  });

  // Calibração: faixas de P_justa vs win rate real
  const faixas = [
    { label: "50-59%", min: 50, max: 59.999 },
    { label: "60-69%", min: 60, max: 69.999 },
    { label: "70-79%", min: 70, max: 79.999 },
    { label: "80-89%", min: 80, max: 89.999 },
    { label: "90-100%", min: 90, max: 100 },
  ];
  const calibracao = faixas.map((f) => {
    const doGrupo = resolvidas.filter(
      (a) => a.pJusta !== null && a.pJusta >= f.min && a.pJusta <= f.max
    );
    const greens = doGrupo.filter((a) => a.status === "GREEN").length;
    const totalGR = doGrupo.filter((a) => a.status === "GREEN" || a.status === "RED").length;
    const pJustaMedia =
      doGrupo.length > 0 ? doGrupo.reduce((acc, a) => acc + (a.pJusta ?? 0), 0) / doGrupo.length : 0;
    return {
      faixa: f.label,
      quantidade: doGrupo.length,
      pJustaMedia: round2(pJustaMedia),
      winRateReal: totalGR > 0 ? round2((greens / totalGR) * 100) : 0,
    };
  });

  // Odd média e stake médio por mês
  const porMes = new Map<string, { odds: number[]; stakes: number[] }>();
  for (const a of norm) {
    const mes = a.data.toISOString().slice(0, 7);
    const entry = porMes.get(mes) ?? { odds: [], stakes: [] };
    entry.odds.push(a.odd);
    entry.stakes.push(a.stake);
    porMes.set(mes, entry);
  }
  const mediaMensal = Array.from(porMes.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, { odds, stakes }]) => ({
      mes,
      oddMedia: round2(odds.reduce((a, b) => a + b, 0) / odds.length),
      stakeMedio: round2(stakes.reduce((a, b) => a + b, 0) / stakes.length),
    }));

  // Maiores sequências históricas
  const { maiorGreen, maiorRed } = maioresSequencias(resolvidas);

  return { roiPorRisco, roiPorCasa, calibracao, mediaMensal, maiorGreen, maiorRed };
}
