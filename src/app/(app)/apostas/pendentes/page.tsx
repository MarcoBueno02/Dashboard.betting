import { prisma } from "@/lib/prisma";
import { PendenteRow } from "./pendente-row";

export const dynamic = "force-dynamic";

export default async function PendentesPage() {
  const apostas = await prisma.aposta.findMany({
    where: { status: "PENDENTE" },
    orderBy: { data: "asc" },
    include: { casa: true, competicao: true, mercado: true },
  });

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
                jogoDescricao: a.jogoDescricao,
                entradaDescricao: a.entradaDescricao,
                casaNome: a.casa.nome,
                competicaoNome: a.competicao.nome,
                mercadoNome: a.mercado.nome,
                odd: Number(a.odd),
                stake: Number(a.stake),
                categoriaRisco: a.categoriaRisco,
                travaAtiva: a.travaAtiva,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
