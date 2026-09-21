/* Демо-данные витрины: офферы, заводы, вопросы и отзывы.

   Лежат в shared, потому что их знают сразу несколько модулей (каталог, карточка,
   заводы, сравнение), а кросс-модульные импорты правилами слоёв запрещены. Установка
   моков (`install*Mocks`) остаётся в модулях — здесь только данные. */

export {
  FACTORIES,
  type FactoryFixture,
  type FactoryKey,
  FACTORY_KEYS,
  factoryById,
  factoryByKey,
  factoryTagline,
  SPECIALIZATIONS,
  type SpecializationKey,
  toFactoryBrief,
  toFactoryDetail,
  toFactorySummary,
} from "./factories";

export {
  DEFAULT_DELIVERY_ID,
  factoryReviews,
  offerDetail,
  OFFERS_COUNT_BY_FACTORY,
  questionsOf,
  reviewsOf,
  similarOffers,
} from "./offer-details";

export { mockQuote, offerNotFound, requireMockOffer } from "./quote-engine";

export { DEMO_PROMO, FIRST_MOCK_ORDER_NO, FIRST_MOCK_SAMPLE_NO, resolvePromo } from "./orders";

export {
  createSellerOfferRecord,
  ensureSellerOffersOrg,
  extraCatalogOffers,
  findSellerOfferRecord,
  listSellerOfferRecords,
  moderateSellerOfferRecord,
  moderationQueueRecords,
  needsModeration,
  offerChanges,
  patchSellerOfferRecord,
  PREVIEW_UNDERLOAD_PERCENT,
  resetSellerOffers,
  type SellerOfferRecord,
  setSellerOfferListed,
  submitSellerOfferRecord,
  toCatalogOffer,
  toOfferListItem,
} from "./seller-offers";

export {
  FACTORY_KEY_BY_OFFER,
  MATERIAL_BY_OFFER,
  MATERIALS,
  OFFER_BY_ID,
  OFFERS,
  offersOfFactory,
  REPEAT_DISCOUNT_PERCENT,
  UNDERLOAD_DISCOUNT_PERCENT,
} from "./offers";
