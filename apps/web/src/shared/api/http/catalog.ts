import type { CatalogQuery, CatalogSearchResult } from "@partiya/api-contracts";

import type { CatalogApi } from "../domains/catalog";
import type { HttpClient, QueryValue } from "../http-client";

/* Реальный бэк: GET /catalog/search?category&sort&page + фасеты повторяющимися ключами
   (?city=…&city=…&badges=audit). Неизвестные ему параметры он игнорирует. */
export function createCatalogHttpApi(client: HttpClient): CatalogApi {
  return {
    searchCatalog(query: CatalogQuery, signal?: AbortSignal): Promise<CatalogSearchResult> {
      const params: Record<string, QueryValue> = {
        ids: query.ids,
        category: query.category,
        sort: query.sort,
        page: query.page,
        perPage: query.perPage,
        q: query.q,
        priceMin: query.priceMin,
        priceMax: query.priceMax,
        moqMin: query.moqMin,
        moqMax: query.moqMax,
      };
      for (const [key, values] of Object.entries(query.filters ?? {})) {
        if (values.length > 0) params[key] = values;
      }
      return client.get<CatalogSearchResult>("/catalog/search", { query: params, signal });
    },
  };
}
