import type { CatalogQuery, CatalogSearchResult } from "@partiya/api-contracts";

/** Домен «Каталог»: выдача с фасетами. */
export interface CatalogApi {
  searchCatalog(query: CatalogQuery, signal?: AbortSignal): Promise<CatalogSearchResult>;
}
