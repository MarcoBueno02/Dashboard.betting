import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "dashboard_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function getSecretKey() {
  const password = process.env.APP_PASSWORD;
  if (!password) {
    throw new Error("APP_PASSWORD não está configurada.");
  }
  // Deriva a chave de assinatura a partir da senha única do app.
  return new TextEncoder().encode(`dashboard-betting::${password}`);
}

export async function createSessionToken() {
  return new SignJWT({ auth: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string | undefined | null) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload.auth === true;
  } catch {
    return false;
  }
}

export const SESSION_MAX_AGE = SESSION_DURATION_SECONDS;
