/* Фабрики ключей и queryOptions по доменам.
   Новый домен: файл `queries/<имя>.ts` + строка реэкспорта. */

export {
  ADMIN_KEYS,
  adminDisputeListOptions,
  adminDisputeOptions,
  adminFactoryListOptions,
  adminFinanceOptions,
  adminOfferListOptions,
  adminOverviewOptions,
  adminRankingOptions,
  adminTaxonomyOptions,
} from "./backoffice";
export { AUTH_KEYS, authSessionsOptions, sessionQueryOptions } from "./auth";
export { CATALOG_KEYS, catalogSearchOptions } from "./catalog";
export { DISPUTE_KEYS, disputeFormOptions, disputeOptionsQuery } from "./disputes";
export { DOCUMENT_KEYS, documentListOptions, edoConnectionOptions } from "./documents";
export { FACTORY_KEYS, factoryDetailOptions, factoryListOptions } from "./factories";
export { MESSAGE_KEYS, orderMessagesOptions } from "./messages";
export {
  NOTIFICATION_KEYS,
  notificationListOptions,
  notificationSettingsOptions,
  userCountersOptions,
} from "./notifications";
export {
  OFFER_KEYS,
  offerDetailOptions,
  offerQuestionsOptions,
  offerReviewsOptions,
  offerSimilarOptions,
} from "./offers";
export {
  draftForQuoteOptions,
  ORDER_KEYS,
  orderListOptions,
  orderOptions,
  sampleListOptions,
  sampleOptionsQueryOptions,
} from "./orders";
export { escrowOverviewOptions, orderEscrowOptions, PAYMENT_KEYS } from "./payments";
export {
  capacityPlanOptions,
  factoryOnboardingOptions,
  SELLER_KEYS,
  sellerAuditOptions,
  sellerDashboardOptions,
  sellerFeedbackOptions,
  sellerFinanceSummaryOptions,
  sellerOfferEditorOptions,
  sellerOfferListOptions,
  sellerOrderListOptions,
  sellerOrderOptions,
  sellerPayoutsOptions,
  sellerProfileOptions,
  sellerSampleListOptions,
} from "./seller";
export { QUOTE_KEYS, quoteOptions } from "./quotes";
export { orderEventsOptions, TRACKING_KEYS } from "./tracking";
