"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const casaLabel: Record<string, string> = { [ALL]: "Todas as casas" };
  casas.forEach((c) => (casaLabel[c.id] = c.nome));
  const competicaoLabel: Record<string, string> = { [ALL]: "Todas as competições" };
  competicoes.forEach((c) => (competicaoLabel[c.id] = c.nome));
  const mercadoLabel: Record<string, string> = { [ALL]: "Todos os mercados" };
  mercados.forEach((m) => (mercadoLabel[m.id] = m.nome));
  const statusLabel: Record<string, string> = { [ALL]: "Todos status", ...STATUS_LABELS };
  const riscoLabel: Record<string, string> = { [ALL]: "Todos os riscos", ...RISCO_LABELS };

  const filtrosAtivos = Array.from(searchParams.keys()).some((k) => k !== "page");

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar jogo ou entrada..."
            className="pl-8"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Casa</Label>
          <Select
            value={searchParams.get("casaId") ?? ALL}
            onValueChange={(v) => updateParam("casaId", v)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue>{(v: string) => casaLabel[v] ?? v}</SelectValue>
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
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Competição</Label>
          <Select
            value={searchParams.get("competicaoId") ?? ALL}
            onValueChange={(v) => updateParam("competicaoId", v)}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue>{(v: string) => competicaoLabel[v] ?? v}</SelectValue>
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
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Mercado</Label>
          <Select
            value={searchParams.get("mercadoId") ?? ALL}
            onValueChange={(v) => updateParam("mercadoId", v)}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue>{(v: string) => mercadoLabel[v] ?? v}</SelectValue>
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
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={searchParams.get("status") ?? ALL}
            onValueChange={(v) => updateParam("status", v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue>{(v: string) => statusLabel[v] ?? v}</SelectValue>
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
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Risco</Label>
          <Select
            value={searchParams.get("risco") ?? ALL}
            onValueChange={(v) => updateParam("risco", v)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue>{(v: string) => riscoLabel[v] ?? v}</SelectValue>
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
        </div>

        <div className="flex items-end gap-1.5">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">De</Label>
            <Input
              type="date"
              className="w-[150px]"
              value={searchParams.get("de") ?? ""}
              onChange={(e) => updateParam("de", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Até</Label>
            <Input
              type="date"
              className="w-[150px]"
              value={searchParams.get("ate") ?? ""}
              onChange={(e) => updateParam("ate", e.target.value)}
            />
          </div>
        </div>

        <div className="ml-auto flex items-end gap-2">
          {filtrosAtivos ? (
            <Button type="button" variant="ghost" onClick={clearAll}>
              <X className="size-4" />
              Limpar
            </Button>
          ) : null}

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
    </div>
  );
}
