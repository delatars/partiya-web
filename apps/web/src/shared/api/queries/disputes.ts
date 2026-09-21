import { queryOptions } from "@tanstack/react-query";

import { getApiService } from "../service";

/* Фабрика ключей домена «Споры». */
export const DISPUTE_KEYS = {
  all: ["disputes"] as const,
  detail: (orderId: number) => [...DISPUTE_KEYS.all, orderId] as const,
  options: (orderId: number) => [...DISPUTE_KEYS.all, "options", orderId] as const,
};

/** Спор по заказу. 404 — спора нет; это нормальное состояние, а не сбой, поэтому
    повторять запрос незачем. */
export const disputeOptionsQuery = (orderId: number) =>
  queryOptions({
    queryKey: DISPUTE_KEYS.detail(orderId),
    queryFn: ({ signal }) => getApiService().getDispute(orderId, signal),
    retry: false,
    staleTime: 0,
  });

/** Справочник формы претензии: причины, варианты требований, лимиты файлов. */
export const disputeFormOptions = (orderId: number) =>
  queryOptions({
    queryKey: DISPUTE_KEYS.options(orderId),
    queryFn: ({ signal }) => getApiService().getDisputeOptions(orderId, signal),
    staleTime: 60_000,
  });
