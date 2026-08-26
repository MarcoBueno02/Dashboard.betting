import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// PRNG determinístico para gerar dados sintéticos reprodutíveis.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function upsertCasa(nome: string, saldoAtual: number) {
  const casa = await prisma.casa.upsert({
    where: { nome },
    update: { saldoAtual },
    create: { nome, saldoAtual },
  });
  await prisma.saldoSnapshot.create({
    data: { casaId: casa.id, saldo: saldoAtual, origem: "CONFIRMACAO_MANUAL" },
  });
  return casa;
}

async function upsertCompeticao(nome: string) {
  return prisma.competicao.upsert({ where: { nome }, update: {}, create: { nome } });
}

async function upsertMercado(nome: string) {
  return prisma.mercado.upsert({ where: { nome }, update: {}, create: { nome } });
}

async function main() {
  console.log("Seed: casas...");
  const casas = await Promise.all([
    upsertCasa("EstrelaBet", 6.22),
    upsertCasa("Superbet", 21.71),
    upsertCasa("Betano", 98.89),
    upsertCasa("Betnacional", 10.54),
    upsertCasa("Pitaco", 23.24),
    upsertCasa("Betfair", 9.7),
  ]);
  const casaByNome = new Map(casas.map((c) => [c.nome, c]));

  console.log("Seed: unidade...");
  await prisma.unidade.create({
    data: { valor: 3.41, bancaTotalNaEpoca: 170.3 },
  });

  console.log("Seed: competições e mercados...");
  const competicoesNomes = [
    "Brasileirão Série A",
    "Brasileirão Série B",
    "Copa do Brasil",
    "Copa Sul-Americana",
    "Copa Libertadores",
    "Primera División Argentina",
    "Copa do Mundo 2026",
  ];
  const mercadosNomes = [
    "Resultado 1x2",
    "Dupla Chance",
    "Resultado/DC",
    "Resultado/DC/DNB",
    "Over/Under Gols",
    "Ambas Marcam",
    "Escanteios 1x2",
    "Escanteios O/U",
    "Cartões O/U",
    "Cartões 1x2",
    "Vitória Sem Sofrer",
    "Gols HT",
    "Geral",
  ];
  const competicoes = new Map(
    await Promise.all(
      competicoesNomes.map(async (nome) => [nome, await upsertCompeticao(nome)] as const)
    )
  );
  const mercados = new Map(
    await Promise.all(
      mercadosNomes.map(async (nome) => [nome, await upsertMercado(nome)] as const)
    )
  );

  console.log("Seed: apostas pendentes...");
  const copaSulAmericana = competicoes.get("Copa Sul-Americana")!;
  const copaDoBrasil = competicoes.get("Copa do Brasil")!;
  const ambasMarcam = mercados.get("Ambas Marcam")!;

  await prisma.aposta.create({
    data: {
      data: new Date(),
      competicaoId: copaSulAmericana.id,
      jogoDescricao: "River Plate x Santa Fe",
      mercadoId: ambasMarcam.id,
      entradaDescricao: "Ambas Marcam Não",
      casaId: casaByNome.get("Betnacional")!.id,
      odd: 1.5,
      stake: 5.12,
      pJusta: 75,
      evPercentual: 12.5,
      categoriaRisco: "BAIXO",
      status: "PENDENTE",
      travaAtiva: false,
    },
  });

  await prisma.aposta.create({
    data: {
      data: new Date(),
      competicaoId: copaDoBrasil.id,
      jogoDescricao: "Vasco x Vitória",
      mercadoId: ambasMarcam.id,
      entradaDescricao: "Ambas Marcam Não",
      casaId: casaByNome.get("Pitaco")!.id,
      odd: 1.77,
      stake: 2.05,
      pJusta: 70,
      evPercentual: 23.9,
      categoriaRisco: "MEDIO_ALTO",
      status: "PENDENTE",
      travaAtiva: true,
    },
  });

  console.log("Seed: trava ativa...");
  await prisma.trava.create({
    data: {
      competicaoId: copaDoBrasil.id,
      mercadoId: ambasMarcam.id,
      status: "ATIVA",
      motivoAtivacao: "3 GREEN / 3 RED na origem",
      tetoRisco: "MEDIO_ALTO",
      rodadasPositivasConsecutivas: 0,
    },
  });

  console.log("Seed: histórico segmentado...");
  type Segmento = { competicao: string; mercado: string; green: number; red: number };
  const historico: Segmento[] = [
    // Brasileirão Série A
    { competicao: "Brasileirão Série A", mercado: "Resultado/DC", green: 5, red: 8 },
    { competicao: "Brasileirão Série A", mercado: "Over/Under Gols", green: 9, red: 8 },
    { competicao: "Brasileirão Série A", mercado: "Ambas Marcam", green: 9, red: 8 },
    { competicao: "Brasileirão Série A", mercado: "Escanteios O/U", green: 13, red: 7 },
    { competicao: "Brasileirão Série A", mercado: "Escanteios 1x2", green: 1, red: 4 },
    { competicao: "Brasileirão Série A", mercado: "Cartões O/U", green: 1, red: 2 },
    { competicao: "Brasileirão Série A", mercado: "Cartões 1x2", green: 1, red: 2 },
    { competicao: "Brasileirão Série A", mercado: "Gols HT", green: 4, red: 5 },
    { competicao: "Brasileirão Série A", mercado: "Vitória Sem Sofrer", green: 1, red: 0 },
    // Brasileirão Série B
    { competicao: "Brasileirão Série B", mercado: "Resultado/DC/DNB", green: 10, red: 6 },
    { competicao: "Brasileirão Série B", mercado: "Vitória Sem Sofrer", green: 2, red: 1 },
    { competicao: "Brasileirão Série B", mercado: "Escanteios O/U", green: 14, red: 8 },
    { competicao: "Brasileirão Série B", mercado: "Escanteios 1x2", green: 1, red: 2 },
    { competicao: "Brasileirão Série B", mercado: "Cartões 1x2", green: 1, red: 0 },
    { competicao: "Brasileirão Série B", mercado: "Over/Under Gols", green: 14, red: 14 },
    { competicao: "Brasileirão Série B", mercado: "Ambas Marcam", green: 4, red: 5 },
    { competicao: "Brasileirão Série B", mercado: "Cartões O/U", green: 0, red: 1 },
    { competicao: "Brasileirão Série B", mercado: "Gols HT", green: 1, red: 1 },
    // Copa do Brasil
    { competicao: "Copa do Brasil", mercado: "Escanteios O/U", green: 7, red: 3 },
    { competicao: "Copa do Brasil", mercado: "Escanteios 1x2", green: 1, red: 2 },
    { competicao: "Copa do Brasil", mercado: "Cartões 1x2", green: 1, red: 2 },
    { competicao: "Copa do Brasil", mercado: "Over/Under Gols", green: 3, red: 2 },
    { competicao: "Copa do Brasil", mercado: "Ambas Marcam", green: 3, red: 3 },
    { competicao: "Copa do Brasil", mercado: "Resultado/DC", green: 0, red: 2 },
    // Primera División Argentina
    { competicao: "Primera División Argentina", mercado: "Resultado/DC", green: 8, red: 4 },
    { competicao: "Primera División Argentina", mercado: "Escanteios O/U", green: 9, red: 10 },
    { competicao: "Primera División Argentina", mercado: "Over/Under Gols", green: 4, red: 5 },
    { competicao: "Primera División Argentina", mercado: "Gols HT", green: 4, red: 4 },
    { competicao: "Primera División Argentina", mercado: "Ambas Marcam", green: 1, red: 0 },
    // Copa Libertadores
    { competicao: "Copa Libertadores", mercado: "Over/Under Gols", green: 2, red: 3 },
    { competicao: "Copa Libertadores", mercado: "Escanteios O/U", green: 2, red: 0 },
    // Copa Sul-Americana
    { competicao: "Copa Sul-Americana", mercado: "Over/Under Gols", green: 2, red: 3 },
    { competicao: "Copa Sul-Americana", mercado: "Escanteios O/U", green: 2, red: 2 },
    { competicao: "Copa Sul-Americana", mercado: "Ambas Marcam", green: 2, red: 2 },
    { competicao: "Copa Sul-Americana", mercado: "Cartões O/U", green: 0, red: 2 },
    // Copa do Mundo 2026 — encerrado/arquivado, sem segmentação por mercado
    { competicao: "Copa do Mundo 2026", mercado: "Geral", green: 11, red: 8 },
  ];

  const casasArr = casas;
  const agora = Date.now();
  const janela180dias = 1000 * 60 * 60 * 24 * 180;

  let contador = 0;
  const registros: {
    data: Date;
    competicaoId: string;
    jogoDescricao: string;
    mercadoId: string;
    entradaDescricao: string;
    casaId: string;
    odd: number;
    stake: number;
    status: "GREEN" | "RED";
    retornoReal: number;
    lucroPrejuizo: number;
  }[] = [];

  for (const seg of historico) {
    const competicao = competicoes.get(seg.competicao)!;
    const mercado = mercados.get(seg.mercado)!;
    const resultados: ("GREEN" | "RED")[] = [
      ...Array(seg.green).fill("GREEN"),
      ...Array(seg.red).fill("RED"),
    ];

    for (const status of resultados) {
      contador += 1;
      const odd = round2(1.4 + rand() * 0.9);
      const stake = round2(2.5 + rand() * 3);
      const casa = casasArr[Math.floor(rand() * casasArr.length)];
      const data = new Date(agora - rand() * janela180dias);
      const retornoReal = status === "GREEN" ? round2(stake * odd) : 0;
      const lucroPrejuizo = round2(retornoReal - stake);

      registros.push({
        data,
        competicaoId: competicao.id,
        jogoDescricao: `Jogo histórico #${contador}`,
        mercadoId: mercado.id,
        entradaDescricao: seg.mercado,
        casaId: casa.id,
        odd,
        stake,
        status,
        retornoReal,
        lucroPrejuizo,
      });
    }
  }

  await prisma.aposta.createMany({ data: registros });

  console.log(`Seed concluído: ${registros.length} apostas históricas criadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
