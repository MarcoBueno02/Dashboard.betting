"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RISCO_LABELS } from "@/lib/betting";
import { editarTravaAction, type ActionState } from "./actions";
import type { CategoriaRisco } from "@prisma/client";

const initialState: ActionState = {};

export function EditarTravaDialog({
  trava,
}: {
  trava: {
    id: string;
    motivoAtivacao: string;
    tetoRisco: CategoriaRisco;
    rodadasPositivasConsecutivas: number;
  };
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(editarTravaAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Trava atualizada.");
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Editar trava" />}>
        <Pencil className="size-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar trava</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="travaId" value={trava.id} />
          <div className="space-y-2">
            <Label htmlFor={`teto-${trava.id}`}>Teto de risco</Label>
            <Select name="tetoRisco" defaultValue={trava.tetoRisco}>
              <SelectTrigger id={`teto-${trava.id}`} className="w-full">
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
            <Label htmlFor={`rodadas-${trava.id}`}>Rodadas positivas consecutivas (0-3)</Label>
            <Input
              id={`rodadas-${trava.id}`}
              name="rodadasPositivasConsecutivas"
              type="number"
              min="0"
              max="3"
              step="1"
              defaultValue={trava.rodadasPositivasConsecutivas}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`motivo-${trava.id}`}>Motivo</Label>
            <Textarea
              id={`motivo-${trava.id}`}
              name="motivoAtivacao"
              rows={3}
              defaultValue={trava.motivoAtivacao}
              required
            />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
