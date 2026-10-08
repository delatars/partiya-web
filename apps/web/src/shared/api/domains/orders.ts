import type {
  AcceptOrderBody,
  ArtworkUploadRequest,
  ArtworkUploadResponse,
  CancelOrderBody,
  CreateOrderDraftBody,
  CreateSampleBody,
  Order,
  OrderArtwork,
  OrderList,
  OrderListQuery,
  RepeatOrderResponse,
  SampleArtworkUploadRequest,
  SampleArtworkUploadResponse,
  SampleList,
  SampleOptions,
  SampleOrder,
  SubmitOrderBody,
  SubmitOrderResponse,
  UpdateOrderDraftBody,
} from "@partiya/api-contracts";

/** Домен «Заказы и образцы» — модули-крейты `orders` и `samples` (ARCHITECTURE.md, 8.4).
 *
 * Черновик оформления живёт на сервере (7.6): браузер ничего не хранит, и закрытая
 * вкладка не теряет ни шага. Отсюда форма интерфейса — `create` → `patch` → `submit`,
 * а не «отправить всю форму разом».
 *
 * `Idempotency-Key` у методов передаётся явным аргументом, а не прячется внутри: эти
 * три запроса меняют деньги и статусы, и ключ для них — часть контракта, а не деталь
 * транспорта. Повтор с тем же ключом обязан вернуть первый ответ, а не создать второй
 * заказ. */
export interface OrdersApi {
  /** `POST /orders` → 201 с новым черновиком либо 200 с уже существующим черновиком
      этой организации по этому офферу. Котировка истекла — 409. */
  createOrderDraft(
    body: CreateOrderDraftBody,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<Order>;

  /** `GET /orders/{id}` → 200. Чужой заказ неотличим от несуществующего — 404. */
  getOrder(id: number, signal?: AbortSignal): Promise<Order>;

  /** `GET /orders` → 200. Вкладки кабинета считает сервер (`bucket`). */
  listOrders(query?: OrderListQuery, signal?: AbortSignal): Promise<OrderList>;

  /** `PATCH /orders/{id}` → 200. Не черновик — 409, битое поле — 422 с `errors`. */
  updateOrderDraft(id: number, body: UpdateOrderDraftBody): Promise<Order>;

  /** `POST /orders/{id}/artwork` → 200 с presigned-ссылкой. Тип — 415, размер — 413. */
  requestArtworkUpload(id: number, body: ArtworkUploadRequest): Promise<ArtworkUploadResponse>;

  /** `POST /orders/{id}/artwork/{fileId}/complete` → 200. Браузер сообщает, что файл
      долетел до хранилища: presigned-загрузка идёт мимо API, и иначе сервер о ней не узнает. */
  completeArtworkUpload(id: number, fileId: string): Promise<OrderArtwork>;

  /** `DELETE /orders/{id}/artwork/{fileId}` → 204. */
  deleteArtwork(id: number, fileId: string): Promise<void>;

  /** `POST /orders/{id}/submit` → 200: документы и платёжные инструкции.
      Тело — принятие оферты (DECISIONS.md, п. 12): без `offerAccepted: true` и версии —
      422 `orders/offer-not-accepted`. Шаги заполнены не полностью — 422, котировка
      истекла — 409. */
  submitOrder(
    id: number,
    body: SubmitOrderBody,
    idempotencyKey: string,
  ): Promise<SubmitOrderResponse>;

  /** `POST /orders/{id}/cancel` → 200 с заказом в статусе `cancelled` (п. 17): только
      черновик или неоплаченный счёт. Деньги уже поступили — 409 `orders/cancel-after-payment`;
      повтор по отменённому — 200. */
  cancelOrder(id: number, body: CancelOrderBody): Promise<Order>;

  /** `POST /orders/{id}/artwork/approve` → 200. Команда `ApproveArtwork` автомата:
      макет и цветопробу согласовывает заказчик (Q-02). Не тот статус — 409. */
  approveArtwork(id: number): Promise<Order>;

  /** `POST /orders/{id}/accept` → 200 с заказом в статусе `completed`.
      Не тот статус — 409, окно приёмки закрыто — 409, открыт спор — 409.
      Ключ идемпотентности обязателен: приёмка освобождает деньги из эскроу. */
  acceptOrder(id: number, body: AcceptOrderBody, idempotencyKey: string): Promise<Order>;

  /** `POST /orders/{id}/repeat` → 201 с новым черновиком по той же спецификации.
      Скидку за повтор считает сервер; заказ не завершён — 409. */
  repeatOrder(id: number, idempotencyKey: string): Promise<RepeatOrderResponse>;

  /** `GET /offers/{id}/sample-options` → 200. Из чего собирается форма образца. */
  getSampleOptions(offerId: number, signal?: AbortSignal): Promise<SampleOptions>;

  /** `POST /samples/artwork` → 200 с presigned-ссылкой (макет к образцу необязателен). */
  requestSampleArtworkUpload(
    body: SampleArtworkUploadRequest,
  ): Promise<SampleArtworkUploadResponse>;

  /** `POST /samples` → 201. */
  createSample(body: CreateSampleBody, idempotencyKey: string): Promise<SampleOrder>;

  /** `GET /samples` → 200. Раздел кабинета «Образцы». */
  listSamples(signal?: AbortSignal): Promise<SampleList>;
}
