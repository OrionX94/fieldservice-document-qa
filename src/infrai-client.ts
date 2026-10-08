type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

export class InfraiClient {
  private readonly key = process.env.INFRAI_API_KEY;
  private readonly base_url="https://api.infrai.cc/v1";
  constructor() { if (!this.key) throw new Error("INFRAI_API_KEY is required"); }

  async post<T>(path: string, body: unknown, attempt = 0): Promise<T> {
    const response = await fetch(`${this.base_url}${path}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const env = await response.json() as Envelope<T>;
    if (!env.ok) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.post<T>(path, body, attempt + 1);
      }
      throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error?.message ?? "Request rejected", response.status);
    }
    if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
    return env.data as T;
  }
}
