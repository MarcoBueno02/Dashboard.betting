"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ComboboxCreatable, type ComboboxItem } from "@/components/combobox-creatable";
import { createCompeticaoAction, createMercadoAction } from "@/lib/catalog-actions";
import { createApostaAction, type ActionState } from "../actions";
import { RISCO_LABELS } from "@/lib/betting";
import { toInputDate } from "@/lib/format";

const initialState: ActionState = {};

export function NovaApostaForm({
  casas,
  competicoes,
  mercados,
  travasAtivas,
  jogosRecentes,
}: {
  casas: ComboboxItem[];
  competicoes: ComboboxItem[];
  mercados: ComboboxItem[];
  travasAtivas: { competicaoId: string | null; mercadoId: string; tetoRisco: string }[];
  jogosRecentes: string[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createApostaAction, initialState);
  const [competicaoId, setCompeticaoId] = useState<string | undefined>();
  const [mercadoId, setMercadoId] = useState<string | undefined>();
  const [avancado, setAvancado] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.success) {
      toast.success("Aposta registrada.");
      setFormKey((k) => k + 1);
      setCompeticaoId(undefined);
      setMercadoId(undefined);
      router.refresh();
    }
  }, [state.success, router]);

  const travaDetectada = useMemo(() => {
    if (!mercadoId) return null;
    return travasAtivas.find(
      (t) => t.mercadoId === mercadoId && (t.competicaoId === null || t.competicaoId === competicaoId)
    );
  }, [travasAtivas, mercadoId, competicaoId]);

  const agora = toInputDate(new Date());

  return (
    <form key={formKey} action={formAction} className="max-w-xl space-y-5">
      <div className="space-y-2">
        <Label htmlFor="jogoDescricao">Jogo</Label>
        <Input
          id="jogoDescricao"
          name="jogoDescricao"
          placeholder="Ex: Juventude x CRB"
          list="jogos-recentes"
          required
          autoFocus
        />
        <datalist id="jogos-recentes">
          {jogosRecentes.map((j) => (
            <option key={j} value={j} />
          ))}
        </datalist>
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
        <input type="hidden" name="competicaoId" value={competicaoId ?? ""} />
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
        <input type="hidden" name="mercadoId" value={mercadoId ?? ""} />
      </div>

      {travaDetectada ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
          <TriangleAlert className="size-4 shrink-0" />
          Trava ativa nessa combinação — teto de risco:{" "}
          {RISCO_LABELS[travaDetectada.tetoRisco] ?? travaDetectada.tetoRisco}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="entradaDescricao">Entrada</Label>
        <Input
          id="entradaDescricao"
          name="entradaDescricao"
          placeholder="Ex: Ambas Marcam Não"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="casaId">Casa</Label>
        <Select name="casaId" required>
          <SelectTrigger id="casaId" className="w-full">
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
          <Label htmlFor="odd">Odd</Label>
          <Input id="odd" name="odd" type="number" step="0.001" min="1.001" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stake">Stake (R$)</Label>
          <Input id="stake" name="stake" type="number" step="0.01" min="0.01" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="data">Data</Label>
        <Input id="data" name="data" type="datetime-local" defaultValue={agora} required />
      </div>

      <Collapsible open={avancado} onOpenChange={setAvancado}>
        <CollapsibleTrigger
          render={<Button type="button" variant="ghost" size="sm" className="-ml-2" />}
        >
          <ChevronDown className={`size-4 transition-transform ${avancado ? "rotate-180" : ""}`} />
          Métricas do sistema (opcional)
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pJusta">P_justa (%)</Label>
              <Input id="pJusta" name="pJusta" type="number" step="0.01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evPercentual">EV (%)</Label>
              <Input id="evPercentual" name="evPercentual" type="number" step="0.01" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoriaRisco">Categoria de risco</Label>
              <Select name="categoriaRisco">
                <SelectTrigger id="categoriaRisco" className="w-full">
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="omaEfetiva">OMA efetiva</Label>
              <Input id="omaEfetiva" name="omaEfetiva" type="number" step="0.001" />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="space-y-2">
        <Label htmlFor="notas">Notas</Label>
        <Textarea id="notas" name="notas" rows={2} placeholder="Opcional" />
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : "Registrar aposta"}
      </Button>
    </form>
  );
}
