"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { computeRetornoDefault, riscoExcedeTeto, STATUS_LABELS } from "@/lib/betting";
import { formatBRL, formatDate } from "@/lib/format";
import { RiscoBadge } from "@/components/status-badge";
import { resolverApostaAction, type ActionState } from "../actions";
import { EditarApostaDialog } from "../editar-aposta-dialog";
import type { ComboboxItem } from "@/components/combobox-creatable";
import type { CategoriaRisco, StatusAposta } from "@prisma/client";

const RESOLVE_STATUSES: StatusAposta[] = [
  "GREEN",
  "RED",
  "MEIA_GREEN",
  "MEIA_RED",
  "REEMBOLSO",
  "CANCELADA",
];

const initialState: ActionState = {};

export function PendenteRow({
  aposta,
  casas,
  competicoes,
  mercados,
  travasAtivas,
}: {
  aposta: {
    id: string;
    data: Date;
    competicaoId: string;
    jogoDescricao: string;
    mercadoId: string;
    entradaDescricao: string;
    casaId: string;
    casaNome: string;
    competicaoNome: string;
    mercadoNome: string;
    odd: number;
    stake: number;
    pJusta: number | null;
    evPercentual: number | null;
    categoriaRisco: CategoriaRisco | null;
    omaEfetiva: number | null;
    notas: string | null;
    travaAtiva: boolean;
  };
  casas: ComboboxItem[];
  competicoes: ComboboxItem[];
  mercados: ComboboxItem[];
  travasAtivas: { competicaoId: string | null; mercadoId: string; tetoRisco: CategoriaRisco }[];
}) {
  const [state, formAction, pending] = useActionState(resolverApostaAction, initialState);
  const [status, setStatus] = useState<StatusAposta>("GREEN");
  const [retorno, setRetorno] = useState<number>(
    computeRetornoDefault("GREEN", aposta.stake, aposta.odd) ?? 0
  );
  const [atualizarSaldo, setAtualizarSaldo] = useState(true);

  useEffect(() => {
    if (state.success) {
      toast.success(`${aposta.jogoDescricao} resolvida.`);
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state, aposta.jogoDescricao]);

  function handleStatusChange(value: string | null) {
    if (!value) return;
    const s = value as StatusAposta;
    setStatus(s);
    const def = computeRetornoDefault(s, aposta.stake, aposta.odd);
    setRetorno(def ?? 0);
  }

  if (state.success) return null;

  const trava = travasAtivas.find(
    (t) => t.mercadoId === aposta.mercadoId && (t.competicaoId === null || t.competicaoId === aposta.competicaoId)
  );
  const alertaRisco = aposta.travaAtiva && riscoExcedeTeto(aposta.categoriaRisco, trava?.tetoRisco);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{aposta.jogoDescricao}</p>
          <p className="text-sm text-muted-foreground">
            {aposta.competicaoNome} · {aposta.mercadoNome} · {aposta.entradaDescricao}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatDate(aposta.data)} · {aposta.casaNome} · Odd {aposta.odd.toFixed(2)} · Stake{" "}
            {formatBRL(aposta.stake)}
          </p>
          {alertaRisco ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-red-500">
              <TriangleAlert className="size-3.5 shrink-0" />
              Risco {aposta.categoriaRisco} acima do teto da trava ativa ({trava?.tetoRisco}).
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <RiscoBadge risco={aposta.categoriaRisco} />
          {aposta.travaAtiva ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-500">
              Trava
            </span>
          ) : null}
          <EditarApostaDialog
            aposta={{
              ...aposta,
              data: aposta.data.toISOString(),
              status: "PENDENTE",
              retornoReal: null,
            }}
            casas={casas}
            competicoes={competicoes}
            mercados={mercados}
            travasAtivas={travasAtivas}
          />
        </div>
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="apostaId" value={aposta.id} />
        <div className="w-40 space-y-1">
          <Label className="text-xs">Resultado</Label>
          <Select name="status" value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOLVE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
        <div className="flex items-center gap-2 pb-2">
          <Checkbox
            id={`saldo-${aposta.id}`}
            name="atualizarSaldo"
            checked={atualizarSaldo}
            onCheckedChange={(v) => setAtualizarSaldo(v === true)}
          />
          <Label htmlFor={`saldo-${aposta.id}`} className="text-xs font-normal">
            Atualizar saldo da casa
          </Label>
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando..." : "Confirmar"}
        </Button>
      </form>
    </div>
  );
}
