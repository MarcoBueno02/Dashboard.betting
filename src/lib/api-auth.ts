import { timingSafeEqual, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Autenticação por Bearer token pra /api/**, separada da sessão por cookie
 * do site (APP_PASSWORD). Sempre retorna o mesmo corpo/status pra token
 * ausente, malformado ou errado — não dá pista pra tentativa de força bruta.
 */
function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function tokensMatch(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Retorna uma NextResponse 401 se o token for inválido, ou null se ok. */
export function requireApiToken(request: NextRequest): NextResponse | null {
  const expected = process.env.API_TOKEN;
  if (!expected) return unauthorized();

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return unauthorized();

  const token = header.slice("Bearer ".length).trim();
  if (!token || !tokensMatch(token, expected)) return unauthorized();

  return null;
}

export function apiError(status: number, message: string, field?: string) {
  return NextResponse.json(field ? { error: message, field } : { error: message }, { status });
}
