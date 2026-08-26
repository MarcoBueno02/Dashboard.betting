export type LoteRow = {
  linha: number;
  jogoDescricao: string;
  entradaDescricao: string;
  casaNome: string;
  odd: number | null;
  stake: number | null;
  casaId: string | null;
  erro?: string;
};

function parseNumero(valor: string): number | null {
  const normalizado = valor.trim().replace(/\./g, "").replace(",", ".");
  // Se não tinha vírgula, o replace acima pode ter corrompido algo como "1.50" -> "150".
  // Então tentamos primeiro o valor original com vírgula trocada por ponto.
  const direto = Number(valor.trim().replace(",", "."));
  if (Number.isFinite(direto) && valor.trim() !== "") return direto;
  const alt = Number(normalizado);
  return Number.isFinite(alt) ? alt : null;
}

function pareceCabecalho(colunas: string[]) {
  const texto = colunas.join(" ").toLowerCase();
  return texto.includes("jogo") && (texto.includes("odd") || texto.includes("stake"));
}

export function parseLoteTexto(
  texto: string,
  casas: { id: string; nome: string }[]
): LoteRow[] {
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^[-|\s]+$/.test(l));

  const rows: LoteRow[] = [];

  linhas.forEach((linha, idx) => {
    let colunas = linha.split("|").map((c) => c.trim());
    if (colunas[0] === "") colunas = colunas.slice(1);
    if (colunas[colunas.length - 1] === "") colunas = colunas.slice(0, -1);

    if (idx === 0 && pareceCabecalho(colunas)) return;

    if (colunas.length < 5) {
      rows.push({
        linha: idx + 1,
        jogoDescricao: linha,
        entradaDescricao: "",
        casaNome: "",
        odd: null,
        stake: null,
        casaId: null,
        erro: "Formato inválido — esperado: jogo | entrada | casa | odd | stake",
      });
      return;
    }

    const [jogoDescricao, entradaDescricao, casaNome, oddStr, stakeStr] = colunas;
    const odd = parseNumero(oddStr);
    const stake = parseNumero(stakeStr);
    const casa = casas.find((c) => c.nome.toLowerCase() === casaNome.toLowerCase());

    let erro: string | undefined;
    if (!jogoDescricao) erro = "Jogo vazio";
    else if (!entradaDescricao) erro = "Entrada vazia";
    else if (!casa) erro = `Casa "${casaNome}" não encontrada`;
    else if (odd === null || odd <= 1) erro = "Odd inválida";
    else if (stake === null || stake <= 0) erro = "Stake inválida";

    rows.push({
      linha: idx + 1,
      jogoDescricao,
      entradaDescricao,
      casaNome,
      odd,
      stake,
      casaId: casa?.id ?? null,
      erro,
    });
  });

  return rows;
}
