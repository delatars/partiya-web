import type { OrderEvent, OrderEventPage, OrderEventQuery } from "@partiya/api-contracts";

/** Домен «Трекинг заказа» — модуль-крейт `tracking` (ARCHITECTURE.md, 8.3, 8.4).
 *
 * Два метода на два способа получить одно и то же: журнал заказа. `getOrderEvents` —
 * дочитывание страницами по курсору `after=seq`, `streamOrderEvents` — живой канал.
 * Это не дублирование: канал рвётся, и после обрыва экран дочитывает пропущенное тем же
 * курсором, что прислал `Last-Event-ID`. Поэтому оба метода оперируют одним `seq`.
 *
 * Подписка возвращает функцию отписки, а не объект соединения: наружу нужна ровно одна
 * операция — «перестань». Транспорт (SSE, поллинг в моках) остаётся внутри реализации. */

export type StreamState = "connecting" | "open" | "closed";

export interface OrderStreamOptions {
  /** С какого `seq` продолжать. Не задан — сервер шлёт только новое. */
  lastSeq?: number;
  onEvent: (event: OrderEvent) => void;
  onStateChange?: (state: StreamState) => void;
}

export interface TrackingApi {
  /** `GET /orders/{id}/events?after=&limit=` → 200. Чужой заказ — 404. */
  getOrderEvents(
    orderId: number,
    query?: OrderEventQuery,
    signal?: AbortSignal,
  ): Promise<OrderEventPage>;

  /** `GET /orders/{id}/stream` (SSE). Возвращает функцию отписки. */
  streamOrderEvents(orderId: number, options: OrderStreamOptions): () => void;
}
