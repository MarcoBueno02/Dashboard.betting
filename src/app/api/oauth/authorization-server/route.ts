import { NextRequest, NextResponse } from "next/server";

// RFC 8414 — Authorization Server Metadata, servida em
// /.well-known/oauth-authorization-server via rewrite (next.config.ts).
//
// Sem "registration_endpoint" (sem DCR) e sem
// "client_id_metadata_document_supported" (sem CIMD) de propósito — essa é
// uma conexão de cliente único, pré-registrado (MCP_CLIENT_ID/SECRET
// colados no "Advanced settings" do conector), que é o caminho recomendado
// pela própria documentação da Anthropic pra esse cenário. Ver README.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  return NextResponse.json({
    issuer: origin,
    authorization_endpoint: `${origin}/authorize`,
    token_endpoint: `${origin}/token`,
    scopes_supported: ["dashboard"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    code_challenge_methods_supported: ["S256"],
  });
}
