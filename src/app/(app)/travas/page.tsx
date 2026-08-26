import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiscoBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import { NovaTravaDialog } from "./nova-trava-dialog";
import { removerTravaAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TravasPage() {
  const [travas, competicoes, mercados] = await Promise.all([
    prisma.trava.findMany({
      include: { competicao: true, mercado: true },
      orderBy: [{ status: "asc" }, { dataAtivacao: "desc" }],
    }),
    prisma.competicao.findMany({ orderBy: { nome: "asc" } }),
    prisma.mercado.findMany({ orderBy: { nome: "asc" } }),
  ]);

  const ativas = travas.filter((t) => t.status === "ATIVA");
  const removidas = travas.filter((t) => t.status === "REMOVIDA");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Travas Mecânicas</h1>
          <p className="text-sm text-muted-foreground">Regra 27 — controle de risco por combinação</p>
        </div>
        <NovaTravaDialog
          competicoes={competicoes.map((c) => ({ id: c.id, nome: c.nome }))}
          mercados={mercados.map((m) => ({ id: m.id, nome: m.nome }))}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Ativas ({ativas.length})</h2>
        {ativas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma trava ativa.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {ativas.map((t) => (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {t.competicao?.nome ?? "Todas as competições"} · {t.mercado.nome}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <RiscoBadge risco={t.tetoRisco} />
                    <Badge variant="outline">
                      {t.rodadasPositivasConsecutivas}/3 rodadas positivas
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.motivoAtivacao}</p>
                  <p className="text-xs text-muted-foreground">
                    Ativada em {formatDate(t.dataAtivacao)}
                  </p>
                  <form
                    action={async () => {
                      "use server";
                      await removerTravaAction(t.id);
                    }}
                  >
                    <Button size="sm" variant="outline" type="submit">
                      Remover trava
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Removidas ({removidas.length})
        </h2>
        {removidas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma trava removida ainda.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {removidas.map((t) => (
              <Card key={t.id} className="opacity-70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {t.competicao?.nome ?? "Todas as competições"} · {t.mercado.nome}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <RiscoBadge risco={t.tetoRisco} />
                  <p className="text-sm text-muted-foreground">{t.motivoAtivacao}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(t.dataAtivacao)} — {formatDate(t.dataRemocao)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
