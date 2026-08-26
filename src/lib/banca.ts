type Snapshot = { casaId: string; saldo: number; data: Date };

/**
 * Soma o último saldo conhecido de cada casa até (e incluindo) a data alvo.
 */
export function bancaTotalEmData(snapshots: Snapshot[], casaIds: string[], alvo: Date) {
  let total = 0;
  for (const casaId of casaIds) {
    const doCasa = snapshots
      .filter((s) => s.casaId === casaId && s.data.getTime() <= alvo.getTime())
      .sort((a, b) => b.data.getTime() - a.data.getTime());
    if (doCasa[0]) total += doCasa[0].saldo;
  }
  return total;
}
