"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { IconName } from "@/lib/nav";
import {
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  ClipboardList,
  Wallet,
  LayoutGrid,
  Lock,
  LineChart,
} from "lucide-react";

const ICONS: Record<IconName, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  nova: PlusCircle,
  pendentes: ListChecks,
  historico: ClipboardList,
  bancas: Wallet,
  lote: ClipboardList,
  segmentado: LayoutGrid,
  travas: Lock,
  analises: LineChart,
};

export function NavLink({
  href,
  label,
  icon,
  variant = "sidebar",
}: {
  href: string;
  label: string;
  icon: IconName;
  variant?: "sidebar" | "bottom";
}) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  const Icon = ICONS[icon];

  if (variant === "bottom") {
    return (
      <Link
        href={href}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px]",
          active ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Icon className="size-5" />
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
      )}
    >
      <Icon className={cn("size-4", active && "text-primary")} />
      {label}
    </Link>
  );
}
