"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ComboboxItem = { id: string; nome: string };

export function ComboboxCreatable({
  items,
  value,
  onChange,
  onCreate,
  placeholder = "Selecione...",
  emptyLabel = "Nenhum resultado.",
}: {
  items: ComboboxItem[];
  value: string | undefined;
  onChange: (id: string) => void;
  onCreate: (nome: string) => Promise<ComboboxItem>;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [localItems, setLocalItems] = useState(items);

  const selected = localItems.find((i) => i.id === value);
  const showCreate =
    search.trim().length > 0 &&
    !localItems.some((i) => i.nome.toLowerCase() === search.trim().toLowerCase());

  function handleCreate() {
    const nome = search.trim();
    if (!nome) return;
    startTransition(async () => {
      const created = await onCreate(nome);
      setLocalItems((prev) => [...prev, created]);
      onChange(created.id);
      setSearch("");
      setOpen(false);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          />
        }
      >
        <span className={cn(!selected && "text-muted-foreground")}>
          {selected ? selected.nome : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder="Buscar ou criar..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {localItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.nome}
                  onSelect={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === item.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.nome}
                </CommandItem>
              ))}
            </CommandGroup>
            {showCreate ? (
              <CommandGroup>
                <CommandItem onSelect={handleCreate} disabled={pending}>
                  <Plus className="mr-2 size-4" />
                  Criar &quot;{search.trim()}&quot;
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
