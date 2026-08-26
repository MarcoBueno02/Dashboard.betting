import Link from "next/link";
import { LogOut, TrendingUp } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { NavLink } from "@/components/nav-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/login/actions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-card/40 md:flex">
        <div className="flex items-center gap-2 px-4 py-5">
          <TrendingUp className="size-5 text-primary" />
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Trading Esportivo
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
        <div className="flex items-center justify-between border-t px-3 py-3">
          <ThemeToggle />
          <form action={logoutAction}>
            <Button variant="ghost" size="icon" type="submit" aria-label="Sair">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3 md:hidden">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="size-5 text-primary" />
            Trading Esportivo
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={logoutAction}>
              <Button variant="ghost" size="icon" type="submit" aria-label="Sair">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t bg-card/95 backdrop-blur md:hidden">
          {NAV_ITEMS.filter((item) => item.mobile).map((item) => (
            <NavLink key={item.href} {...item} variant="bottom" />
          ))}
        </nav>
      </div>
    </div>
  );
}
