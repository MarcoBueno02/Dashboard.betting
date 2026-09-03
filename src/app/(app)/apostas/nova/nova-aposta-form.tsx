"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { RISCO_LABELS, STATUS_LABELS, computeRetornoDefault, riscoExcedeTeto } from "@/lib/betting";
import { formatBRL, toInputDate } from "@/lib/format";
import type { CategoriaRisco, StatusAposta } from "@prisma/client";

const initialState: ActionState = {};

const STATUS_RESOLUCAO: StatusAposta[] = ["GREEN", "RED", "MEIA_GREEN", "MEIA_RED", "REEMBOLSO", "CANCELADA"];

export function NovaApostaForm({
  casas,
  competicoes,
  mercados,
  travasAtivas,
  jogosRecentes,
}: {
  casas: (ComboboxItem & { saldoAtual: number })[];
  competicoes: ComboboxItem[];
  mercados: ComboboxItem[];
  travasAtivas: { competicaoId: string | null; mercadoId: string; tetoRisco: CategoriaRisco }[];
  jogosRecentes: string[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createApostaAction, initialState);
  const [competicaoId, setCompeticaoId] = useState<string | undefined>();
  const [mercadoId, setMercadoId] = useState<string | undefined>();
  const [casaId, setCasaId] = useState<string | undefined>();
  const [avancado, setAvancado] = useState(false);
  const [categoriaRisco, setCategoriaRisco] = useState<string | undefined>();
  const [odd, setOdd] = useState<number>(0);
  const [stake, setStake] = useState<number>(0);
  const [jaResolvida, setJaResolvida] = useState(false);
  const [status, setStatus] = useState<StatusAposta>("GREEN");
  const [retorno, setRetorno] = useState<number>(0);
  const [atualizarSaldo, setAtualizarSaldo] = useState(true);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.success) {
      toast.success("Aposta registrada.");
      setFormKey((k) => k + 1);
      setCompeticaoId(undefined);
      setMercadoId(undefined);
      setCasaId(undefined);
      setCategoriaRisco(undefined);
      setJaResolvida(false);
      router.refresh();
    }
  }, [state.success, router]);

  const travaDetectada = useMemo(() => {
    if (!mercadoId) return null;
    return travasAtivas.find(
      (t) => t.mercadoId === mercadoId && (t.competicaoId === null || t.competicaoId === competicaoId)
    );
  }, [travasAtivas, mercadoId, competicaoId]);

  const riscoExcedeTravaAtual =
    travaDetectada && riscoExcedeTeto(categoriaRisco as CategoriaRisco, travaDetectada.tetoRisco);

  const casaSelecionada = casas.find((c) => c.id === casaId);
  const stakeExcedeSaldo = casaSelecionada && stake > 0 && stake > casaSelecionada.saldoAtual;

  const agora = toInputDate(new Date());

  const casaLabel: Record<string, string> = {};
  casas.forEach((c) => (casaLabel[c.id] = `${c.nome} — ${formatBRL(c.saldoAtual)}`));

  function handleStatusChange(value: string | null) {
    if (!value) return;
    const s = value as StatusAposta;
    setStatus(s);
    setRetorno(computeRetornoDefault(s, stake || 0, odd || 0) ?? 0);
  }

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
        <Select name="casaId" required value={casaId} onValueChange={(v) => setCasaId(v ?? undefined)}>
          <SelectTrigger id="casaId" className="w-full">
            <SelectValue>
              {(v: string | null) => (v ? (casaLabel[v] ?? v) : "Selecione a casa")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {casas.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome} — {formatBRL(c.saldoAtual)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {stakeExcedeSaldo ? (
          <p className="flex items-center gap-1.5 text-xs text-amber-500">
            <TriangleAlert className="size-3.5 shrink-0" />
            Stake maior que o saldo atual de {casaSelecionada?.nome} (
            {formatBRL(casaSelecionada?.saldoAtual ?? 0)}).
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="odd">Odd</Label>
          <Input
            id="odd"
            name="odd"
            type="number"
            step="0.001"
            min="1.001"
            required
            onChange={(e) => setOdd(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stake">Stake (R$)</Label>
          <Input
            id="stake"
            name="stake"
            type="number"
            step="0.01"
            min="0.01"
            required
            onChange={(e) => setStake(Number(e.target.value))}
          />
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
              <Select
                name="categoriaRisco"
                value={categoriaRisco}
                onValueChange={(v) => setCategoriaRisco(v ?? undefined)}
              >
                <SelectTrigger id="categoriaRisco" className="w-full">
                  <SelectValue>
                    {(v: string | null) => (v ? (RISCO_LABELS[v] ?? v) : "—")}
                  </SelectValue>
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
                  Risco acima do teto da trava ativa (
                  {RISCO_LABELS[travaDetectada!.tetoRisco]}).
                </p>
              ) : null}
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

      <div className="space-y-3 rounded-md border p-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="jaResolvida"
            name="jaResolvida"
            checked={jaResolvida}
            onCheckedChange={(v) => {
              const checked = v === true;
              setJaResolvida(checked);
              if (checked) setRetorno(computeRetornoDefault(status, stake || 0, odd || 0) ?? 0);
            }}
          />
          <Label htmlFor="jaResolvida" className="font-normal">
            Já tenho o resultado (registrar direto como resolvida)
          </Label>
        </div>

        {jaResolvida ? (
          <div className="flex flex-wrap items-end gap-3 pt-1">
            <div className="w-40 space-y-1">
              <Label className="text-xs">Resultado</Label>
              <Select name="status" value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: string) => STATUS_LABELS[v as StatusAposta] ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_RESOLUCAO.map((s) => (
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
                id="atualizarSaldo"
                name="atualizarSaldo"
                checked={atualizarSaldo}
                onCheckedChange={(v) => setAtualizarSaldo(v === true)}
              />
              <Label htmlFor="atualizarSaldo" className="text-xs font-normal">
                Atualizar saldo da casa
              </Label>
            </div>
          </div>
        ) : null}
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : jaResolvida ? "Registrar aposta resolvida" : "Registrar aposta"}
      </Button>
    </form>
  );
}
