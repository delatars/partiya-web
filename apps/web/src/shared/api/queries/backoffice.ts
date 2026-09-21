import type {
  AdminDisputeListQuery,
  AdminFactoryListQuery,
  AdminOfferListQuery,
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

export const adminRankingOptions = () =>
  queryOptions({
    queryKey: ADMIN_KEYS.ranking(),
    queryFn: ({ signal }) => getApiService().getAdminRanking(signal),
    staleTime: 60_000,
  });
