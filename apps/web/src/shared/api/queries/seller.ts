import type { SellerOrderListQuery } from "@partiya/api-contracts";
import { queryOptions } from "@tanstack/react-query";

import { getApiService } from "../service";

/* Фабрика ключей кабинета завода.
 *
 * Инвалидация: всё — SELLER_KEYS.all (подтверждение заказа меняет и очередь, и сводку,
 * и мощность), один заказ — SELLER_KEYS.order(id). Отдельные ключи у предложений:
 * правка SKU не трогает заказы. */
export const SELLER_KEYS = {
  all: ["seller"] as const,
  dashboard: () => [...SELLER_KEYS.all, "dashboard"] as const,
  orders: () => [...SELLER_KEYS.all, "orders"] as const,
  orderList: (query: SellerOrderListQuery) => [...SELLER_KEYS.orders(), query] as const,
  order: (id: number) => [...SELLER_KEYS.orders(), "detail", id] as const,
  offers: () => [...SELLER_KEYS.all, "offers"] as const,
  offerEditor: (id: number | null) => [...SELLER_KEYS.offers(), "editor", id ?? "new"] as const,
  samples: () => [...SELLER_KEYS.all, "samples"] as const,
  finance: () => [...SELLER_KEYS.all, "finance"] as const,
  payouts: () => [...SELLER_KEYS.finance(), "payouts"] as const,
  feedback: () => [...SELLER_KEYS.all, "feedback"] as const,
  audit: () => [...SELLER_KEYS.all, "audit"] as const,
  profile: () => [...SELLER_KEYS.all, "profile"] as const,
  onboarding: () => [...SELLER_KEYS.all, "onboarding"] as const,
  capacity: (from?: string, to?: string) =>
    [...SELLER_KEYS.all, "capacity", from ?? "", to ?? ""] as const,
};

/** Сводка кабинета. Статусы двигает завод и заказчик — своего кэша не держим. */
export const sellerDashboardOptions = () =>
  queryOptions({
    queryKey: SELLER_KEYS.dashboard(),
    queryFn: ({ signal }) => getApiService().getSellerDashboard(signal),
    staleTime: 0,
  });

/** Очередь заказов завода. Счётчики вкладок считает сервер по всей выдаче. */
export const sellerOrderListOptions = (query: SellerOrderListQuery = {}) =>
  queryOptions({
    queryKey: SELLER_KEYS.orderList(query),
    queryFn: ({ signal }) => getApiService().listSellerOrders(query, signal),
    staleTime: 0,
  });

export const sellerOrderOptions = (id: number) =>
  queryOptions({
    queryKey: SELLER_KEYS.order(id),
    queryFn: ({ signal }) => getApiService().getSellerOrder(id, signal),
    staleTime: 0,
  });

export const sellerOfferListOptions = () =>
  queryOptions({
    queryKey: SELLER_KEYS.offers(),
    queryFn: ({ signal }) => getApiService().listSellerOffers(signal),
    staleTime: 30_000,
  });

/** Редактор SKU. `null` — форма нового предложения. */
export const sellerOfferEditorOptions = (id: number | null) =>
  queryOptions({
    queryKey: SELLER_KEYS.offerEditor(id),
    queryFn: ({ signal }) => getApiService().getSellerOfferEditor(id, signal),
    staleTime: 0,
  });

export const sellerSampleListOptions = () =>
  queryOptions({
    queryKey: SELLER_KEYS.samples(),
    queryFn: ({ signal }) => getApiService().listSellerSamples(signal),
    staleTime: 30_000,
  });

export const sellerFinanceSummaryOptions = () =>
  queryOptions({
    queryKey: SELLER_KEYS.finance(),
    queryFn: ({ signal }) => getApiService().getSellerFinanceSummary(signal),
    staleTime: 0,
  });

export const sellerPayoutsOptions = () =>
  queryOptions({
    queryKey: SELLER_KEYS.payouts(),
    queryFn: ({ signal }) => getApiService().listSellerPayouts({}, signal),
    staleTime: 0,
  });

export const sellerFeedbackOptions = () =>
  queryOptions({
    queryKey: SELLER_KEYS.feedback(),
    queryFn: ({ signal }) => getApiService().getSellerFeedback(signal),
    staleTime: 30_000,
  });

export const sellerAuditOptions = () =>
  queryOptions({
    queryKey: SELLER_KEYS.audit(),
    queryFn: ({ signal }) => getApiService().getSellerAudit(signal),
    staleTime: 60_000,
  });

export const sellerProfileOptions = () =>
  queryOptions({
    queryKey: SELLER_KEYS.profile(),
    queryFn: ({ signal }) => getApiService().getSellerProfile(signal),
    staleTime: 60_000,
  });

/** Черновик мастера подключения (Q-111). */
export const factoryOnboardingOptions = (enabled = true) =>
  queryOptions({
    queryKey: SELLER_KEYS.onboarding(),
    queryFn: ({ signal }) => getApiService().getFactoryOnboarding(signal),
    enabled,
    staleTime: 0,
  });

/** План мощности. Горизонт задаёт экран; пусто — текущая неделя + 8. */
export const capacityPlanOptions = (from?: string, to?: string) =>
  queryOptions({
    queryKey: SELLER_KEYS.capacity(from, to),
    queryFn: ({ signal }) => getApiService().getCapacityPlan({ from, to }, signal),
    staleTime: 0,
  });
