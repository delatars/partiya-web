import type { OrderEvent, OrderEventPage, OrderEventQuery } from "@partiya/api-contracts";
import { streamEvents } from "@partiya/realtime";

import type { OrderStreamOptions, TrackingApi } from "../domains/tracking";
import type { HttpClient } from "../http-client";

/* Реальный бэк: крейт `tracking`, маршруты под /api/v1.

   Канал заказа поднимается не через `HttpClient`: у SSE нет ни JSON-тела, ни одного
   ответа — это долгоживущий поток, и разбор RFC 7807 к нему неприменим. Поэтому здесь
   `streamEvents` из `@partiya/realtime` поверх того же базового URL. */

export function createTrackingHttpApi(client: HttpClient, baseUrl: string): TrackingApi {
  return {
    getOrderEvents(
      orderId: number,
      query: OrderEventQuery = {},
      signal?: AbortSignal,
    ): Promise<OrderEventPage> {
      return client.get<OrderEventPage>(`/orders/${String(orderId)}/events`, {
        query: { after: query.after, limit: query.limit, types: query.types },
        signal,
      });
    },

    streamOrderEvents(orderId: number, options: OrderStreamOptions): () => void {
      const controller = new AbortController();
      void streamEvents({
        url: `${baseUrl}/orders/${String(orderId)}/stream`,
        // `Last-Event-ID` — это `seq`: один курсор на дочитывание и на переподключение
        lastEventId: options.lastSeq === undefined ? undefined : String(options.lastSeq),
        signal: controller.signal,
        onStateChange: options.onStateChange,
        onEvent: (frame) => {
          if (frame.event !== "order_event") return;
          const event = parseOrderEvent(frame.data);
          if (event) options.onEvent(event);
        },
      });
      return () => {
        controller.abort();
      };
    },
  };
}

/** Кадр с битым JSON роняет весь поток, если его не поймать. Молча пропускаем: одно
    потерянное событие дочитается курсором, а оборванная подписка — нет. */
function parseOrderEvent(data: string): OrderEvent | undefined {
  try {
    const parsed: unknown = JSON.parse(data);
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const event = parsed as OrderEvent;
    return typeof event.seq === "number" && typeof event.type === "string" ? event : undefined;
  } catch {
    return undefined;
  }
}
