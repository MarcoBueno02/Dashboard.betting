export type IconName =
  | "dashboard"
  | "nova"
  | "pendentes"
  | "historico"
  | "bancas"
  | "lote"
  | "segmentado"
  | "travas"
  | "analises";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  mobile?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "dashboard", mobile: true },
  { href: "/apostas/nova", label: "Nova Aposta", icon: "nova", mobile: true },
  { href: "/apostas/pendentes", label: "Pendentes", icon: "pendentes", mobile: true },
  { href: "/apostas", label: "Histórico", icon: "historico", mobile: true },
  { href: "/bancas", label: "Bancas", icon: "bancas", mobile: true },
  { href: "/apostas/lote", label: "Registro em Lote", icon: "lote" },
  { href: "/segmentado", label: "Segmentação", icon: "segmentado" },
  { href: "/travas", label: "Travas", icon: "travas" },
  { href: "/analises", label: "Análises", icon: "analises" },
];
