import { prisma } from "@/lib/prisma";
import { LoteForm } from "./lote-form";

export const dynamic = "force-dynamic";

export default async function LotePage() {
  const [casas, competicoes, mercados] = await Promise.all([
    prisma.casa.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } }),
    prisma.competicao.findMany({ orderBy: { nome: "asc" } }),
    prisma.mercado.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Registro em Lote</h1>
        <p className="text-sm text-muted-foreground">
          Cole várias apostas de uma vez no formato{" "}
          <code className="rounded bg-secondary px-1 py-0.5 text-xs">
            jogo | entrada | casa | odd | stake
          </code>
        </p>
      </div>
      <LoteForm
        casas={casas.map((c) => ({ id: c.id, nome: c.nome }))}
        competicoes={competicoes.map((c) => ({ id: c.id, nome: c.nome }))}
        mercados={mercados.map((m) => ({ id: m.id, nome: m.nome }))}
      />
    </div>
  );
}
