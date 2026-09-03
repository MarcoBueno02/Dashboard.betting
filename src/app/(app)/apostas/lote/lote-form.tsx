"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { ComboboxCreatable, type ComboboxItem } from "@/components/combobox-creatable";
import { createCompeticaoAction, createMercadoAction } from "@/lib/catalog-actions";
import { parseLoteTexto, type LoteRow } from "@/lib/lote-parser";
import { createApostasLoteAction } from "./actions";

const EXEMPLO = `Juventude x CRB | Ambas Marcam Não | Betnacional | 1,50 | 5,12
Vasco x Vitória | Ambas Marcam Não | Pitaco | 1,77 | 2,05`;

export function LoteForm({
  casas,
  competicoes,
  mercados,
}: {
  casas: ComboboxItem[];
  competicoes: ComboboxItem[];
  mercados: ComboboxItem[];
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [rows, setRows] = useState<LoteRow[] | null>(null);
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [competicaoId, setCompeticaoId] = useState<string | undefined>();
  const [mercadoId, setMercadoId] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const validas = useMemo(() => (rows ?? []).filter((r) => !r.erro), [rows]);

  function handlePreview() {
    setRows(parseLoteTexto(texto, casas));
  }

  function handleConfirmar() {
    if (!data || !competicaoId || !mercadoId || validas.length === 0) return;
    startTransition(async () => {
      const result = await createApostasLoteAction({
        data,
        competicaoId,
        mercadoId,
        rows: validas.map((r) => ({
          jogoDescricao: r.jogoDescricao,
          entradaDescricao: r.entradaDescricao,
          casaId: r.casaId!,
          odd: r.odd!,
          stake: r.stake!,
        })),
      });
      if (result.success) {
        toast.success(`${result.criadas} apostas registradas.`);
        setTexto("");
        setRows(null);
        router.refresh();
      } else {
        toast.error(result.error ?? "Erro ao registrar apostas");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="data-lote">Data dos jogos (aplicada a todas as linhas)</Label>
          <Input
            id="data-lote"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Competição (aplicada a todas as linhas)</Label>
          <ComboboxCreatable
            items={competicoes}
            value={competicaoId}
            onChange={setCompeticaoId}
            onCreate={(nome) => createCompeticaoAction(nome)}
            placeholder="Selecione ou crie a competição"
          />
        </div>
        <div className="space-y-2">
          <Label>Mercado (aplicado a todas as linhas)</Label>
          <ComboboxCreatable
            items={mercados}
            value={mercadoId}
            onChange={setMercadoId}
            onCreate={(nome) => createMercadoAction(nome)}
            placeholder="Selecione ou crie o mercado"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="texto-lote">Colar apostas</Label>
        <Textarea
          id="texto-lote"
          rows={8}
          placeholder={EXEMPLO}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="font-mono text-sm"
        />
        <Button type="button" variant="secondary" onClick={handlePreview} disabled={!texto.trim()}>
          Pré-visualizar
        </Button>
      </div>

      {rows ? (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Jogo</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Casa</TableHead>
                  <TableHead>Odd</TableHead>
                  <TableHead>Stake</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.linha}>
                    <TableCell>{r.linha}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{r.jogoDescricao}</TableCell>
                    <TableCell className="max-w-[140px] truncate">{r.entradaDescricao}</TableCell>
                    <TableCell>{r.casaNome}</TableCell>
                    <TableCell>{r.odd ?? "—"}</TableCell>
                    <TableCell>{r.stake ?? "—"}</TableCell>
                    <TableCell>
                      {r.erro ? (
                        <span className="flex items-center gap-1 text-xs text-red-500">
                          <XCircle className="size-3.5" />
                          {r.erro}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-emerald-500">
                          <CheckCircle2 className="size-3.5" />
                          OK
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {rows ? (
        <div className="flex items-center gap-3">
          <Button
            onClick={handleConfirmar}
            disabled={pending || !data || !competicaoId || !mercadoId || validas.length === 0}
          >
            {pending ? "Registrando..." : `Confirmar ${validas.length} apostas`}
          </Button>
          {!data || !competicaoId || !mercadoId ? (
            <p className="text-xs text-muted-foreground">
              Selecione data, competição e mercado para confirmar.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
