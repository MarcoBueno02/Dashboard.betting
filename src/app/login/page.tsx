import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const nextParam = params.next;
  const next = typeof nextParam === "string" ? nextParam : "/";

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Dashboard de Trading Esportivo
          </h1>
          <p className="text-sm text-muted-foreground">
            Digite a senha para acessar
          </p>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
