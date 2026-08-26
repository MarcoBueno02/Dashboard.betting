"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

export function MediasChart({
  data,
}: {
  data: { mes: string; oddMedia: number; stakeMedio: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Sem dados suficientes ainda.
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis yAxisId="odd" fontSize={11} tickLine={false} axisLine={false} width={40} />
          <YAxis
            yAxisId="stake"
            orientation="right"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend />
          <Line
            yAxisId="odd"
            type="monotone"
            dataKey="oddMedia"
            name="Odd média"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="stake"
            type="monotone"
            dataKey="stakeMedio"
            name="Stake médio (R$)"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
