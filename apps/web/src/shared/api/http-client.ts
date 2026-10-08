import type { ProblemDetails } from "@partiya/api-contracts";

import { ApiError } from "./api-error";

/* Один транспорт на все домены: базовый URL, cookie-сессия, correlation-id,
   разбор RFC 7807. Доменные клиенты (http/catalog.ts и т. д.) знают только про пути. */

export type QueryValue = string | number | boolean | undefined | null | Array<string | number>;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** POST, меняющие деньги и статусы, повторяются с тем же ключом — ARCHITECTURE.md, 8.4. */
  idempotencyKey?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export class HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly newCorrelationId: () => string = defaultCorrelationId,
  ) {}

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, options);
  }

  post<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, options);
  }

  patch<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("PATCH", path, options);
  }

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const correlationId = this.newCorrelationId();
    const headers: Record<string, string> = {
      Accept: "application/json",
      "x-correlation-id": correlationId,
      ...options.headers,
    };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

    let response: Response;
    try {
      response = await fetch(this.baseUrl + path + buildQuery(options.query), {
        method,
        credentials: "include",
        headers,
        signal: options.signal,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch (cause) {
      // AbortError пробрасываем как есть: это не сбой сети, а отменённый запрос
      if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
      throw new ApiError({
        status: 0,
        message: "Нет соединения с сервером",
        correlationId,
        cause,
      });
    }

    if (!response.ok) throw await toApiError(response, correlationId);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}

async function toApiError(response: Response, correlationId: string): Promise<ApiError> {
  const problem = await readProblem(response);
  // 413 от лимита тела приходит `text/plain`, без problem+json — различаем по статусу
  const fallback =
    response.status === 413
      ? "Файл слишком большой — не больше 25 МБ"
      : `Запрос не выполнен (${String(response.status)})`;
  const message = problem?.detail ?? problem?.title ?? fallback;
  return new ApiError({
    status: response.status,
    message,
    problem,
    // сервер мог вернуть свой id обращения — он важнее нашего
    correlationId: response.headers.get("x-correlation-id") ?? correlationId,
  });
}

async function readProblem(response: Response): Promise<ProblemDetails | undefined> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("problem+json") && !contentType.includes("application/json")) {
    return undefined;
  }
  try {
    const body: unknown = await response.json();
    return typeof body === "object" && body !== null ? (body as ProblemDetails) : undefined;
  } catch {
    return undefined;
  }
}

function buildQuery(query: Record<string, QueryValue> | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    // массивы уходят повторяющимся ключом: ?city=ivanovo&city=tula — так их читает axum
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else {
      params.set(key, String(value));
    }
  }
  const search = params.toString();
  return search ? `?${search}` : "";
}

function defaultCorrelationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}
