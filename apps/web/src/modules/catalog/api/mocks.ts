import type { CatalogQuery, CatalogSearchResult } from "@partiya/api-contracts";

import { createDelegatingApiService } from "@/shared/api";
import type { ApiService } from "@/shared/api";
import { extraCatalogOffers, OFFERS } from "@/shared/mocks";

import { searchOffers } from "./search";

/** Небольшая задержка, чтобы на моках были видны скелетоны и «Показать ещё». */
const LATENCY_MS = 220;

/* Выдача собирается из фикстур ПЛЮС предложений, которые завод завёл сам, а оператор
   опубликовал (`extraCatalogOffers`). Иначе сквозной сценарий «создал SKU → одобрили →
   видно в каталоге» проверить было бы нечем: реестр SKU живёт в shared именно ради этого. */
export const installCatalogMocks = (inner: ApiService): ApiService =>
  createDelegatingApiService(inner, {
    searchCatalog: (query: CatalogQuery): Promise<CatalogSearchResult> =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(searchOffers([...OFFERS, ...extraCatalogOffers()], query));
        }, LATENCY_MS);
      }),
  });
