"use server";

import { timingSafeEqual, createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export type LoginState = { error?: string };

const MAX_TENTATIVAS = 5;
const JANELA_MS = 15 * 60 * 1000;

// Contador em memória por IP — suficiente para um app de usuário único;
// reinicia a cada deploy/instância, mas já barra força-bruta trivial.
const tentativas = new Map<string, { count: number; resetAt: number }>();

function senhaConfere(fornecida: string, esperada: string) {
  const a = createHash("sha256").update(fornecida).digest();
  const b = createHash("sha256").update(esperada).digest();
  return timingSafeEqual(a, b);
}

async function getClientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const senha = formData.get("senha");
  const next = formData.get("next");
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    return { error: "APP_PASSWORD não está configurada no servidor." };
  }

  const ip = await getClientIp();
  const agora = Date.now();
  const registro = tentativas.get(ip);

  if (registro && registro.resetAt > agora && registro.count >= MAX_TENTATIVAS) {
    const minutos = Math.ceil((registro.resetAt - agora) / 60000);
    return { error: `Muitas tentativas. Tente novamente em ${minutos} min.` };
  }

  if (typeof senha !== "string" || !senhaConfere(senha, expected)) {
    const atual = registro && registro.resetAt > agora ? registro : { count: 0, resetAt: agora + JANELA_MS };
    atual.count += 1;
    tentativas.set(ip, atual);
    return { error: "Senha incorreta." };
  }

  tentativas.delete(ip);

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  const destination = typeof next === "string" && next.startsWith("/") ? next : "/";
  redirect(destination);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
