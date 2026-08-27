import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { EvolucaoChart, type SnapshotPoint } from "@/components/evolucao-chart";
import { formatBRL, formatDate, formatPercent } from "@/lib/format";
import { currentStreak, roi, unidadeSugerida, winRate } from "@/lib/betting";
import { bancaTotalEmData } from "@/lib/banca";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [casasAtivas, snapshots, apostasResolvidas, pendentesCount, ultimasApostas] =
    await Promise.all([
      prisma.casa.findMany({ where: { ativa: true } }),
      prisma.saldoSnapshot.findMany({ orderBy: { data: "asc" }, include: { casa: { select: { nome: true } } } }),
      prisma.aposta.findMany({
        where: { status: { not: "PENDENTE" } },
        select: { status: true, stake: true, lucroPrejuizo: true, data: true },
        orderBy: { data: "desc" },
      }),
      prisma.aposta.count({ where: { status: "PENDENTE" } }),
      prisma.aposta.findMany({
        orderBy: { criadaEm: "desc" },
        take: 10,
        include: { casa: true, competicao: true, mercado: true },
      }),
    ]);

  const bancaTotal = casasAtivas.reduce((acc, c) => acc + Number(c.saldoAtual), 0);
  const casaIds = casasAtivas.map((c) => c.id);
  const snapsNum = snapshots.map((s) => ({ casaId: s.casaId, saldo: Number(s.saldo), data: s.data }));

  const agora = new Date();
  const umDiaAtras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  const umaSemanaAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
  const umMesAtras = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);

  const bancaDia = bancaTotalEmData(snapsNum, casaIds, umDiaAtras);
  const bancaSemana = bancaTotalEmData(snapsNum, casaIds, umaSemanaAtras);
  const bancaMes = bancaTotalEmData(snapsNum, casaIds, umMesAtras);

  const variacao = (base: number) => (base > 0 ? ((bancaTotal - base) / base) * 100 : 0);

  const unidade = unidadeSugerida(bancaTotal);
  const roiGeral = roi(apostasResolvidas);
  const winRateGeral = winRate(apostasResolvidas);
  const streak = currentStreak(apostasResolvidas);

  const points: SnapshotPoint[] = snapshots.map((s) => ({
    data: s.data.toISOString().slice(0, 10),
    casaId: s.casaId,
    casaNome: s.casa.nome,
    saldo: Number(s.saldo),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do seu trading esportivo</p>
        </div>
        <Button nativeButton={false} render={<Link href="/apostas/nova" />}>Nova aposta</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Banca total"
          value={formatBRL(bancaTotal)}
          hint={`${variacao(bancaDia) >= 0 ? "+" : ""}${formatPercent(variacao(bancaDia))} hoje`}
          hintClassName={variacao(bancaDia) >= 0 ? "text-emerald-500" : "text-red-500"}
        />
        <StatCard label="Unidade atual (2%)" value={formatBRL(unidade)} />
        <StatCard
          label="ROI geral"
          value={formatPercent(roiGeral)}
          hintClassName={roiGeral >= 0 ? "text-emerald-500" : "text-red-500"}
        />
        <StatCard label="Win rate geral" value={formatPercent(winRateGeral)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Variação 7 dias"
          value={`${variacao(bancaSemana) >= 0 ? "+" : ""}${formatPercent(variacao(bancaSemana))}`}
          hintClassName={variacao(bancaSemana) >= 0 ? "text-emerald-500" : "text-red-500"}
        />
        <StatCard
          label="Variação 30 dias"
          value={`${variacao(bancaMes) >= 0 ? "+" : ""}${formatPercent(variacao(bancaMes))}`}
          hintClassName={variacao(bancaMes) >= 0 ? "text-emerald-500" : "text-red-500"}
        />
        <StatCard label="Apostas pendentes" value={String(pendentesCount)} />
        <StatCard
          label="Sequência atual"
          value={
            streak.tipo ? `${streak.contagem}x ${streak.tipo === "GREEN" ? "Green" : "Red"}` : "—"
          }
          hintClassName={streak.tipo === "GREEN" ? "text-emerald-500" : "text-red-500"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução da banca</CardTitle>
        </CardHeader>
        <CardContent>
          <EvolucaoChart
            points={points}
            casas={casasAtivas.map((c) => ({ id: c.id, nome: c.nome }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas apostas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Jogo</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Casa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">P/L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ultimasApostas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(a.data)}</TableCell>
                  <TableCell className="max-w-[180px] truncate">{a.jogoDescricao}</TableCell>
                  <TableCell className="max-w-[160px] truncate">{a.entradaDescricao}</TableCell>
                  <TableCell className="whitespace-nowrap">{a.casa.nome}</TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                  <TableCell
                    className={`tabular text-right font-semibold ${
                      a.lucroPrejuizo === null
                        ? "text-muted-foreground"
                        : Number(a.lucroPrejuizo) >= 0
                          ? "text-emerald-500"
                          : "text-red-500"
                    }`}
                  >
                    {a.lucroPrejuizo === null ? "—" : formatBRL(a.lucroPrejuizo)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
