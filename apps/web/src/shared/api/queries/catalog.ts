import type { CatalogQuery } from "@partiya/api-contracts";
import { queryOptions } from "@tanstack/react-query";

import { getApiService } from "../service";

/* Фабрика ключей домена «Каталог». Живёт в слое API, а не в модуле: выдачу спрашивают
   и каталог, и главная. Инвалидация: всё — CATALOG_KEYS.all, одна выдача — search(query). */
export const CATALOG_KEYS = {
  all: ["catalog"] as const,
  searches: () => [...CATALOG_KEYS.all, "search"] as const,
  search: (query: CatalogQuery) => [...CATALOG_KEYS.searches(), query] as const,
};

export const catalogSearchOptions = (query: CatalogQuery) =>
  queryOptions({
    queryKey: CATALOG_KEYS.search(query),
    queryFn: ({ signal }) => getApiService().searchCatalog(query, signal),
    // при догрузке следующей страницы предыдущая выдача остаётся на экране
    placeholderData: (previous) => previous,
  });
