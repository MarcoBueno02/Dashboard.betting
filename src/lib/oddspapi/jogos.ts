import { normalizarNome, nomeCorresponde } from "./texto";

export type FixtureBasico = {
  fixtureId: string;
  participant1Name: string;
  participant2Name: string;
  participant1ShortName?: string;
  participant2ShortName?: string;
};

/**
 * Casa "Time A x Time B" contra a lista de fixtures do torneio, com
 * tolerância a acento/abreviação nos dois sentidos (A x B ou B x A). Se mais
 * de uma fixture bater, ou nenhuma, retorna null — nunca escolhe um jogo
 * "provável" às cegas.
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

  return candidatos.length === 1 ? candidatos[0] : null;
}
