import type { Quote, QuoteRequest } from "@partiya/api-contracts";

import type { QuotesApi } from "../domains/quotes";
import type { HttpClient } from "../http-client";

/* `POST /quotes` — тело целиком, без query. Idempotency-Key здесь не нужен: котировка
   ничего не меняет ни в деньгах, ни в статусах, а повторный расчёт безопасен. */
export function createQuotesHttpApi(client: HttpClient): QuotesApi {
  return {
    createQuote: (request: QuoteRequest, signal?: AbortSignal) =>
      client.post<Quote>("/quotes", { body: request, signal }),
  };
}
