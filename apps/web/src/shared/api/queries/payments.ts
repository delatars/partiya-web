import { queryOptions } from "@tanstack/react-query";

import { getApiService } from "../service";

/* Фабрика ключей домена «Деньги». */
export const PAYMENT_KEYS = {
  all: ["payments"] as const,
  overview: () => [...PAYMENT_KEYS.all, "escrow-overview"] as const,
  deal: (orderId: number) => [...PAYMENT_KEYS.all, "deal", orderId] as const,
};

/** Раздел «Эскроу и счета» целиком: KPI, резервы, история, счета — одним запросом,
    чтобы цифры сверху сходились с таблицами снизу. */
export const escrowOverviewOptions = () =>
  queryOptions({
    queryKey: PAYMENT_KEYS.overview(),
    queryFn: ({ signal }) => getApiService().getEscrowOverview(signal),
    staleTime: 30_000,
  });

export const orderEscrowOptions = (orderId: number) =>
  queryOptions({
    queryKey: PAYMENT_KEYS.deal(orderId),
    queryFn: ({ signal }) => getApiService().getOrderEscrow(orderId, signal),
    retry: false,
    staleTime: 30_000,
  });
