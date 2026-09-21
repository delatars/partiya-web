import type { FactoryQuery } from "@partiya/api-contracts";
import { queryOptions } from "@tanstack/react-query";

import { getApiService } from "../service";

/* Фабрика ключей домена «Заводы»: список с фильтрами и витрина одного завода. */
export const FACTORY_KEYS = {
  all: ["factories"] as const,
  lists: () => [...FACTORY_KEYS.all, "list"] as const,
  list: (query: FactoryQuery) => [...FACTORY_KEYS.lists(), query] as const,
  detail: (id: number) => [...FACTORY_KEYS.all, "detail", id] as const,
};

export const factoryListOptions = (query: FactoryQuery) =>
  queryOptions({
    queryKey: FACTORY_KEYS.list(query),
    queryFn: ({ signal }) => getApiService().listFactories(query, signal),
    // смена фильтра не должна мигать пустым экраном
    placeholderData: (previous) => previous,
  });

export const factoryDetailOptions = (id: number) =>
  queryOptions({
    queryKey: FACTORY_KEYS.detail(id),
    queryFn: ({ signal }) => getApiService().getFactory(id, signal),
  });
