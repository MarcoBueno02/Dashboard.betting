"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Pencil, TriangleAlert } from "lucide-react";
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
import { atualizarApostaAction, type ActionState } from "./actions";
import {
  RISCO_LABELS,
  STATUS_LABELS,
  computeRetornoDefault,
  riscoExcedeTeto,
} from "@/lib/betting";
import { toInputDate } from "@/lib/format";
import type { CategoriaRisco, StatusAposta } from "@prisma/client";

const initialState: ActionState = {};

const TODOS_STATUS: StatusAposta[] = [
  "PENDENTE",
  "GREEN",
  "RED",
  "MEIA_GREEN",
  "MEIA_RED",
  "REEMBOLSO",
  "CANCELADA",
];

export type ApostaParaEditar = {
  id: string;
  data: string; // ISO
  competicaoId: string;
  jogoDescricao: string;
  mercadoId: string;
  entradaDescricao: string;
  casaId: string;
  odd: number;
  stake: number;
  pJusta: number | null;
  evPercentual: number | null;
  categoriaRisco: CategoriaRisco | null;
  omaEfetiva: number | null;
  notas: string | null;
  status: StatusAposta;
  retornoReal: number | null;
};

export function EditarApostaDialog({
  aposta,
  casas,
  competicoes,
  mercados,
  travasAtivas,
}: {
  aposta: ApostaParaEditar;
  casas: ComboboxItem[];
  competicoes: ComboboxItem[];
  mercados: ComboboxItem[];
  travasAtivas: { competicaoId: string | null; mercadoId: string; tetoRisco: CategoriaRisco }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(atualizarApostaAction, initialState);
  const [competicaoId, setCompeticaoId] = useState(aposta.competicaoId);
  const [mercadoId, setMercadoId] = useState(aposta.mercadoId);
  const [categoriaRisco, setCategoriaRisco] = useState<string | undefined>(
    aposta.categoriaRisco ?? undefined
  );
  const [status, setStatus] = useState<StatusAposta>(aposta.status);
  const [odd, setOdd] = useState(aposta.odd);
  const [stake, setStake] = useState(aposta.stake);
  const [retorno, setRetorno] = useState(aposta.retornoReal ?? 0);

  useEffect(() => {
    if (state.success) {
      toast.success("Aposta atualizada.");
      setOpen(false);
    }
  }, [state.success]);

  const travaDetectada = useMemo(() => {
    return travasAtivas.find(
      (t) => t.mercadoId === mercadoId && (t.competicaoId === null || t.competicaoId === competicaoId)
    );
  }, [travasAtivas, mercadoId, competicaoId]);

  const riscoExcedeTravaAtual =
    travaDetectada && riscoExcedeTeto(categoriaRisco as CategoriaRisco, travaDetectada.tetoRisco);

  function handleStatusChange(value: string | null) {
    if (!value) return;
    const s = value as StatusAposta;
    setStatus(s);
    if (s !== "PENDENTE") {
      setRetorno(computeRetornoDefault(s, stake || 0, odd || 0) ?? 0);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Editar aposta" />}>
        <Pencil className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar aposta</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="apostaId" value={aposta.id} />

          <div className="space-y-2">
            <Label htmlFor={`jogo-${aposta.id}`}>Jogo</Label>
            <Input
              id={`jogo-${aposta.id}`}
              name="jogoDescricao"
              defaultValue={aposta.jogoDescricao}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Competição</Label>
            <ComboboxCreatable
              items={competicoes}
              value={competicaoId}
              onChange={setCompeticaoId}
              onCreate={(nome) => createCompeticaoAction(nome)}
              placeholder="Selecione ou crie a competição"
            />
            <input type="hidden" name="competicaoId" value={competicaoId} />
          </div>

          <div className="space-y-2">
            <Label>Mercado</Label>
            <ComboboxCreatable
              items={mercados}
              value={mercadoId}
              onChange={setMercadoId}
              onCreate={(nome) => createMercadoAction(nome)}
              placeholder="Selecione ou crie o mercado"
            />
            <input type="hidden" name="mercadoId" value={mercadoId} />
          </div>

          {travaDetectada ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
              <TriangleAlert className="size-4 shrink-0" />
              Trava ativa nessa combinação — teto de risco:{" "}
              {RISCO_LABELS[travaDetectada.tetoRisco] ?? travaDetectada.tetoRisco}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor={`entrada-${aposta.id}`}>Entrada</Label>
            <Input
              id={`entrada-${aposta.id}`}
              name="entradaDescricao"
              defaultValue={aposta.entradaDescricao}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`casa-${aposta.id}`}>Casa</Label>
            <Select name="casaId" defaultValue={aposta.casaId} required>
              <SelectTrigger id={`casa-${aposta.id}`} className="w-full">
                <SelectValue placeholder="Selecione a casa" />
              </SelectTrigger>
              <SelectContent>
                {casas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`odd-${aposta.id}`}>Odd</Label>
              <Input
                id={`odd-${aposta.id}`}
                name="odd"
                type="number"
                step="0.001"
                min="1.001"
                defaultValue={aposta.odd}
                onChange={(e) => setOdd(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`stake-${aposta.id}`}>Stake (R$)</Label>
              <Input
                id={`stake-${aposta.id}`}
                name="stake"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={aposta.stake}
                onChange={(e) => setStake(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`data-${aposta.id}`}>Data</Label>
            <Input
              id={`data-${aposta.id}`}
              name="data"
              type="datetime-local"
              defaultValue={toInputDate(aposta.data)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`pJusta-${aposta.id}`}>P_justa (%)</Label>
              <Input
                id={`pJusta-${aposta.id}`}
                name="pJusta"
                type="number"
                step="0.01"
                defaultValue={aposta.pJusta ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`ev-${aposta.id}`}>EV (%)</Label>
              <Input
                id={`ev-${aposta.id}`}
                name="evPercentual"
                type="number"
                step="0.01"
                defaultValue={aposta.evPercentual ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`risco-${aposta.id}`}>Categoria de risco</Label>
              <Select
                name="categoriaRisco"
                value={categoriaRisco}
                onValueChange={(v) => setCategoriaRisco(v ?? undefined)}
              >
                <SelectTrigger id={`risco-${aposta.id}`} className="w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RISCO_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {riscoExcedeTravaAtual ? (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <TriangleAlert className="size-3.5 shrink-0" />
                  Risco acima do teto da trava ativa ({RISCO_LABELS[travaDetectada!.tetoRisco]}).
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`oma-${aposta.id}`}>OMA efetiva</Label>
              <Input
                id={`oma-${aposta.id}`}
                name="omaEfetiva"
                type="number"
                step="0.001"
                defaultValue={aposta.omaEfetiva ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`notas-${aposta.id}`}>Notas</Label>
            <Textarea
              id={`notas-${aposta.id}`}
              name="notas"
              rows={2}
              defaultValue={aposta.notas ?? ""}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
            <div className="w-40 space-y-1">
              <Label className="text-xs">Status</Label>
              <Select name="status" value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TODOS_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {status !== "PENDENTE" ? (
              <div className="w-32 space-y-1">
                <Label className="text-xs">Retorno (R$)</Label>
                <Input
                  name="retornoReal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={retorno}
                  onChange={(e) => setRetorno(Number(e.target.value))}
                />
              </div>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Editar aqui só corrige os dados registrados — não mexe de novo no saldo da casa nem no
            contador de trava. Se o status mudou e o saldo precisa ser ajustado, faça isso em
            Bancas.
          </p>

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
