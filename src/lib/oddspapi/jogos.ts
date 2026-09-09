import { normalizarNome, nomeCorresponde } from "./texto";

export type FixtureBasico = {
  fixtureId: string;
  participant1Name: string;
  participant2Name: string;
  participant1ShortName?: string;
  participant2ShortName?: string;
  startTime: string;
};

/**
 * Casa "Time A x Time B" contra a lista de fixtures do torneio, com
 * tolerância a acento/abreviação nos dois sentidos (A x B ou B x A). Se
 * nenhuma bater, retorna null.
 *
 * Mais de uma fixture pode bater pelo nome de verdade — confrontos de ida
 * e volta (Libertadores, Sul-Americana) têm os dois times duas vezes,
 * mandante/visitante invertidos, dentro da mesma janela de busca (bug real
 * da Fase 3.4). Nesse caso desempata pelo jogo mais próximo de agora —
 * nunca por "qual time parece mais o pedido", só por data, que é
 * inequívoco uma vez que os dois lados já bateram pelo nome. Só recusa de
 * verdade se o empate de data também for exato (caso não deveria
 * acontecer na prática).
 */
export function encontrarFixture(jogoTexto: string, fixtures: FixtureBasico[]): FixtureBasico | null {
  const partes = jogoTexto.split(/\s+(?:x|vs\.?|v\.)\s+/i);
  if (partes.length !== 2) return null;

  const a = normalizarNome(partes[0]);
  const b = normalizarNome(partes[1]);
  if (!a || !b) return null;

  const candidatos = fixtures.filter((f) => {
    const p1 = normalizarNome(f.participant1Name);
    const p2 = normalizarNome(f.participant2Name);
    const s1 = f.participant1ShortName ? normalizarNome(f.participant1ShortName) : "";
    const s2 = f.participant2ShortName ? normalizarNome(f.participant2ShortName) : "";

    return (
      (nomeCorresponde(a, p1, s1) && nomeCorresponde(b, p2, s2)) ||
      (nomeCorresponde(a, p2, s2) && nomeCorresponde(b, p1, s1))
    );
  });

  if (candidatos.length === 0) return null;
  if (candidatos.length === 1) return candidatos[0];

  const agora = Date.now();
  const porDistancia = candidatos
    .map((f) => ({ f, distancia: Math.abs(new Date(f.startTime).getTime() - agora) }))
    .sort((x, y) => x.distancia - y.distancia);

  if (porDistancia[1].distancia === porDistancia[0].distancia) return null;
  return porDistancia[0].f;
}
