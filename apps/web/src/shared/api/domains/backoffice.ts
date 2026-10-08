import type {
  AdminDisputeCard,
  AdminDisputeList,
  AdminDisputeListQuery,
  AdminFactoryDecisionBody,
  AdminFactoryList,
  AdminFactoryListQuery,
  AdminFinanceOverview,
  AdminOfferDecisionBody,
  AdminOfferList,
  AdminOfferListQuery,
  AdminOverdueActionResult,
  AdminOverdueDisputeBody,
  AdminOverdueExtendBody,
  AdminOverdueTrancheCount,
  AdminOverdueTranchePage,
  AdminOverview,
  AdminRanking,
  AdminStuckActionBody,
  AdminStuckCard,
  AdminStuckCount,
  AdminStuckKind,
  AdminStuckPage,
  AdminStuckQuery,
  AdminTaxonomy,
  AdminTranchesPage,
  AdminTranchesQuery,
  ConfirmFundsRequest,
  Order,
  PayoutConfirmedRequest,
  RankingPreview,
  RankingPreviewBody,
  ResolveDisputeBody,
  ScheduleAuditVisitBody,
  UpdateRankingBody,
  UpdateTaxonomyCategoryBody,
} from "@partiya/api-contracts";

/** Домен «Бэк-офис оператора» — ARCHITECTURE.md, раздел 9.
 *
 * Всё, что двигает деньги (подтверждение поступления, выплата, решение спора), берёт
 * `Idempotency-Key` явным аргументом — как и у заказчика с заводом. Все три операции
 * ручные: их нажимает человек, у которого может оборваться сеть ровно в тот момент,
 * когда перевод уже проведён. */
export interface BackofficeApi {
  /** `GET /admin/overview` → 200. Не оператор — 403. */
  getAdminOverview(signal?: AbortSignal): Promise<AdminOverview>;

  /* ───────── заводы и аудит ───────── */

  /** `GET /admin/factories?tab` → 200. */
  listAdminFactories(
    query?: AdminFactoryListQuery,
    signal?: AbortSignal,
  ): Promise<AdminFactoryList>;

  /** `POST /admin/factories/{orgId}/decision` → 200. Без обоснования — 422. */
  decideAdminFactory(orgId: string, body: AdminFactoryDecisionBody): Promise<AdminFactoryList>;

  /** `POST /admin/factories/{orgId}/audit-visit` → 200. */
  scheduleAuditVisit(orgId: string, body: ScheduleAuditVisitBody): Promise<AdminFactoryList>;

  /* ───────── модерация предложений ───────── */

  /** `GET /admin/offers?tab` → 200. */
  listAdminOffers(query?: AdminOfferListQuery, signal?: AbortSignal): Promise<AdminOfferList>;

  /** `POST /admin/offers/{id}/decision` → 200. Одобрение публикует версию. */
  decideAdminOffer(offerId: number, body: AdminOfferDecisionBody): Promise<AdminOfferList>;

  /* ───────── споры ───────── */

  /** `GET /admin/disputes?tab` → 200. */
  listAdminDisputes(query?: AdminDisputeListQuery, signal?: AbortSignal): Promise<AdminDisputeList>;

  /** `GET /admin/disputes/{orderId}` → 200; спора нет — 404. */
  getAdminDispute(orderId: number, signal?: AbortSignal): Promise<AdminDisputeCard>;

  /** `POST /admin/disputes/{orderId}/resolve` → 200. Решение уже вынесено — 409,
      распределение не сходится с суммой сделки — 422. */
  resolveAdminDispute(
    orderId: number,
    body: ResolveDisputeBody,
    idempotencyKey: string,
  ): Promise<AdminDisputeCard>;

  /* ───────── финансы (эндпоинты бэка уже реализованы) ───────── */

  /** `GET /admin/finance` → 200: сверка, очередь счетов, очередь выплат. */
  getAdminFinance(signal?: AbortSignal): Promise<AdminFinanceOverview>;

  /** `GET /admin/payments/tranches?status&cursor&limit` → 200. */
  listAdminTranches(query?: AdminTranchesQuery, signal?: AbortSignal): Promise<AdminTranchesPage>;

  /** `POST /admin/payments/tranches/{id}/confirm-funds` → 200 со сделкой в эскроу.
      Счёт уже оплачен — 409, сумма не совпала — 422 `payments/amount_mismatch`. */
  confirmTrancheFunds(
    trancheId: string,
    body: ConfirmFundsRequest,
    idempotencyKey: string,
  ): Promise<AdminFinanceOverview>;

  /** `POST /admin/payments/deals/{id}/payout-confirmed` → 200. Нечего выплачивать — 409. */
  confirmDealPayout(
    dealId: string,
    body: PayoutConfirmedRequest,
    idempotencyKey: string,
  ): Promise<AdminFinanceOverview>;

  /* ───────── таксономия и ранжирование ───────── */

  /** `GET /admin/taxonomy?path` → 200. */
  getAdminTaxonomy(path?: string, signal?: AbortSignal): Promise<AdminTaxonomy>;

  /** `PUT /admin/taxonomy/categories/{path}` → 200. */
  updateTaxonomyCategory(path: string, body: UpdateTaxonomyCategoryBody): Promise<AdminTaxonomy>;

  /** `GET /admin/ranking` → 200. */
  getAdminRanking(signal?: AbortSignal): Promise<AdminRanking>;

  /** `PUT /admin/ranking` → 200. Набор весов полный (Q-363): неизвестный, повторный,
      пропущенный фактор или вес вне 0..100 — 422 `admin/weights-invalid`
      (`errors["weights.<key>"]`), сумма ≠ 100 — 422 `admin/weights-sum`. */
  updateAdminRanking(body: UpdateRankingBody): Promise<AdminRanking>;

  /** `POST /admin/ranking/preview` → 200. Считает, не сохраняя. */
  previewAdminRanking(body: RankingPreviewBody): Promise<RankingPreview>;

  /* ───────── заказ: запасной путь «Доставлено» (п. 13, Q-332) ───────── */

  /** `POST /admin/orders/{id}/delivered` → 200 с заказом в `acceptance`. Не `shipped` — 409. */
  markAdminOrderDelivered(orderId: number): Promise<Order>;

  /* ───────── «Зависшие» (п. 35) ───────── */

  /** `GET /admin/stuck?kind&type&cursor&limit` → 200. Битый курсор — 400. */
  listAdminStuck(query?: AdminStuckQuery, signal?: AbortSignal): Promise<AdminStuckPage>;

  /** `GET /admin/stuck/count` → 200 — бейдж в меню. */
  getAdminStuckCount(signal?: AbortSignal): Promise<AdminStuckCount>;

  /** `GET /admin/stuck/{kind}/{id}` → 200; нет строки — 404. */
  getAdminStuckCard(
    kind: AdminStuckKind,
    id: string,
    signal?: AbortSignal,
  ): Promise<AdminStuckCard>;

  /** `POST /admin/stuck/{kind}/{id}/retry` → 200. Уже не зависла — 409 `admin/stuck-not-stuck`,
      держит воркер — 409 `admin/stuck-busy`. */
  retryAdminStuck(
    kind: AdminStuckKind,
    id: string,
    body: AdminStuckActionBody,
  ): Promise<AdminStuckCard>;

  /** `POST /admin/stuck/{kind}/{id}/resolve` → 200. Без комментария — 422
      `admin/comment-required`; уже не зависла — 409. */
  resolveAdminStuck(
    kind: AdminStuckKind,
    id: string,
    body: AdminStuckActionBody,
  ): Promise<AdminStuckCard>;

  /* ───────── «Просроченные транши» (Q-401) ───────── */

  /** `GET /admin/overdue-tranches` → 200: вторые транши 50/50, не оплаченные и после
      автопродления. */
  listAdminOverdueTranches(signal?: AbortSignal): Promise<AdminOverdueTranchePage>;

  /** `GET /admin/overdue-tranches/count` → 200 — бейдж в меню. */
  getAdminOverdueTrancheCount(signal?: AbortSignal): Promise<AdminOverdueTrancheCount>;

  /** `POST /admin/overdue-tranches/{orderNo}/extend` → 200. Часы 1–336 и комментарий —
      иначе 422; счёт уже оплачен — 409 `payments/tranche-already-paid`. */
  extendAdminOverdueTranche(
    orderNo: number,
    body: AdminOverdueExtendBody,
  ): Promise<AdminOverdueActionResult>;

  /** `POST /admin/overdue-tranches/{orderNo}/dispute` → 200: счёт снят, спор открыт от
      имени платформы. Без комментария — 422; счёт уже оплачен — 409. */
  openAdminOverdueDispute(
    orderNo: number,
    body: AdminOverdueDisputeBody,
  ): Promise<AdminOverdueActionResult>;
}
