import type { ProblemDetails } from "@partiya/api-contracts";

/** Ошибка транспорта и ошибка бэка в одном типе: наверху нужен статус, текст и id обращения. */
export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | undefined;
  /** x-correlation-id запроса — его показываем на экране ошибки («Код обращения»). */
  readonly correlationId: string | undefined;

  constructor(options: {
    status: number;
    message: string;
    problem?: ProblemDetails;
    correlationId?: string;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = "ApiError";
    this.status = options.status;
    this.problem = options.problem;
    this.correlationId = options.correlationId;
  }

  /** Сеть недоступна или запрос не дошёл: повтор имеет смысл, показывать статус — нет. */
  get isNetwork(): boolean {
    return this.status === 0;
  }

  /** Ошибки по полям формы из problem+json. */
  get fieldErrors(): Record<string, string[]> | undefined {
    return this.problem?.errors;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
