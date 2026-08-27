import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { getSegmentacao } from "@/lib/segmentado";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBRL, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SegmentadoPage() {
  const linhas = await getSegmentacao();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Segmentação</h1>
        <p className="text-sm text-muted-foreground">
          Performance por combinação de competição × mercado — nunca agregada entre si
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <TriangleAlert className="size-3.5 text-amber-500" />
        Linhas destacadas tiveram os 2 últimos resultados RED — candidatas a trava
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competição</TableHead>
                <TableHead>Mercado</TableHead>
                <TableHead className="text-right">Green</TableHead>
                <TableHead className="text-right">Red</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-right">ROI</TableHead>
                <TableHead className="text-right">Stake Total</TableHead>
                <TableHead className="text-right">Lucro Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => (
                <TableRow
                  key={`${l.competicaoId}-${l.mercadoId}`}
                  className={cn(l.candidatoTrava && "bg-red-500/10 hover:bg-red-500/15")}
                >
                  <TableCell>
                    <Link
                      href={`/apostas?competicaoId=${l.competicaoId}&mercadoId=${l.mercadoId}`}
                      className="hover:underline"
                    >
                      {l.competicaoNome}
                    </Link>
                  </TableCell>
                  <TableCell>{l.mercadoNome}</TableCell>
                  <TableCell className="tabular text-right text-emerald-500">{l.green}</TableCell>
                  <TableCell className="tabular text-right text-red-500">{l.red}</TableCell>
                  <TableCell className="tabular text-right">{formatPercent(l.winRate)}</TableCell>
                  <TableCell
                    className={cn(
                      "tabular text-right font-semibold",
                      l.roi >= 0 ? "text-emerald-500" : "text-red-500"
                    )}
                  >
                    {formatPercent(l.roi)}
                  </TableCell>
                  <TableCell className="tabular text-right">{formatBRL(l.stakeTotal)}</TableCell>
                  <TableCell
                    className={cn(
                      "tabular text-right font-semibold",
                      l.lucroTotal >= 0 ? "text-emerald-500" : "text-red-500"
                    )}
                  >
                    {formatBRL(l.lucroTotal)}
                  </TableCell>
                </TableRow>
              ))}
              {linhas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Sem apostas resolvidas ainda.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
