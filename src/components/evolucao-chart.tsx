"use client";

import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatBRL, formatDate } from "@/lib/format";

export type SnapshotPoint = {
  data: string; // ISO date
  casaId: string;
  casaNome: string;
  saldo: number;
};

const PERIODOS = [
  { label: "7d", dias: 7 },
  { label: "30d", dias: 30 },
  { label: "90d", dias: 90 },
  { label: "Tudo", dias: 0 },
] as const;

function buildSeries(points: SnapshotPoint[], serie: string, dias: number) {
  const filtered =
    serie === "TOTAL"
      ? aggregateTotal(points)
      : points
          .filter((p) => p.casaId === serie)
          .map((p) => ({ data: p.data, valor: p.saldo }));

  const sorted = [...filtered].sort((a, b) => a.data.localeCompare(b.data));

  if (dias === 0) return sorted;
  const cutoff = Date.now() - dias * 24 * 60 * 60 * 1000;
  return sorted.filter((p) => new Date(p.data).getTime() >= cutoff);
}

function aggregateTotal(points: SnapshotPoint[]) {
  // Para cada casa, pega o último saldo conhecido até cada data e soma.
  const casas = Array.from(new Set(points.map((p) => p.casaId)));
  const datas = Array.from(new Set(points.map((p) => p.data))).sort();

  const ultimoPorCasa: Record<string, number> = {};
  const resultado: { data: string; valor: number }[] = [];

  for (const data of datas) {
    for (const casaId of casas) {
      const ponto = points.find((p) => p.data === data && p.casaId === casaId);
      if (ponto) ultimoPorCasa[casaId] = ponto.saldo;
    }
    const total = casas.reduce((acc, c) => acc + (ultimoPorCasa[c] ?? 0), 0);
    resultado.push({ data, valor: total });
  }

  return resultado;
}

export function EvolucaoChart({
  points,
  casas,
}: {
  points: SnapshotPoint[];
  casas: { id: string; nome: string }[];
}) {
  const [serie, setSerie] = useState<string>("TOTAL");
  const [periodo, setPeriodo] = useState<number>(30);

  const data = useMemo(() => buildSeries(points, serie, periodo), [points, serie, periodo]);

  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Sem histórico de saldo ainda.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 min-w-0 overflow-x-auto px-1">
          <Tabs value={serie} onValueChange={setSerie}>
            <TabsList>
              <TabsTrigger value="TOTAL">Total</TabsTrigger>
              {casas.map((c) => (
                <TabsTrigger key={c.id} value={c.id}>
                  {c.nome}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="-mx-1 min-w-0 overflow-x-auto px-1">
          <Tabs value={String(periodo)} onValueChange={(v) => setPeriodo(Number(v))}>
            <TabsList>
              {PERIODOS.map((p) => (
                <TabsTrigger key={p.label} value={String(p.dias)}>
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="data"
              tickFormatter={(v) => formatDate(v)}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatBRL(v)}
              fontSize={11}
              width={80}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => formatBRL(Number(value))}
              labelFormatter={(v) => formatDate(v as string)}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="valor"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
