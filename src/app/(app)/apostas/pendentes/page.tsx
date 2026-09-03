import { prisma } from "@/lib/prisma";
import { PendenteRow } from "./pendente-row";

export const dynamic = "force-dynamic";

export default async function PendentesPage() {
  const [apostas, casas, competicoes, mercados, travasAtivas] = await Promise.all([
    prisma.aposta.findMany({
      where: { status: "PENDENTE" },
      orderBy: { data: "asc" },
      include: { casa: true, competicao: true, mercado: true },
    }),
    prisma.casa.findMany({ orderBy: { nome: "asc" } }),
    prisma.competicao.findMany({ orderBy: { nome: "asc" } }),
    prisma.mercado.findMany({ orderBy: { nome: "asc" } }),
    prisma.trava.findMany({
      where: { status: "ATIVA" },
      select: { competicaoId: true, mercadoId: true, tetoRisco: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Apostas Pendentes</h1>
        <p className="text-sm text-muted-foreground">
          {apostas.length} aposta{apostas.length === 1 ? "" : "s"} aguardando resultado
        </p>
      </div>

      {apostas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma aposta pendente. 🎉</p>
      ) : (
        <div className="space-y-3">
          {apostas.map((a) => (
            <PendenteRow
              key={a.id}
              aposta={{
                id: a.id,
                data: a.data,
                competicaoId: a.competicaoId,
                jogoDescricao: a.jogoDescricao,
                mercadoId: a.mercadoId,
                entradaDescricao: a.entradaDescricao,
                casaId: a.casaId,
                casaNome: a.casa.nome,
                competicaoNome: a.competicao.nome,
                mercadoNome: a.mercado.nome,
                odd: Number(a.odd),
                stake: Number(a.stake),
                pJusta: a.pJusta === null ? null : Number(a.pJusta),
                evPercentual: a.evPercentual === null ? null : Number(a.evPercentual),
                categoriaRisco: a.categoriaRisco,
                omaEfetiva: a.omaEfetiva === null ? null : Number(a.omaEfetiva),
                notas: a.notas,
                travaAtiva: a.travaAtiva,
              }}
              casas={casas.map((c) => ({ id: c.id, nome: c.nome }))}
              competicoes={competicoes.map((c) => ({ id: c.id, nome: c.nome }))}
              mercados={mercados.map((m) => ({ id: m.id, nome: m.nome }))}
              travasAtivas={travasAtivas}
            />
          ))}
        </div>
      )}
    </div>
  );
}
