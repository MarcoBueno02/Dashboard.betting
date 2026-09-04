import { randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CODE_TTL_MS = 60 * 1000;
const MAX_TENTATIVAS = 5;
const JANELA_MS = 15 * 60 * 1000;

// Mesmo padrão de rate limit do login do site (src/app/login/actions.ts):
// contador em memória por IP, reinicia a cada cold start — suficiente pra
// um app de usuário único, não pra barrar um atacante dedicado.
const tentativas = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function senhaConfere(fornecida: string, esperada: string) {
  const a = createHash("sha256").update(fornecida).digest();
  const b = createHash("sha256").update(esperada).digest();
  return timingSafeEqual(a, b);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type AuthParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope: string;
};

function renderErrorPage(message: string) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>Erro</title></head>` +
      `<body style="font-family:system-ui;background:#0a0a0a;color:#e5e5e5;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">` +
      `<p>${escapeHtml(message)}</p></body></html>`,
    { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

function renderLoginPage(params: AuthParams, error?: string) {
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Autorizar acesso</title>
<style>
  :root { color-scheme: dark; }
  body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #e5e5e5; display: flex;
         align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .card { background: #141414; border: 1px solid #262626; border-radius: 12px; padding: 32px;
          width: 100%; max-width: 360px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p.sub { color: #a3a3a3; font-size: 13px; margin: 0 0 20px; }
  label { font-size: 13px; color: #d4d4d4; display: block; margin-bottom: 6px; }
  input[type=password] { width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 8px;
         border: 1px solid #333; background: #0a0a0a; color: #e5e5e5; font-size: 14px; margin-bottom: 16px; }
  button { width: 100%; padding: 10px 12px; border-radius: 8px; border: none; background: #10b981;
           color: #052e1f; font-weight: 600; font-size: 14px; cursor: pointer; }
  .erro { color: #f87171; font-size: 13px; margin: -8px 0 16px; }
</style>
</head>
<body>
  <div class="card">
    <h1>Trading Esportivo — MCP</h1>
    <p class="sub">Autorizar o Claude a ler e escrever dados no seu dashboard.</p>
    <form method="POST">
      <input type="hidden" name="client_id" value="${escapeHtml(params.clientId)}" />
      <input type="hidden" name="redirect_uri" value="${escapeHtml(params.redirectUri)}" />
      <input type="hidden" name="state" value="${escapeHtml(params.state)}" />
      <input type="hidden" name="code_challenge" value="${escapeHtml(params.codeChallenge)}" />
      <input type="hidden" name="scope" value="${escapeHtml(params.scope)}" />
      <label for="senha">Senha</label>
      <input type="password" id="senha" name="senha" autofocus required />
      ${error ? `<p class="erro">${escapeHtml(error)}</p>` : ""}
      <button type="submit">Autorizar</button>
    </form>
  </div>
</body>
</html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

function validateClientAndRedirect(clientId: string | null, redirectUri: string | null) {
  const expectedClientId = process.env.MCP_CLIENT_ID;
  const expectedRedirectUri = process.env.MCP_REDIRECT_URI;
  if (!expectedClientId || !expectedRedirectUri) {
    return "Servidor MCP não configurado (MCP_CLIENT_ID/MCP_REDIRECT_URI ausentes).";
  }
  if (clientId !== expectedClientId) return "client_id desconhecido.";
  if (redirectUri !== expectedRedirectUri) return "redirect_uri não confere com o cadastrado.";
  return null;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const clientId = sp.get("client_id");
  const redirectUri = sp.get("redirect_uri");

  // client_id/redirect_uri inválidos: nunca redireciona (evita open redirect),
  // mostra um erro direto na página.
  const clientError = validateClientAndRedirect(clientId, redirectUri);
  if (clientError) return renderErrorPage(clientError);

  const responseType = sp.get("response_type");
  const state = sp.get("state") ?? "";
  const codeChallenge = sp.get("code_challenge");
  const codeChallengeMethod = sp.get("code_challenge_method");
  const scope = sp.get("scope") ?? "dashboard";

  // Daqui pra frente redirect_uri já foi validado — erros de protocolo
  // podem voltar pro cliente por redirect, como o fluxo OAuth espera.
  const redirectBack = (error: string) => {
    const url = new URL(redirectUri!);
    url.searchParams.set("error", error);
    if (state) url.searchParams.set("state", state);
    return NextResponse.redirect(url);
  };

  if (responseType !== "code") return redirectBack("unsupported_response_type");
  if (!codeChallenge || codeChallengeMethod !== "S256") return redirectBack("invalid_request");

  return renderLoginPage({ clientId: clientId!, redirectUri: redirectUri!, state, codeChallenge, scope });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const clientId = form.get("client_id");
  const redirectUri = form.get("redirect_uri");
  const state = String(form.get("state") ?? "");
  const codeChallenge = form.get("code_challenge");
  const scope = String(form.get("scope") ?? "dashboard");
  const senha = form.get("senha");

  const clientError = validateClientAndRedirect(
    typeof clientId === "string" ? clientId : null,
    typeof redirectUri === "string" ? redirectUri : null
  );
  if (clientError) return renderErrorPage(clientError);
  if (typeof codeChallenge !== "string" || !codeChallenge) return renderErrorPage("code_challenge ausente.");

  const params: AuthParams = {
    clientId: clientId as string,
    redirectUri: redirectUri as string,
    state,
    codeChallenge,
    scope,
  };

  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return renderErrorPage("APP_PASSWORD não está configurada no servidor.");

  const ip = getClientIp(request);
  const agora = Date.now();
  const registro = tentativas.get(ip);

  if (registro && registro.resetAt > agora && registro.count >= MAX_TENTATIVAS) {
    const minutos = Math.ceil((registro.resetAt - agora) / 60000);
    return renderLoginPage(params, `Muitas tentativas. Tente novamente em ${minutos} min.`);
  }

  if (typeof senha !== "string" || !senhaConfere(senha, appPassword)) {
    const atual = registro && registro.resetAt > agora ? registro : { count: 0, resetAt: agora + JANELA_MS };
    atual.count += 1;
    tentativas.set(ip, atual);
    return renderLoginPage(params, "Senha incorreta.");
  }

  tentativas.delete(ip);

  const code = randomBytes(32).toString("base64url");
  await prisma.mcpAuthorizationCode.create({
    data: {
      code,
      codeChallenge,
      redirectUri: params.redirectUri,
      clientId: params.clientId,
      expiresAt: new Date(agora + CODE_TTL_MS),
    },
  });

  const url = new URL(params.redirectUri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  // 303 (não o 307 default do NextResponse.redirect): o navegador precisa
  // trocar o POST do form de login por um GET no redirect_uri — 307/308
  // preservariam o método POST, o que quebraria o callback do Claude.
  return NextResponse.redirect(url, 303);
}
