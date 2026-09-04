import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Rotas da API de automação (autenticadas por Bearer token, ver
// src/lib/api-auth.ts) — não devem ser redirecionadas pra /login como as
// páginas do site; cada uma valida o próprio token e responde 401 em JSON.
// Note: /api/apostas/export NÃO está aqui de propósito — continua exigindo
// a sessão de navegador (cookie) como sempre exigiu.
function isTokenApiRoute(pathname: string) {
  if (pathname === "/api/health") return true;
  if (pathname === "/api/bancas" || pathname.startsWith("/api/bancas/")) return true;
  if (pathname === "/api/casas") return true;
  if (pathname === "/api/apostas") return true;
  if (pathname === "/api/apostas/pendentes") return true;
  if (pathname === "/api/apostas/buscar") return true;
  if (/^\/api\/apostas\/[^/]+\/resultado$/.test(pathname)) return true;
  if (pathname === "/api/segmentado") return true;
  if (pathname === "/api/travas" || pathname.startsWith("/api/travas/")) return true;
  return false;
}

// Servidor MCP (Fase 2) — OAuth 2.1 próprio (ver src/lib/mcp-oauth.ts) e o
// endpoint MCP em si (Bearer token), nenhum dos dois usa a sessão por
// cookie do site. Os .well-known precisam ficar acessíveis sem QUALQUER
// autenticação (é a própria descoberta OAuth que os exige assim).
function isMcpRoute(pathname: string) {
  if (pathname === "/mcp") return true;
  if (pathname === "/authorize") return true;
  if (pathname === "/token") return true;
  if (pathname === "/.well-known/oauth-protected-resource") return true;
  if (pathname === "/.well-known/oauth-protected-resource/mcp") return true;
  if (pathname === "/.well-known/oauth-authorization-server") return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    isTokenApiRoute(pathname) ||
    isMcpRoute(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await verifySessionToken(token);

  if (!authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
