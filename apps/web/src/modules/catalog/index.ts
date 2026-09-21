/* Единственная публичная дверь модуля «Каталог». */

export { installCatalogMocks } from "./api/mocks";
export { DEFAULT_PER_PAGE, searchOffers } from "./api/search";
export {
  activeFilterCount,
  catalogSearchSchema,
  type CatalogSearch,
  clearFilters,
  facetValues,
  hasActiveFilters,
  type ListFacetKey,
  pageQuery,
  parseCatalogSearch,
  PER_PAGE,
  toCatalogQuery,
  withFacetValue,
  withPatch,
} from "./lib/search-params";
export { CatalogPage, type CatalogPageProps } from "./pages/CatalogPage";
