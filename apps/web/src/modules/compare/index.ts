/* Единственная публичная дверь модуля «Сравнение предложений». */

export {
  batchTotal,
  bestOfferIds,
  COMPARE_BATCH_QTY,
  COMPARE_QUANTITIES,
  COMPARE_ROWS,
  type CompareRow,
  rowDiffers,
  unitPriceAt,
  visibleRows,
} from "./lib/compare";
export {
  type CompareSearch,
  compareSearchSchema,
  parseCompareSearch,
  withCompareOnly,
} from "./lib/search-params";
export { ComparePage, type ComparePageProps } from "./pages/ComparePage";
