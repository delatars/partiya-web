/* Единственная публичная дверь модуля «Заводы»: список и витрина. */

export { installFactoryMocks } from "./api/mocks";
export {
  type FactoriesSearch,
  factoriesSearchSchema,
  hasFactoryFilters,
  parseFactoriesSearch,
  toFactoryQuery,
  withFactoriesPatch,
} from "./lib/search-params";
export { FactoriesPage, type FactoriesPageProps } from "./pages/FactoriesPage";
export { FactoryPage } from "./pages/FactoryPage";
