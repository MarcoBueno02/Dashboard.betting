import { TrendingUp } from "lucide-react";

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
        <TrendingUp className="size-4.5" strokeWidth={2.5} />
      </div>
      <span className="text-[15px] font-bold tracking-tight">Trading Esportivo</span>
    </div>
  );
}
