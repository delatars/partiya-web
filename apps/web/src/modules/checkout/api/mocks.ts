import type { Order, OrderStatus } from "@partiya/api-contracts";

import { createDelegatingApiService } from "@/shared/api";
import type { ApiService } from "@/shared/api";

import { createMockOrdersBackend, type MockOrdersBackend } from "./mock-backend";

/* Мок-декоратор доменов «Заказы», «Образцы», «Трекинг», «Сообщения», «Документы»,
   «Споры», «Уведомления» и «Деньги».

   Все они — один мок-бэкенд с одним состоянием: события, прогресс, сообщения и деньги
   обязаны относиться к тем же заказам, что и оформление. Разложить их по разным
   декораторам значило бы завести второе хранилище заказов и рано или поздно разойтись.

   Кто вошёл, мок узнаёт у внутреннего сервиса: к моменту установки он уже обёрнут моком
   входа (порядок в app/mocks.ts). Прямой импорт modules/auth запрещён правилами слоёв —
   и правильно: домен заказов не должен знать, как устроен домен входа. */

let backend: MockOrdersBackend | undefined;

export const installOrderMocks = (inner: ApiService): ApiService => {
  backend = createMockOrdersBackend({ getMe: () => inner.getMe() });
  const api = backend;

  return createDelegatingApiService(inner, {
    // заказы и образцы
    createOrderDraft: (body, idempotencyKey) => api.createOrderDraft(body, idempotencyKey),
    getOrder: (id) => api.getOrder(id),
    listOrders: (query) => api.listOrders(query),
    updateOrderDraft: (id, body) => api.updateOrderDraft(id, body),
    requestArtworkUpload: (id, body) => api.requestArtworkUpload(id, body),
    completeArtworkUpload: (id, fileId) => api.completeArtworkUpload(id, fileId),
    deleteArtwork: (id, fileId) => api.deleteArtwork(id, fileId),
    submitOrder: (id, body, idempotencyKey) => api.submitOrder(id, body, idempotencyKey),
    cancelOrder: (id, body) => api.cancelOrder(id, body),
    approveArtwork: (id) => api.approveArtwork(id),
    acceptOrder: (id, body, idempotencyKey) => api.acceptOrder(id, body, idempotencyKey),
    repeatOrder: (id, idempotencyKey) => api.repeatOrder(id, idempotencyKey),
    getSampleOptions: (offerId) => api.getSampleOptions(offerId),
    requestSampleArtworkUpload: (body) => api.requestSampleArtworkUpload(body),
    createSample: (body, idempotencyKey) => api.createSample(body, idempotencyKey),
    listSamples: () => api.listSamples(),

    // трекинг и канал заказа
    getOrderEvents: (orderId, query) => api.getOrderEvents(orderId, query),
    streamOrderEvents: (orderId, options) => api.streamOrderEvents(orderId, options),

    // чат
    getOrderMessages: (orderId, query) => api.getOrderMessages(orderId, query),
    sendOrderMessage: (orderId, body, key) => api.sendOrderMessage(orderId, body, key),
    markOrderMessagesRead: (orderId, body) => api.markOrderMessagesRead(orderId, body),
    requestMessageAttachmentUpload: (orderId, body) =>
      api.requestMessageAttachmentUpload(orderId, body),

    // документы
    listDocuments: (query) => api.listDocuments(query),
    signDocument: (documentId) => api.signDocument(documentId),
    getEdoConnection: () => api.getEdoConnection(),

    // споры
    getDisputeOptions: (orderId) => api.getDisputeOptions(orderId),
    getDispute: (orderId) => api.getDispute(orderId),
    openDispute: (orderId, body, key) => api.openDispute(orderId, body, key),
    withdrawDispute: (orderId) => api.withdrawDispute(orderId),
    requestDisputeEvidenceUpload: (orderId, body) =>
      api.requestDisputeEvidenceUpload(orderId, body),

    // уведомления и счётчики
    listNotifications: (query) => api.listNotifications(query),
    markNotificationsRead: (body) => api.markNotificationsRead(body),
    getNotificationSettings: () => api.getNotificationSettings(),
    updateNotificationSettings: (body) => api.updateNotificationSettings(body),
    getUserCounters: () => api.getUserCounters(),
    streamUserEvents: (options) => api.streamUserEvents(options),

    // деньги
    getEscrowOverview: () => api.getEscrowOverview(),
    getOrderEscrow: (orderId) => api.getOrderEscrow(orderId),

    // кабинет завода
    getSellerDashboard: () => api.getSellerDashboard(),
    listSellerOrders: (query) => api.listSellerOrders(query),
    getSellerOrder: (id) => api.getSellerOrder(id),
    confirmSellerOrder: (id, key) => api.confirmSellerOrder(id, key),
    declineSellerOrder: (id, body, key) => api.declineSellerOrder(id, body, key),
    reportSellerProgress: (id, body) => api.reportSellerProgress(id, body),
    advanceSellerStage: (id, body) => api.advanceSellerStage(id, body),
    markSellerOrderDelivered: (id, body) => api.markSellerOrderDelivered(id, body),
    requestPhotoReportUpload: (id, body) => api.requestPhotoReportUpload(id, body),
    publishPhotoReport: (id, body) => api.publishPhotoReport(id, body),
    listSellerOffers: () => api.listSellerOffers(),
    getSellerOfferEditor: (id) => api.getSellerOfferEditor(id),
    saveSellerOffer: (id, body) => api.saveSellerOffer(id, body),
    submitSellerOffer: (id) => api.submitSellerOffer(id),
    setSellerOfferListed: (id, body) => api.setSellerOfferListed(id, body),
    listSellerSamples: () => api.listSellerSamples(),
    acceptSellerSample: (id) => api.acceptSellerSample(id),
    shipSellerSample: (id, body) => api.shipSellerSample(id, body),
    declineSellerSample: (id, body) => api.declineSellerSample(id, body),
    getSellerFinanceSummary: () => api.getSellerFinanceSummary(),
    listSellerPayouts: () => api.listSellerPayouts(),
    getSellerFeedback: () => api.getSellerFeedback(),
    answerSellerQuestion: (id, body) => api.answerSellerQuestion(id, body),
    replySellerReview: (id, body) => api.replySellerReview(id, body),
    getSellerAudit: () => api.getSellerAudit(),
    requestSellerAudit: (body) => api.requestSellerAudit(body),
    getSellerProfile: () => api.getSellerProfile(),
    updateSellerProfile: (body) => api.updateSellerProfile(body),
    getFactoryOnboarding: () => api.getFactoryOnboarding(),
    saveFactoryOnboarding: (body) => api.saveFactoryOnboarding(body),

    // мощность
    getCapacityPlan: (query) => api.getCapacityPlan(query),
    updateCapacityPlan: (body) => api.updateCapacityPlan(body),
    copyCapacityPlan: (body) => api.copyCapacityPlan(body),

    // бэк-офис
    getAdminOverview: () => api.getAdminOverview(),
    listAdminFactories: (query) => api.listAdminFactories(query),
    decideAdminFactory: (orgId, body) => api.decideAdminFactory(orgId, body),
    scheduleAuditVisit: (orgId, body) => api.scheduleAuditVisit(orgId, body),
    listAdminOffers: (query) => api.listAdminOffers(query),
    decideAdminOffer: (offerId, body) => api.decideAdminOffer(offerId, body),
    listAdminDisputes: (query) => api.listAdminDisputes(query),
    getAdminDispute: (orderId) => api.getAdminDispute(orderId),
    resolveAdminDispute: (orderId, body, key) => api.resolveAdminDispute(orderId, body, key),
    getAdminFinance: () => api.getAdminFinance(),
    listAdminTranches: (query) => api.listAdminTranches(query),
    confirmTrancheFunds: (id, body, key) => api.confirmTrancheFunds(id, body, key),
    confirmDealPayout: (id, body, key) => api.confirmDealPayout(id, body, key),
    getAdminTaxonomy: (path) => api.getAdminTaxonomy(path),
    updateTaxonomyCategory: (path, body) => api.updateTaxonomyCategory(path, body),
    getAdminRanking: () => api.getAdminRanking(),
    updateAdminRanking: (body) => api.updateAdminRanking(body),
    previewAdminRanking: (body) => api.previewAdminRanking(body),
    markAdminOrderDelivered: (orderId) => api.markAdminOrderDelivered(orderId),
    listAdminStuck: (query) => api.listAdminStuck(query),
    getAdminStuckCount: () => api.getAdminStuckCount(),
    getAdminStuckCard: (kind, id) => api.getAdminStuckCard(kind, id),
    retryAdminStuck: (kind, id, body) => api.retryAdminStuck(kind, id, body),
    resolveAdminStuck: (kind, id, body) => api.resolveAdminStuck(kind, id, body),
    listAdminOverdueTranches: () => api.listAdminOverdueTranches(),
    getAdminOverdueTrancheCount: () => api.getAdminOverdueTrancheCount(),
    extendAdminOverdueTranche: (orderNo, body) => api.extendAdminOverdueTranche(orderNo, body),
    openAdminOverdueDispute: (orderNo, body) => api.openAdminOverdueDispute(orderNo, body),
  });
};

/* ─────────────────────────────── демо-команды ───────────────────────────────

   Этих методов нет и не будет в `ApiService`: у бэка их делают webhook банка, отчёт
   фабрики и таймеры очереди. Поэтому они ходят прямо в мок и вызываются только из
   компонентов, спрятанных за `useMocks`. Так в интерфейсе домена не появляется метода,
   которого сервер никогда не реализует. */

function requireBackend(): MockOrdersBackend {
  if (!backend) throw new Error("Моки заказов не установлены");
  return backend;
}

/** «Я оплатил (демо)»: у бэка этот переход делает webhook банка. */
export function demoMarkOrderPaid(orderId: number): Promise<Order> {
  return requireBackend().markPaid(orderId);
}

/** Демо-пульт трекинга: продвинуть заказ по автомату от лица фабрики или системы. */
export function demoAdvanceOrder(orderId: number, to?: OrderStatus): Promise<Order> {
  return requireBackend().demoAdvance(orderId, to);
}
