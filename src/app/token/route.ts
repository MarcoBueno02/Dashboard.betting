import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACCESS_TOKEN_TTL,
  issueAccessToken,
  issueRefreshToken,
  verifyClientCredentials,
  verifyPkce,
  verifyRefreshToken,
} from "@/lib/mcp-oauth";

function oauthError(status: number, error: string, description?: string) {
  return NextResponse.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status }
  );
}

function extractClientCredentials(request: NextRequest, form: FormData) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(authHeader.slice("Basic ".length), "base64").toString("utf8");
      const idx = decoded.indexOf(":");
      if (idx === -1) return { clientId: null, clientSecret: null };
      return {
        clientId: decodeURIComponent(decoded.slice(0, idx)),
        clientSecret: decodeURIComponent(decoded.slice(idx + 1)),
      };
    } catch {
      return { clientId: null, clientSecret: null };
    }
  }
  const clientId = form.get("client_id");
  const clientSecret = form.get("client_secret");
  return {
    clientId: typeof clientId === "string" ? clientId : null,
    clientSecret: typeof clientSecret === "string" ? clientSecret : null,
  };
}

// Claude envia o token exchange e o refresh como
// application/x-www-form-urlencoded — Request.formData() do Fetch API já
// entende esse content-type nativamente, sem parser extra.
export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return oauthError(400, "invalid_request", "Corpo precisa ser application/x-www-form-urlencoded");
  }

  const { clientId, clientSecret } = extractClientCredentials(request, form);
  if (!clientId || !verifyClientCredentials(clientId, clientSecret)) {
    return oauthError(401, "invalid_client");
  }

  const origin = request.nextUrl.origin;
  const resource = `${origin}/mcp`;
  const grantType = form.get("grant_type");

  if (grantType === "authorization_code") {
    const code = form.get("code");
    const redirectUri = form.get("redirect_uri");
    const codeVerifier = form.get("code_verifier");
    if (
      typeof code !== "string" ||
      typeof redirectUri !== "string" ||
      typeof codeVerifier !== "string"
    ) {
      return oauthError(400, "invalid_request");
    }

    const record = await prisma.mcpAuthorizationCode.findUnique({ where: { code } });
    if (
      !record ||
      record.usedAt ||
      record.expiresAt < new Date() ||
      record.clientId !== clientId ||
      record.redirectUri !== redirectUri
    ) {
      return oauthError(400, "invalid_grant");
    }
    if (!verifyPkce(codeVerifier, record.codeChallenge)) {
      return oauthError(400, "invalid_grant");
    }

    // Marca como usado atomicamente — garante uso único mesmo sob corrida.
    const consumo = await prisma.mcpAuthorizationCode.updateMany({
      where: { code, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumo.count === 0) return oauthError(400, "invalid_grant");

    const [accessToken, refreshToken] = await Promise.all([
      issueAccessToken(origin, resource),
      issueRefreshToken(origin, resource),
    ]);

    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL,
      refresh_token: refreshToken,
      scope: "dashboard",
    });
  }

  if (grantType === "refresh_token") {
    const refreshToken = form.get("refresh_token");
    if (typeof refreshToken !== "string") return oauthError(400, "invalid_request");

    const payload = await verifyRefreshToken(refreshToken, origin, resource);
    if (!payload) return oauthError(400, "invalid_grant");

    // Rotaciona o refresh token a cada uso (boa prática OAuth 2.1).
    const [accessToken, newRefreshToken] = await Promise.all([
      issueAccessToken(origin, resource),
      issueRefreshToken(origin, resource),
    ]);

    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL,
      refresh_token: newRefreshToken,
      scope: "dashboard",
    });
  }

  return oauthError(400, "unsupported_grant_type");
}
