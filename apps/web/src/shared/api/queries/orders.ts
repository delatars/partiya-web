import type { OrderListQuery } from "@partiya/api-contracts";
import { queryOptions } from "@tanstack/react-query";

import { getApiService } from "../service";

/* Фабрика ключей домена «Заказы».
 *
 * Инвалидация: всё — ORDER_KEYS.all, один заказ — ORDER_KEYS.detail(id).
 * Черновик лежит под своим ключом, а не под detail: у него другой жизненный цикл —
 * он создаётся POST-запросом, и ключ по офферу позволяет переиспользовать созданный
 * черновик при повторном монтировании (StrictMode, возврат «назад»). */
export const ORDER_KEYS = {
  all: ["orders"] as const,
  lists: () => [...ORDER_KEYS.all, "list"] as const,
  list: (query: OrderListQuery) => [...ORDER_KEYS.lists(), query] as const,
  details: () => [...ORDER_KEYS.all, "detail"] as const,
  detail: (id: number) => [...ORDER_KEYS.details(), id] as const,
  draftFor: (quoteId: string) => [...ORDER_KEYS.all, "draft-for", quoteId] as const,
  sampleOptions: (offerId: number) => [...ORDER_KEYS.all, "sample-options", offerId] as const,
  samples: () => ["samples", "list"] as const,
};

/** Один заказ. `refetchInterval` ставит вызывающий: он знает, ждём мы оплату или нет. */
export const orderOptions = (id: number) =>
  queryOptions({
    queryKey: ORDER_KEYS.detail(id),
    queryFn: ({ signal }) => getApiService().getOrder(id, signal),
    // статус меняет сервер (поступление денег, подтверждение завода) — своего кэша не держим
    staleTime: 0,
  });

/** Список заказов кабинета. Счётчики вкладок считаются по полной выдаче, поэтому
    фильтр по `bucket` экран пока не передаёт — фильтрует на клиенте. */
export const orderListOptions = (query: OrderListQuery = {}) =>
  queryOptions({
    queryKey: ORDER_KEYS.list(query),
    queryFn: ({ signal }) => getApiService().listOrders(query, signal),
    staleTime: 30_000,
  });

/** Черновик под котировку: POST по смыслу, но для экрана это «дай, что есть».
 *
 * Живёт запросом, а не мутацией, ровно по той же причине, что и котировка: двойное
 * монтирование в StrictMode и возврат «назад» не должны плодить черновики. Сервер
 * отвечает существующим черновиком, если он уже есть (см. `OrdersApi.createOrderDraft`),
 * а `Idempotency-Key` выводится из `quoteId` — он стабилен для одного и того же расчёта. */
export const draftForQuoteOptions = (quoteId: string | undefined) =>
  queryOptions({
    queryKey: ORDER_KEYS.draftFor(quoteId ?? ""),
    queryFn: ({ signal }) =>
      getApiService().createOrderDraft(
        { quoteId: quoteId ?? "" },
        `order-draft:${quoteId ?? ""}`,
        signal,
      ),
    enabled: quoteId !== undefined && quoteId.length > 0,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    retry: false,
  });

/** Образцы кабинета: список с трекинг-номерами и зачётом в партию. */
export const sampleListOptions = () =>
  queryOptions({
    queryKey: ORDER_KEYS.samples(),
    queryFn: ({ signal }) => getApiService().listSamples(signal),
    staleTime: 30_000,
  });

/** Справочник формы образца — меняется редко, кэшируем надолго. */
export const sampleOptionsQueryOptions = (offerId: number) =>
  queryOptions({
    queryKey: ORDER_KEYS.sampleOptions(offerId),
    queryFn: ({ signal }) => getApiService().getSampleOptions(offerId, signal),
    staleTime: 5 * 60_000,
  });
