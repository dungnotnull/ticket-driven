/** Typed fetch wrapper for client components hitting our API routes. */

export class ApiClientError extends Error {
  status: number;
  /** Stable machine code from the API (client i18n keys off it). */
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(
  url: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {};
  const response = await fetch(url, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(rest.headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    /* non-JSON response */
  }

  if (!response.ok) {
    const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
    const message =
      (body && "error" in body ? String(body.error) : null) ??
      `Request failed (${response.status})`;
    const code =
      body && typeof body.code === "string" ? body.code : undefined;
    throw new ApiClientError(response.status, message, code);
  }
  return payload as T;
}
