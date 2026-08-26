import { getAnalises } from "@/lib/analises";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { formatBRL, formatPercent } from "@/lib/format";
import { RISCO_LABELS } from "@/lib/betting";
import { cn } from "@/lib/utils";
import { MediasChart } from "./medias-chart";

export const dynamic = "force-dynamic";

export default async function AnalisesPage() {
  const { roiPorRisco, roiPorCasa, calibracao, mediaMensal, maiorGreen, maiorRed } =
    await getAnalises();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Análises</h1>
        <p className="text-sm text-muted-foreground">Métricas extras de performance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Maior sequência de Green" value={`${maiorGreen}x`} hintClassName="text-emerald-500" />
        <StatCard label="Maior sequência de Red" value={`${maiorRed}x`} hintClassName="text-red-500" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ROI por categoria de risco</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Risco</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-right">Stake Total</TableHead>
                <TableHead className="text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roiPorRisco.map((r) => (
                <TableRow key={r.risco}>
                  <TableCell>{RISCO_LABELS[r.risco]}</TableCell>
                  <TableCell className="text-right">{r.quantidade}</TableCell>
                  <TableCell className="text-right">{formatPercent(r.winRate)}</TableCell>
                  <TableCell className="text-right">{formatBRL(r.stakeTotal)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      r.roi >= 0 ? "text-emerald-500" : "text-red-500"
                    )}
                  >
                    {formatPercent(r.roi)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ROI por casa</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Casa</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Stake Total</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roiPorCasa.map((r) => (
                <TableRow key={r.casaId}>
                  <TableCell>{r.casaNome}</TableCell>
                  <TableCell className="text-right">{r.quantidade}</TableCell>
                  <TableCell className="text-right">{formatBRL(r.stakeTotal)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right",
                      r.lucroTotal >= 0 ? "text-emerald-500" : "text-red-500"
                    )}
                  >
                    {formatBRL(r.lucroTotal)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium",
                      r.roi >= 0 ? "text-emerald-500" : "text-red-500"
                    )}
                  >
                    {formatPercent(r.roi)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calibração — P_justa vs. resultado real</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faixa P_justa</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">P_justa média</TableHead>
                <TableHead className="text-right">Win rate real</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calibracao.map((c) => (
                <TableRow key={c.faixa}>
                  <TableCell>{c.faixa}</TableCell>
                  <TableCell className="text-right">{c.quantidade}</TableCell>
                  <TableCell className="text-right">{formatPercent(c.pJustaMedia)}</TableCell>
                  <TableCell className="text-right">{formatPercent(c.winRateReal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Odd média e stake médio ao longo do tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <MediasChart data={mediaMensal} />
        </CardContent>
      </Card>
    </div>
  );
}
