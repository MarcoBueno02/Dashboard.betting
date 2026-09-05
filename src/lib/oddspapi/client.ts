const BASE_URL = "https://api.oddspapi.io/v4";

export class OddsPapiQuotaExceededError extends Error {
  constructor() {
    super("Cota mensal da OddsPapi excedida");
    this.name = "OddsPapiQuotaExceededError";
  }
}

/**
 * GET num endpoint da OddsPapi. Lança OddsPapiQuotaExceededError no 429 de
 * cota (código REQUEST_LIMIT_EXCEEDED, ver docs "Requests & Quota") pra quem
 * chama tratar isso separado de qualquer outro erro de rede/API.
 */
export async function oddsPapiGet<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const apiKey = process.env.ODDSPAPI_API_KEY;
  if (!apiKey) throw new Error("ODDSPAPI_API_KEY não configurada");

  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("apiKey", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (res.status === 429) {
    const body = await res.json().catch(() => null);
    if (body?.code === "REQUEST_LIMIT_EXCEEDED") throw new OddsPapiQuotaExceededError();
    throw new Error(`OddsPapi 429: ${body?.message ?? "rate limited"}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OddsPapi ${res.status} em ${path}: ${text.slice(0, 500)}`);
  }

  return res.json() as Promise<T>;
}
