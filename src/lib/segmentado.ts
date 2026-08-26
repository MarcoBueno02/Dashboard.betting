import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type SegmentoRow = {
  competicaoId: string;
  competicaoNome: string;
  mercadoId: string;
  mercadoNome: string;
  green: number;
  red: number;
  winRate: number;
  roi: number;
  stakeTotal: number;
  lucroTotal: number;
  candidatoTrava: boolean;
};

const STATUS_RESOLVIDOS = Prisma.sql`('GREEN','RED','REEMBOLSO','MEIA_GREEN','MEIA_RED')`;

export async function getSegmentacao(): Promise<SegmentoRow[]> {
  const agregados = await prisma.$queryRaw<
    {
      competicaoId: string;
      competicaoNome: string;
      mercadoId: string;
      mercadoNome: string;
      green: number;
      red: number;
      stakeTotal: number;
      lucroTotal: number;
    }[]
  >(Prisma.sql`
    SELECT
      a."competicaoId" as "competicaoId",
      c.nome as "competicaoNome",
      a."mercadoId" as "mercadoId",
      m.nome as "mercadoNome",
      COUNT(*) FILTER (WHERE a.status = 'GREEN')::int as green,
      COUNT(*) FILTER (WHERE a.status = 'RED')::int as red,
      COALESCE(SUM(a.stake) FILTER (WHERE a.status IN ${STATUS_RESOLVIDOS}), 0)::float as "stakeTotal",
      COALESCE(SUM(a."lucroPrejuizo") FILTER (WHERE a.status IN ${STATUS_RESOLVIDOS}), 0)::float as "lucroTotal"
    FROM "Aposta" a
    JOIN "Competicao" c ON c.id = a."competicaoId"
    JOIN "Mercado" m ON m.id = a."mercadoId"
    WHERE a.status <> 'PENDENTE'
    GROUP BY a."competicaoId", c.nome, a."mercadoId", m.nome
    ORDER BY c.nome ASC, m.nome ASC
  `);

  const recentes = await prisma.aposta.findMany({
    where: { status: { in: ["GREEN", "RED"] } },
    select: { competicaoId: true, mercadoId: true, status: true, data: true },
    orderBy: { data: "desc" },
  });

  const ultimosPorCombo = new Map<string, ("GREEN" | "RED")[]>();
  for (const r of recentes) {
    const key = `${r.competicaoId}::${r.mercadoId}`;
    const lista = ultimosPorCombo.get(key) ?? [];
    if (lista.length < 2) {
      lista.push(r.status as "GREEN" | "RED");
      ultimosPorCombo.set(key, lista);
    }
  }

  return agregados.map((row) => {
    const key = `${row.competicaoId}::${row.mercadoId}`;
    const ultimos = ultimosPorCombo.get(key) ?? [];
    const candidatoTrava = ultimos.length === 2 && ultimos.every((s) => s === "RED");
    const totalGreenRed = row.green + row.red;
    return {
      ...row,
      winRate: totalGreenRed > 0 ? (row.green / totalGreenRed) * 100 : 0,
      roi: row.stakeTotal > 0 ? (row.lucroTotal / row.stakeTotal) * 100 : 0,
      candidatoTrava,
    };
  });
}
