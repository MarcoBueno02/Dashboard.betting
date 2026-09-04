import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

// Autorização OAuth 2.1 do servidor MCP (Fase 2). Cliente único e
// pré-registrado (MCP_CLIENT_ID/MCP_CLIENT_SECRET colados no "Advanced
// settings" do conector do Claude) — sem DCR, sem CIMD. Ver README.

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1h
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 dias
const SUBJECT = "marco";

function getOAuthSecretKey() {
  const secret = process.env.MCP_OAUTH_SECRET;
  if (!secret) throw new Error("MCP_OAUTH_SECRET não está configurada.");
  return new TextEncoder().encode(secret);
}

export function timingSafeStringEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function verifyClientCredentials(clientId: string, clientSecret: string | null) {
  const expectedId = process.env.MCP_CLIENT_ID;
  const expectedSecret = process.env.MCP_CLIENT_SECRET;
  if (!expectedId || !expectedSecret) return false;
  if (!timingSafeStringEqual(clientId, expectedId)) return false;
  // Cliente confidencial: client_secret é sempre exigido nesta implementação.
  if (!clientSecret) return false;
  return timingSafeStringEqual(clientSecret, expectedSecret);
}

/** PKCE S256: code_challenge = BASE64URL(SHA256(code_verifier)). */
export function verifyPkce(codeVerifier: string, codeChallenge: string) {
  const computed = createHash("sha256").update(codeVerifier).digest("base64url");
  if (computed.length !== codeChallenge.length) return false;
  return timingSafeEqual(Buffer.from(computed), Buffer.from(codeChallenge));
}

export async function issueAccessToken(issuer: string, resource: string) {
  return new SignJWT({ token_use: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(resource)
    .setSubject(SUBJECT)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getOAuthSecretKey());
}

export async function issueRefreshToken(issuer: string, resource: string) {
  return new SignJWT({ token_use: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(resource)
    .setSubject(SUBJECT)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_SECONDS}s`)
    .sign(getOAuthSecretKey());
}

async function verifyToken(
  token: string,
  issuer: string,
  resource: string,
  expectedUse: "access" | "refresh"
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getOAuthSecretKey(), {
      issuer,
      audience: resource,
    });
    if (payload.token_use !== expectedUse) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyAccessToken(token: string, issuer: string, resource: string) {
  return verifyToken(token, issuer, resource, "access");
}

export function verifyRefreshToken(token: string, issuer: string, resource: string) {
  return verifyToken(token, issuer, resource, "refresh");
}

export const ACCESS_TOKEN_TTL = ACCESS_TOKEN_TTL_SECONDS;
export const REFRESH_TOKEN_TTL = REFRESH_TOKEN_TTL_SECONDS;
