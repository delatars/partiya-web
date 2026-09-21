import type { OrderEventQuery } from "@partiya/api-contracts";
import { queryOptions } from "@tanstack/react-query";

import { getApiService } from "../service";

/* Фабрика ключей домена «Трекинг».
 *
 * Лента лежит под своим ключом, а не под `ORDER_KEYS.detail`: у неё другой жизненный
 * цикл — она растёт страницами и патчится событиями канала, а заказ перечитывается
 * целиком. Инвалидация ленты одного заказа: TRACKING_KEYS.events(orderId). */
export const TRACKING_KEYS = {
  all: ["tracking"] as const,
  events: (orderId: number) => [...TRACKING_KEYS.all, "events", orderId] as const,
  eventPage: (orderId: number, query: OrderEventQuery) =>
    [...TRACKING_KEYS.events(orderId), query] as const,
};

/** Первая страница журнала. Дальше лента живёт в компоненте: SSE досылает события,
    а дочитывание после обрыва идёт курсором, а не новым ключом кэша. */
export const orderEventsOptions = (orderId: number, query: OrderEventQuery = {}) =>
  queryOptions({
    queryKey: TRACKING_KEYS.eventPage(orderId, query),
    queryFn: ({ signal }) => getApiService().getOrderEvents(orderId, query, signal),
    // журнал пополняет сервер — своего кэша не держим
    staleTime: 0,
  });
