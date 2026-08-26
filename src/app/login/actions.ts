"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export type LoginState = { error?: string };

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

  if (typeof senha !== "string" || senha !== expected) {
    return { error: "Senha incorreta." };
  }

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
