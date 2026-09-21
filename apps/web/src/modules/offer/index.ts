/* Единственная публичная дверь модуля «Карточка предложения». */

export { installOfferMocks } from "./api/mocks";
export {
  checkoutSearch,
  DEFAULT_OFFER_TAB,
  effectiveDeliveryId,
  effectiveQty,
  isOptionAvailable,
  normalizeQty,
  type OfferSearch,
  offerSearchSchema,
  OFFER_TABS,
  type OfferTab,
  parseOfferSearch,
  qtyStep,
  selectedOptionIds,
  toQuoteRequest,
  withOption,
  withPatch,
} from "./lib/search-params";
export { OfferPage, type OfferPageProps } from "./pages/OfferPage";
