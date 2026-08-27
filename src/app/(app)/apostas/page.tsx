import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL, formatDate } from "@/lib/format";
import { StatusBadge, RiscoBadge } from "@/components/status-badge";
import { ApostasFilters } from "./filters";
import { SortHeader } from "./sort-header";
import { buildApostaOrderBy, buildApostaWhere } from "@/lib/aposta-filters";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ApostasPage({ searchParams }: PageProps<"/apostas">) {
  const sp = await searchParams;
  const where = buildApostaWhere(sp);
  const orderBy = buildApostaOrderBy(sp);
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);

  const [apostas, total, casas, competicoes, mercados] = await Promise.all([
    prisma.aposta.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { casa: true, competicao: true, mercado: true },
    }),
    prisma.aposta.count({ where }),
    prisma.casa.findMany({ orderBy: { nome: "asc" } }),
    prisma.competicao.findMany({ orderBy: { nome: "asc" } }),
    prisma.mercado.findMany({ orderBy: { nome: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const paramsFor = (p: number) => {
    const params = new URLSearchParams(
      Object.entries(sp).flatMap(([k, v]) =>
        v === undefined ? [] : [[k, Array.isArray(v) ? v[0] : v]]
      ) as [string, string][]
    );
    params.set("page", String(p));
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Histórico de Apostas</h1>
        <p className="text-sm text-muted-foreground">{total} apostas encontradas</p>
      </div>

      <ApostasFilters
        casas={casas.map((c) => ({ id: c.id, nome: c.nome }))}
        competicoes={competicoes.map((c) => ({ id: c.id, nome: c.nome }))}
        mercados={mercados.map((m) => ({ id: m.id, nome: m.nome }))}
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortHeader field="data" label="Data" />
                </TableHead>
                <TableHead>Jogo</TableHead>
                <TableHead>Competição</TableHead>
                <TableHead>Mercado</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Casa</TableHead>
                <TableHead>
                  <SortHeader field="odd" label="Odd" />
                </TableHead>
                <TableHead>
                  <SortHeader field="stake" label="Stake" />
                </TableHead>
                <TableHead>Risco</TableHead>
                <TableHead>
                  <SortHeader field="status" label="Status" />
                </TableHead>
                <TableHead className="text-right">
                  <SortHeader field="lucroPrejuizo" label="P/L" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apostas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(a.data)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{a.jogoDescricao}</TableCell>
                  <TableCell className="whitespace-nowrap">{a.competicao.nome}</TableCell>
                  <TableCell className="whitespace-nowrap">{a.mercado.nome}</TableCell>
                  <TableCell className="max-w-[160px] truncate">{a.entradaDescricao}</TableCell>
                  <TableCell className="whitespace-nowrap">{a.casa.nome}</TableCell>
                  <TableCell className="tabular">{Number(a.odd).toFixed(2)}</TableCell>
                  <TableCell className="tabular">{formatBRL(a.stake)}</TableCell>
                  <TableCell>
                    <RiscoBadge risco={a.categoriaRisco} />
                  </TableCell>
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
              {apostas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                    Nenhuma aposta encontrada.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            {page <= 1 ? (
              <Button variant="outline" size="sm" disabled>
                Anterior
              </Button>
            ) : (
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href={paramsFor(page - 1)} />}>
                Anterior
              </Button>
            )}
            {page >= totalPages ? (
              <Button variant="outline" size="sm" disabled>
                Próxima
              </Button>
            ) : (
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href={paramsFor(page + 1)} />}>
                Próxima
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
