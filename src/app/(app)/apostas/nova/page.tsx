import { prisma } from "@/lib/prisma";
import { NovaApostaForm } from "./nova-aposta-form";

export const dynamic = "force-dynamic";

export default async function NovaApostaPage() {
  const [casas, competicoes, mercados, travasAtivas, jogosRecentes] = await Promise.all([
    prisma.casa.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } }),
    prisma.competicao.findMany({ orderBy: { nome: "asc" } }),
    prisma.mercado.findMany({ orderBy: { nome: "asc" } }),
    prisma.trava.findMany({
      where: { status: "ATIVA" },
      select: { competicaoId: true, mercadoId: true, tetoRisco: true },
    }),
    prisma.aposta.findMany({
      distinct: ["jogoDescricao"],
      orderBy: { criadaEm: "desc" },
      take: 20,
      select: { jogoDescricao: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova Aposta</h1>
        <p className="text-sm text-muted-foreground">Registro rápido de entrada</p>
      </div>
      <NovaApostaForm
        casas={casas.map((c) => ({ id: c.id, nome: c.nome, saldoAtual: Number(c.saldoAtual) }))}
        competicoes={competicoes.map((c) => ({ id: c.id, nome: c.nome }))}
        mercados={mercados.map((m) => ({ id: m.id, nome: m.nome }))}
        travasAtivas={travasAtivas}
        jogosRecentes={jogosRecentes.map((j) => j.jogoDescricao)}
      />
    </div>
  );
}
