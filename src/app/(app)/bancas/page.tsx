import { AlertTriangle, PauseCircle, PlayCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDateTime } from "@/lib/format";
import { unidadeSugerida } from "@/lib/betting";
import { EvolucaoChart, type SnapshotPoint } from "@/components/evolucao-chart";
import { StatCard } from "@/components/stat-card";
import { NovaCasaDialog, AtualizarSaldoDialog } from "./casa-dialogs";
import { toggleCasaAtivaAction } from "./actions";

export const dynamic = "force-dynamic";

const SALDO_BAIXO_LIMIAR = 15;

export default async function BancasPage() {
  const [casas, snapshots, ultimaUnidade] = await Promise.all([
    prisma.casa.findMany({
      orderBy: [{ ativa: "desc" }, { nome: "asc" }],
    }),
    prisma.saldoSnapshot.findMany({
      include: { casa: { select: { nome: true } } },
      orderBy: { data: "asc" },
    }),
    prisma.unidade.findFirst({ orderBy: { data: "desc" } }),
  ]);

  const casasAtivas = casas.filter((c) => c.ativa);
  const bancaTotal = casasAtivas.reduce((acc, c) => acc + Number(c.saldoAtual), 0);
  const unidade = ultimaUnidade ? Number(ultimaUnidade.valor) : unidadeSugerida(bancaTotal);

  const points: SnapshotPoint[] = snapshots.map((s) => ({
    data: s.data.toISOString().slice(0, 10),
    casaId: s.casaId,
    casaNome: s.casa.nome,
    saldo: Number(s.saldo),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bancas</h1>
          <p className="text-sm text-muted-foreground">
            Saldo por casa de apostas e evolução da banca
          </p>
        </div>
        <NovaCasaDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Banca total (casas ativas)" value={formatBRL(bancaTotal)} />
        <StatCard label="Unidade atual (2% da banca)" value={formatBRL(unidade)} />
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {casas.map((casa) => {
          const saldoBaixo = casa.ativa && Number(casa.saldoAtual) < SALDO_BAIXO_LIMIAR;
          return (
            <Card key={casa.id} className={!casa.ativa ? "opacity-60" : undefined}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{casa.nome}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Atualizado {formatDateTime(casa.atualizadaEm)}
                  </p>
                </div>
                {!casa.ativa ? <Badge variant="secondary">Aposentada</Badge> : null}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="tabular text-2xl font-semibold tracking-tight">
                  {formatBRL(casa.saldoAtual)}
                </p>
                {saldoBaixo ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-500">
                    <AlertTriangle className="size-3.5" />
                    Saldo baixo — considere depósito ou consolidação
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <AtualizarSaldoDialog
                    casaId={casa.id}
                    casaNome={casa.nome}
                    saldoAtual={Number(casa.saldoAtual)}
                  />
                  <form
                    action={async () => {
                      "use server";
                      await toggleCasaAtivaAction(casa.id, !casa.ativa);
                    }}
                  >
                    <Button size="sm" variant="ghost" type="submit">
                      {casa.ativa ? (
                        <>
                          <PauseCircle className="size-3.5" />
                          Aposentar
                        </>
                      ) : (
                        <>
                          <PlayCircle className="size-3.5" />
                          Reativar
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
