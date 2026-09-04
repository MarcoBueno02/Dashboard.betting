import { NextRequest, NextResponse } from "next/server";

// RFC 9728 — Protected Resource Metadata. Servida em /.well-known/
// oauth-protected-resource e /.well-known/oauth-protected-resource/mcp via
// rewrite (next.config.ts). Único conteúdo pros dois — o Claude tenta a
// variante com sufixo de path primeiro.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  return NextResponse.json({
    resource: `${origin}/mcp`,
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
  });
}
