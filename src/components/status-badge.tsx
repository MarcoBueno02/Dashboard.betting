import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RISCO_LABELS, STATUS_LABELS } from "@/lib/betting";
import type { CategoriaRisco, StatusAposta } from "@prisma/client";

const STATUS_STYLES: Record<StatusAposta, string> = {
  PENDENTE: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  GREEN: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  RED: "bg-red-500/15 text-red-500 border-red-500/30",
  MEIA_GREEN: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  MEIA_RED: "bg-red-500/10 text-red-500 border-red-500/20",
  REEMBOLSO: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  CANCELADA: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

export function StatusBadge({ status }: { status: StatusAposta }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const RISCO_STYLES: Record<string, string> = {
  BAIXO: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  MEDIO: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  MEDIO_ALTO: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  ALTO_ESPECULATIVO: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function RiscoBadge({ risco }: { risco: CategoriaRisco | null | undefined }) {
  if (!risco) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={cn("font-medium", RISCO_STYLES[risco])}>
      {RISCO_LABELS[risco]}
    </Badge>
  );
}
