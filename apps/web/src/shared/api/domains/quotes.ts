import type { Quote, QuoteRequest } from "@partiya/api-contracts";

/** Домен «Котировки» — `POST /quotes` (ARCHITECTURE.md, 5.5).
 *
 * Авторитетен сервер: он считает, сохраняет котировку с `valid_until` и отдаёт её id —
 * в заказ уходит только id. Браузер шлёт выбор покупателя, а не суммы. Некорректный
 * вход (объём ниже MOQ, неизвестная опция) — 422 с problem+json. */
export interface QuotesApi {
  createQuote(request: QuoteRequest, signal?: AbortSignal): Promise<Quote>;
}
