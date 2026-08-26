"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS, RISCO_LABELS } from "@/lib/betting";
import type { ComboboxItem } from "@/components/combobox-creatable";

const ALL = "__ALL__";

export function ApostasFilters({
  casas,
  competicoes,
  mercados,
}: {
  casas: ComboboxItem[];
  competicoes: ComboboxItem[];
  mercados: ComboboxItem[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam("q", q);
  }

  function clearAll() {
    setQ("");
    startTransition(() => router.push(pathname));
  }

  const exportParams = new URLSearchParams(searchParams.toString());

  return (
    <div className="space-y-3">
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <Input
          placeholder="Buscar jogo ou entrada..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Select
          value={searchParams.get("casaId") ?? ALL}
          onValueChange={(v) => updateParam("casaId", v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Casa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as casas</SelectItem>
            {casas.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("competicaoId") ?? ALL}
          onValueChange={(v) => updateParam("competicaoId", v)}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Competição" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as competições</SelectItem>
            {competicoes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("mercadoId") ?? ALL}
          onValueChange={(v) => updateParam("mercadoId", v)}
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Mercado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os mercados</SelectItem>
            {mercados.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("status") ?? ALL}
          onValueChange={(v) => updateParam("status", v)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("risco") ?? ALL}
          onValueChange={(v) => updateParam("risco", v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Risco" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os riscos</SelectItem>
            {Object.entries(RISCO_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-[150px]"
          value={searchParams.get("de") ?? ""}
          onChange={(e) => updateParam("de", e.target.value)}
        />
        <Input
          type="date"
          className="w-[150px]"
          value={searchParams.get("ate") ?? ""}
          onChange={(e) => updateParam("ate", e.target.value)}
        />

        <Button type="button" variant="ghost" onClick={clearAll}>
          <X className="size-4" />
          Limpar
        </Button>

        <Button
          variant="outline"
          nativeButton={false}
          render={<a href={`/api/apostas/export?${exportParams.toString()}`} />}
        >
          <Download className="size-4" />
          Exportar CSV
        </Button>
      </div>
    </div>
  );
}
