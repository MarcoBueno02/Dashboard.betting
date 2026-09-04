import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { verifyAccessToken } from "@/lib/mcp-oauth";
import { buildMcpServer } from "@/lib/mcp-tools";

function unauthorized(origin: string) {
  const resourceMetadataUrl = `${origin}/.well-known/oauth-protected-resource/mcp`;
  return new NextResponse(
    JSON.stringify({ error: "invalid_token", error_description: "Authentication required" }),
    {
      status: 401,
      headers: {
        "content-type": "application/json",
        "WWW-Authenticate": `Bearer error="invalid_token", resource_metadata="${resourceMetadataUrl}"`,
      },
    }
  );
}

// Autenticação é validada aqui, ANTES do SDK do MCP ver a requisição — uma
// falha de auth precisa ser um 401 de transporte HTTP, não um erro de
// ferramenta (200 com isError:true). É essa distinção que faz o Claude
// mostrar o cartão de "Connect" em vez de só passar o erro pro modelo.
async function handle(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const resource = `${origin}/mcp`;

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) return unauthorized(origin);

  const payload = await verifyAccessToken(token, origin, resource);
  if (!payload) return unauthorized(origin);

  const apiToken = process.env.API_TOKEN;
  if (!apiToken) {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32603, message: "API_TOKEN não configurada no servidor" }, id: null },
      { status: 500 }
    );
  }

  const server = buildMcpServer(origin, apiToken);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function DELETE(request: NextRequest) {
  return handle(request);
}
