import type {
  AdminDisputeListQuery,
  AdminFactoryListQuery,
  AdminOfferListQuery,
  AdminStuckKind,
  AdminStuckQuery,
} from "@partiya/api-contracts";
import { queryOptions } from "@tanstack/react-query";

import { getApiService } from "../service";

/* Фабрика ключей бэк-офиса.
 *
 * Очереди перечитываются после каждого решения: оператор в смене не один, и «объект
 * уже обработан» должен быть виден сразу, а не через минуту. Поэтому staleTime = 0. */
export const ADMIN_KEYS = {
  all: ["admin"] as const,
  overview: () => [...ADMIN_KEYS.all, "overview"] as const,
  factories: (query: AdminFactoryListQuery) => [...ADMIN_KEYS.all, "factories", query] as const,
  offers: (query: AdminOfferListQuery) => [...ADMIN_KEYS.all, "offers", query] as const,
  disputes: (query: AdminDisputeListQuery) => [...ADMIN_KEYS.all, "disputes", query] as const,
  dispute: (orderId: number) => [...ADMIN_KEYS.all, "disputes", "detail", orderId] as const,
  finance: () => [...ADMIN_KEYS.all, "finance"] as const,
  taxonomy: (path: string) => [...ADMIN_KEYS.all, "taxonomy", path] as const,
  ranking: () => [...ADMIN_KEYS.all, "ranking"] as const,
  stuck: () => [...ADMIN_KEYS.all, "stuck"] as const,
  stuckList: (query: AdminStuckQuery) => [...ADMIN_KEYS.stuck(), "list", query] as const,
  stuckCount: () => [...ADMIN_KEYS.stuck(), "count"] as const,
  stuckCard: (kind: AdminStuckKind, id: string) =>
    [...ADMIN_KEYS.stuck(), "card", kind, id] as const,
  overdue: () => [...ADMIN_KEYS.all, "overdue-tranches"] as const,
  overdueCount: () => [...ADMIN_KEYS.overdue(), "count"] as const,
};

export const adminOverviewOptions = () =>
  queryOptions({
    queryKey: ADMIN_KEYS.overview(),
    queryFn: ({ signal }) => getApiService().getAdminOverview(signal),
    staleTime: 0,
  });

export const adminFactoryListOptions = (query: AdminFactoryListQuery = {}) =>
  queryOptions({
    queryKey: ADMIN_KEYS.factories(query),
    queryFn: ({ signal }) => getApiService().listAdminFactories(query, signal),
    staleTime: 0,
  });

export const adminOfferListOptions = (query: AdminOfferListQuery = {}) =>
  queryOptions({
    queryKey: ADMIN_KEYS.offers(query),
    queryFn: ({ signal }) => getApiService().listAdminOffers(query, signal),
    staleTime: 0,
  });

export const adminDisputeListOptions = (query: AdminDisputeListQuery = {}) =>
  queryOptions({
    queryKey: ADMIN_KEYS.disputes(query),
    queryFn: ({ signal }) => getApiService().listAdminDisputes(query, signal),
    staleTime: 0,
  });

export const adminDisputeOptions = (orderId: number) =>
  queryOptions({
    queryKey: ADMIN_KEYS.dispute(orderId),
    queryFn: ({ signal }) => getApiService().getAdminDispute(orderId, signal),
    staleTime: 0,
  });

export const adminFinanceOptions = () =>
  queryOptions({
    queryKey: ADMIN_KEYS.finance(),
    queryFn: ({ signal }) => getApiService().getAdminFinance(signal),
    staleTime: 0,
  });

export const adminTaxonomyOptions = (path = "") =>
  queryOptions({
    queryKey: ADMIN_KEYS.taxonomy(path),
    queryFn: ({ signal }) => getApiService().getAdminTaxonomy(path || undefined, signal),
    staleTime: 60_000,
  });

/** Бейдж «Зависшие» в меню (п. 35): пушей нет, поэтому счётчик опрашивается раз в минуту. */
export const adminStuckCountOptions = () =>
  queryOptions({
    queryKey: ADMIN_KEYS.stuckCount(),
    queryFn: ({ signal }) => getApiService().getAdminStuckCount(signal),
    staleTime: 0,
    refetchInterval: 60_000,
  });

/** «Просроченные транши» (Q-401): очередь целиком — строк единицы. */
export const adminOverdueTranchesOptions = () =>
  queryOptions({
    queryKey: ADMIN_KEYS.overdue(),
    queryFn: ({ signal }) => getApiService().listAdminOverdueTranches(signal),
    staleTime: 0,
  });

/** Бейдж «Просроченные транши» в меню: пушей нет — опрос раз в минуту. */
export const adminOverdueTrancheCountOptions = () =>
  queryOptions({
    queryKey: ADMIN_KEYS.overdueCount(),
    queryFn: ({ signal }) => getApiService().getAdminOverdueTrancheCount(signal),
    staleTime: 0,
    refetchInterval: 60_000,
  });

/** Карточка строки «Зависших»: ошибка целиком, payload, история действий. */
export const adminStuckCardOptions = (kind: AdminStuckKind, id: string) =>
  queryOptions({
    queryKey: ADMIN_KEYS.stuckCard(kind, id),
    queryFn: ({ signal }) => getApiService().getAdminStuckCard(kind, id, signal),
    staleTime: 0,
  });

export const adminRankingOptions = () =>
  queryOptions({
    queryKey: ADMIN_KEYS.ranking(),
    queryFn: ({ signal }) => getApiService().getAdminRanking(signal),
    staleTime: 60_000,
  });
