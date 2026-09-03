"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboboxCreatable, type ComboboxItem } from "@/components/combobox-creatable";
import { createCompeticaoAction, createMercadoAction } from "@/lib/catalog-actions";
import { RISCO_LABELS } from "@/lib/betting";
import { createTravaAction, type ActionState } from "./actions";

const initialState: ActionState = {};

export function NovaTravaDialog({
  competicoes,
  mercados,
}: {
  competicoes: ComboboxItem[];
  mercados: ComboboxItem[];
}) {
  const [open, setOpen] = useState(false);
  const [competicaoId, setCompeticaoId] = useState<string | undefined>();
  const [mercadoId, setMercadoId] = useState<string | undefined>();
  const [state, formAction, pending] = useActionState(createTravaAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Trava registrada.");
      setOpen(false);
      setCompeticaoId(undefined);
      setMercadoId(undefined);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Nova trava
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar trava mecânica</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label>Competição (opcional — vazio = trava geral do mercado)</Label>
            <ComboboxCreatable
              items={competicoes}
              value={competicaoId}
              onChange={setCompeticaoId}
              onCreate={(nome) => createCompeticaoAction(nome)}
              placeholder="Todas as competições"
            />
            <input type="hidden" name="competicaoId" value={competicaoId ?? ""} />
          </div>
          <div className="space-y-2">
            <Label>Mercado</Label>
            <ComboboxCreatable
              items={mercados}
              value={mercadoId}
              onChange={setMercadoId}
              onCreate={(nome) => createMercadoAction(nome)}
              placeholder="Selecione o mercado"
            />
            <input type="hidden" name="mercadoId" value={mercadoId ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tetoRisco">Teto de risco</Label>
            <Select name="tetoRisco" defaultValue="MEDIO_ALTO">
              <SelectTrigger id="tetoRisco" className="w-full">
                <SelectValue>{(v: string) => RISCO_LABELS[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RISCO_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivoAtivacao">Motivo</Label>
            <Textarea
              id="motivoAtivacao"
              name="motivoAtivacao"
              rows={2}
              placeholder="Ex: 2 rodadas negativas seguidas"
              required
            />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
