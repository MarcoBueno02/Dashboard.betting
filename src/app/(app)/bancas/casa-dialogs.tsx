"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCasaAction, updateSaldoAction, type ActionState } from "./actions";

const initialState: ActionState = {};

export function NovaCasaDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createCasaAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Casa cadastrada.");
      setOpen(false);
    }
  }, [state.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Nova casa
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova casa de apostas</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" placeholder="Ex: Superbet" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="saldoAtual">Saldo inicial (R$)</Label>
            <Input
              id="saldoAtual"
              name="saldoAtual"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              required
            />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AtualizarSaldoDialog({
  casaId,
  casaNome,
  saldoAtual,
}: {
  casaId: string;
  casaNome: string;
  saldoAtual: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateSaldoAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(`Saldo de ${casaNome} atualizado.`);
      setOpen(false);
    }
  }, [state.success, casaNome]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <RefreshCw className="size-3.5" />
        Atualizar saldo
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atualizar saldo — {casaNome}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="casaId" value={casaId} />
          <div className="space-y-2">
            <Label htmlFor={`saldo-${casaId}`}>Saldo atual (R$)</Label>
            <Input
              id={`saldo-${casaId}`}
              name="saldo"
              type="number"
              step="0.01"
              min="0"
              defaultValue={saldoAtual}
              required
              autoFocus
            />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
