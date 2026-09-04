import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const CATEGORIA_RISCO = ["BAIXO", "MEDIO", "MEDIO_ALTO", "ALTO_ESPECULATIVO"] as const;
const STATUS_RESOLVIDO = ["GREEN", "RED", "REEMBOLSO", "MEIA_GREEN", "MEIA_RED", "CANCELADA"] as const;

function textResult(data: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    isError,
  };
}

/**
 * Constrói o McpServer com as 12 ferramentas, cada uma um wrapper fino em
 * cima da API REST da Fase 1 (src/app/api/**) — a lógica de negócio (regras
 * de trava, cálculo de lucro, criação automática de casa/competição/mercado
 * por nome) vive só ali, o MCP não reimplementa nada disso.
 *
 * `apiToken` é o API_TOKEN da Fase 1: nunca é passado adiante pro cliente
 * MCP, só usado aqui, servidor-a-servidor, pra autenticar contra a própria
 * API.
 */
export function buildMcpServer(origin: string, apiToken: string) {
  async function callApi(path: string, init?: RequestInit) {
    const res = await fetch(`${origin}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, body };
  }

  const server = new McpServer(
    { name: "dashboard-betting", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.registerTool(
    "consultar_bancas",
    {
      description:
        "Retorna o saldo atual de todas as casas de apostas ativas, a banca total somada e a unidade atual (2% da banca). Use pra saber quanto tem disponível em cada casa antes de sugerir um stake.",
    },
    async () => {
      const r = await callApi("/api/bancas");
      return textResult(r.body, !r.ok);
    }
  );

  server.registerTool(
    "atualizar_saldo_casa",
    {
      description:
        "Registra um novo saldo pra uma casa de apostas específica (por nome ou id), criando um snapshot histórico. Use depois de conferir o saldo real numa casa.",
      inputSchema: {
        casa: z.string().describe("Nome ou id da casa de apostas"),
        saldo: z.number().describe("Novo saldo em reais"),
      },
    },
    async ({ casa, saldo }) => {
      const r = await callApi(`/api/bancas/${encodeURIComponent(casa)}/atualizar`, {
        method: "POST",
        body: JSON.stringify({ saldo }),
      });
      return textResult(r.body, !r.ok);
    }
  );

  server.registerTool(
    "criar_casa",
    {
      description: "Cadastra uma casa de apostas nova, com saldo inicial opcional (default 0).",
      inputSchema: {
        nome: z.string().describe("Nome da casa"),
        saldoAtual: z.number().optional().describe("Saldo inicial em reais"),
      },
    },
    async ({ nome, saldoAtual }) => {
      const r = await callApi("/api/casas", {
        method: "POST",
        body: JSON.stringify({ nome, saldoAtual }),
      });
      return textResult(r.body, !r.ok);
    }
  );

  const apostaInput = z.object({
    data: z.string().describe("Data do jogo: YYYY-MM-DD ou YYYY-MM-DDTHH:mm, horário de Brasília"),
    competicao: z.string(),
    jogo: z.string(),
    mercado: z.string(),
    entrada: z.string(),
    casa: z.string(),
    odd: z.number(),
    stake: z.number(),
    pJusta: z.number().optional(),
    evPercentual: z.number().optional(),
    categoriaRisco: z.enum(CATEGORIA_RISCO).optional(),
    omaEfetiva: z.number().optional(),
    notas: z.string().optional(),
  });

  server.registerTool(
    "criar_aposta",
    {
      description:
        "Cria uma ou várias apostas pendentes de uma vez (sempre em lista, mesmo que seja uma só). competicao, mercado e casa podem ser enviados por nome — são criados automaticamente se ainda não existirem.",
      inputSchema: {
        apostas: z.array(apostaInput).min(1).describe("Lista de apostas a registrar"),
      },
    },
    async ({ apostas }) => {
      const r = await callApi("/api/apostas", { method: "POST", body: JSON.stringify(apostas) });
      return textResult(r.body, !r.ok);
    }
  );

  server.registerTool(
    "listar_apostas_pendentes",
    {
      description:
        "Lista todas as apostas que ainda não têm resultado (status PENDENTE), ordenadas por data. Chame isso no início de um pós-mortem pra saber exatamente o que está em aberto.",
    },
    async () => {
      const r = await callApi("/api/apostas/pendentes");
      return textResult(r.body, !r.ok);
    }
  );

  server.registerTool(
    "buscar_apostas",
    {
      description:
        "Busca apostas por nome do jogo (parcial, sem diferenciar maiúsculas) e/ou data (YYYY-MM-DD). Use quando não se tem o id da aposta, só o nome do jogo.",
      inputSchema: {
        jogo: z.string().optional().describe("Trecho do nome do jogo"),
        data: z.string().optional().describe("Data exata YYYY-MM-DD"),
      },
    },
    async ({ jogo, data }) => {
      const params = new URLSearchParams();
      if (jogo) params.set("jogo", jogo);
      if (data) params.set("data", data);
      const r = await callApi(`/api/apostas/buscar?${params.toString()}`);
      return textResult(r.body, !r.ok);
    }
  );

  server.registerTool(
    "listar_apostas",
    {
      description:
        "Lista apostas com filtros gerais: competição, mercado, status e período (de/ate no formato YYYY-MM-DD). Pra consultas amplas do histórico.",
      inputSchema: {
        competicao: z.string().optional(),
        mercado: z.string().optional(),
        status: z.enum(["PENDENTE", ...STATUS_RESOLVIDO]).optional(),
        de: z.string().optional().describe("Data inicial YYYY-MM-DD"),
        ate: z.string().optional().describe("Data final YYYY-MM-DD"),
      },
    },
    async (input) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(input)) {
        if (typeof v === "string" && v) params.set(k, v);
      }
      const r = await callApi(`/api/apostas?${params.toString()}`);
      return textResult(r.body, !r.ok);
    }
  );

  server.registerTool(
    "atualizar_resultado_aposta",
    {
      description:
        "Marca uma aposta como resolvida (GREEN, RED, MEIA_GREEN, MEIA_RED, REEMBOLSO ou CANCELADA) e registra o retorno real. Recusa sobrescrever uma aposta que já tem resultado, a menos que forcar=true.",
      inputSchema: {
        id: z.string().describe("Id da aposta (use buscar_apostas ou listar_apostas_pendentes se não souber)"),
        status: z.enum(STATUS_RESOLVIDO),
        retornoReal: z.number().describe("Valor retornado (0 se RED)"),
        forcar: z.boolean().optional().describe("Sobrescrever mesmo se a aposta já tiver resultado"),
      },
    },
    async ({ id, ...body }) => {
      const r = await callApi(`/api/apostas/${encodeURIComponent(id)}/resultado`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      return textResult(r.body, !r.ok);
    }
  );

  server.registerTool(
    "consultar_segmentado",
    {
      description:
        "Retorna o histórico agregado Green/Red por competição × mercado — usado pra aplicar a Regra 16 e decidir se uma trava mecânica deve ser ativada.",
    },
    async () => {
      const r = await callApi("/api/segmentado");
      return textResult(r.body, !r.ok);
    }
  );

  server.registerTool(
    "listar_travas",
    {
      description: "Lista travas mecânicas, opcionalmente filtradas por status (ATIVA ou REMOVIDA).",
      inputSchema: { status: z.enum(["ATIVA", "REMOVIDA"]).optional() },
    },
    async ({ status }) => {
      const params = status ? `?status=${status}` : "";
      const r = await callApi(`/api/travas${params}`);
      return textResult(r.body, !r.ok);
    }
  );

  server.registerTool(
    "criar_trava",
    {
      description:
        "Ativa uma trava mecânica nova pra uma combinação de competição (opcional — vazio trava o mercado inteiro) e mercado.",
      inputSchema: {
        competicao: z.string().optional(),
        mercado: z.string(),
        tetoRisco: z.enum(CATEGORIA_RISCO),
        motivoAtivacao: z.string(),
        dataAtivacao: z.string().optional().describe("YYYY-MM-DD, default hoje"),
      },
    },
    async (body) => {
      const r = await callApi("/api/travas", { method: "POST", body: JSON.stringify(body) });
      return textResult(r.body, !r.ok);
    }
  );

  server.registerTool(
    "atualizar_trava",
    {
      description:
        "Atualiza uma trava existente: incrementar rodada positiva consecutiva, mudar teto de risco/motivo, ou remover (status=REMOVIDA).",
      inputSchema: {
        id: z.string(),
        status: z.enum(["ATIVA", "REMOVIDA"]).optional(),
        tetoRisco: z.enum(CATEGORIA_RISCO).optional(),
        motivoAtivacao: z.string().optional(),
        rodadasPositivasConsecutivas: z.number().int().min(0).max(3).optional(),
        incrementarRodadas: z.boolean().optional().describe("Incrementa em 1 em vez de definir um valor fixo"),
      },
    },
    async ({ id, ...body }) => {
      const r = await callApi(`/api/travas/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      return textResult(r.body, !r.ok);
    }
  );

  return server;
}
