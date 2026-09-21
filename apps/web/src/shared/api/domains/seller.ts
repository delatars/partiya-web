import type {
  AdvanceStageBody,
  AnswerBody,
  DeclineOrderBody,
  DeclineSampleBody,
  FactoryOnboardingDraft,
  PhotoReportBody,
  PhotoReportUploadRequest,
  PhotoReportUploadResponse,
  ReportProgressBody,
  RequestAuditBody,
  SaveFactoryOnboardingBody,
  SaveSellerOfferBody,
  SellerAudit,
  SellerDashboard,
  SellerFeedback,
  SellerFinanceSummary,
  SellerOfferEditor,
  SellerOfferList,
  SellerOfferListItem,
  SellerOrder,
  SellerOrderList,
  SellerOrderListQuery,
  SellerPayoutsPage,
  SellerProfile,
  SellerSampleList,
  SetOfferListedBody,
  ShipSampleBody,
  SubmitSellerOfferResponse,
  UpdateSellerProfileBody,
} from "@partiya/api-contracts";

/** Домен «Кабинет завода» — срез API `/seller/…` (ARCHITECTURE.md, 8.4).
 *
 * `Idempotency-Key` передаётся явным аргументом там же, где у заказчика: подтверждение
 * и отклонение заказа двигают деньги (жёсткий резерв мощности и возврат), и повтор
 * после обрыва сети обязан вернуть первый ответ, а не подтвердить заказ дважды.
 *
 * Отчёт о прогрессе и фотоотчёт ключа не требуют: они append-only в журнал, и лишняя
 * строка «Отшито 650 / 1 000» хуже не делает — в отличие от лишнего возврата денег. */
export interface SellerApi {
  /** `GET /seller/dashboard` → 200. Сводка кабинета: KPI, воронка, задачи на сегодня. */
  getSellerDashboard(signal?: AbortSignal): Promise<SellerDashboard>;

  /** `GET /seller/orders` → 200. Черновики и неоплаченные заказы заводу не видны. */
  listSellerOrders(query?: SellerOrderListQuery, signal?: AbortSignal): Promise<SellerOrderList>;

  /** `GET /seller/orders/{id}` → 200. Чужой заказ неотличим от несуществующего — 404. */
  getSellerOrder(id: number, signal?: AbortSignal): Promise<SellerOrder>;

  /** `POST /seller/orders/{id}/confirm` → 200. Не тот статус — 409, срок истёк — 409. */
  confirmSellerOrder(id: number, idempotencyKey: string): Promise<SellerOrder>;

  /** `POST /seller/orders/{id}/decline` → 200 с оформленным возвратом. */
  declineSellerOrder(
    id: number,
    body: DeclineOrderBody,
    idempotencyKey: string,
  ): Promise<SellerOrder>;

  /** `POST /seller/orders/{id}/progress` → 200. `done > total` — 422. */
  reportSellerProgress(id: number, body: ReportProgressBody): Promise<SellerOrder>;

  /** `POST /seller/orders/{id}/stage` → 200. Недопустимый переход — 409, не команда — 400. */
  advanceSellerStage(id: number, body: AdvanceStageBody): Promise<SellerOrder>;

  /** `POST /seller/orders/{id}/photo-report/upload` → 200 с presigned-ссылкой. */
  requestPhotoReportUpload(
    id: number,
    body: PhotoReportUploadRequest,
  ): Promise<PhotoReportUploadResponse>;

  /** `POST /seller/orders/{id}/photo-report` → 200. Пустой список файлов — 422. */
  publishPhotoReport(id: number, body: PhotoReportBody): Promise<SellerOrder>;

  /* ───────── предложения ───────── */

  /** `GET /seller/offers` → 200 со счётчиками вкладок и подсказкой аналитики. */
  listSellerOffers(signal?: AbortSignal): Promise<SellerOfferList>;

  /** `GET /seller/offers/{id}/editor` → 200: черновик, схема категории, версии, предпросмотр.
      `id = null` — форма нового предложения (`GET /seller/offers/new`). */
  getSellerOfferEditor(id: number | null, signal?: AbortSignal): Promise<SellerOfferEditor>;

  /** `POST /seller/offers` → 201 / `PATCH /seller/offers/{id}` → 200.
      Ступени не проходят проверку `pricing::validate_offer` — 422 с `errors`. */
  saveSellerOffer(id: number | null, body: SaveSellerOfferBody): Promise<SellerOfferEditor>;

  /** `POST /seller/offers/{id}/submit` → 200. Уже на модерации — 409. */
  submitSellerOffer(id: number): Promise<SubmitSellerOfferResponse>;

  /** `POST /seller/offers/{id}/listing` → 200. Тумблер «В выдаче». */
  setSellerOfferListed(id: number, body: SetOfferListedBody): Promise<SellerOfferListItem>;

  /* ───────── образцы ───────── */

  /** `GET /seller/samples` → 200. */
  listSellerSamples(signal?: AbortSignal): Promise<SellerSampleList>;

  /** `POST /seller/samples/{id}/accept` → 200. */
  acceptSellerSample(id: string): Promise<SellerSampleList>;

  /** `POST /seller/samples/{id}/ship` → 200 с трек-номером. */
  shipSellerSample(id: string, body: ShipSampleBody): Promise<SellerSampleList>;

  /** `POST /seller/samples/{id}/decline` → 200. */
  declineSellerSample(id: string, body: DeclineSampleBody): Promise<SellerSampleList>;

  /* ───────── финансы (эндпоинты бэка уже реализованы) ───────── */

  /** `GET /seller/finance/summary` → 200. Роль без права видеть финансы — 403. */
  getSellerFinanceSummary(signal?: AbortSignal): Promise<SellerFinanceSummary>;

  /** `GET /seller/finance/payouts?cursor&limit` → 200. Битый курсор — 400. */
  listSellerPayouts(
    query?: { cursor?: string; limit?: number },
    signal?: AbortSignal,
  ): Promise<SellerPayoutsPage>;

  /* ───────── отзывы, аудит, профиль, онбординг ───────── */

  /** `GET /seller/feedback` → 200: вопросы, отзывы, рейтинг, шаблоны ответов. */
  getSellerFeedback(signal?: AbortSignal): Promise<SellerFeedback>;

  /** `POST /seller/feedback/questions/{id}/answer` → 200. Пустой текст — 422. */
  answerSellerQuestion(questionId: number, body: AnswerBody): Promise<SellerFeedback>;

  /** `POST /seller/feedback/reviews/{id}/reply` → 200. */
  replySellerReview(reviewId: number, body: AnswerBody): Promise<SellerFeedback>;

  /** `GET /seller/audit` → 200. */
  getSellerAudit(signal?: AbortSignal): Promise<SellerAudit>;

  /** `POST /seller/audit/request` → 200. Заявка уже подана — 409. */
  requestSellerAudit(body: RequestAuditBody): Promise<SellerAudit>;

  /** `GET /seller/profile` → 200. */
  getSellerProfile(signal?: AbortSignal): Promise<SellerProfile>;

  /** `PUT /seller/profile` → 200. */
  updateSellerProfile(body: UpdateSellerProfileBody): Promise<SellerProfile>;

  /** `GET /seller/onboarding` → 200 (Q-111: черновик мастера переехал на сервер). */
  getFactoryOnboarding(signal?: AbortSignal): Promise<FactoryOnboardingDraft>;

  /** `PATCH /seller/onboarding` → 200. */
  saveFactoryOnboarding(body: SaveFactoryOnboardingBody): Promise<FactoryOnboardingDraft>;
}
