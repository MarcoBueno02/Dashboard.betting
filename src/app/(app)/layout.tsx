import Link from "next/link";
import { LogOut } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { NavLink } from "@/components/nav-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/login/actions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-0">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="px-4 py-5">
          <Link href="/">
            <Brand />
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

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-sidebar px-4 py-3 md:hidden">
          <Link href="/">
            <Brand />
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

        <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t bg-sidebar/95 backdrop-blur md:hidden">
          {NAV_ITEMS.filter((item) => item.mobile).map((item) => (
            <NavLink key={item.href} {...item} variant="bottom" />
          ))}
        </nav>
      </div>
    </div>
  );
}
