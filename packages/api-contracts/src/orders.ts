import type { Kopecks } from "./common";
import type { DisputeSummary } from "./disputes";
import type { EscrowSummary } from "./payments";
import type { Quote } from "./quotes";
import type { OrderTracking } from "./tracking";

/* Домен «Заказы»: черновик оформления, отправка заказа, счёт и платёжные инструкции,
   список заказов кабинета.

   Написано по ARCHITECTURE.md: 5.2 (автомат статусов), 5.4 (эскроу и B2B-оплата счётом),
   5.5 (в заказ идёт только `quote_id`), 7.6 (черновик — на сервере), 8.4 (срез API).

   Два правила, на которых держится весь домен:

   1. Деньги считает только сервер. Фронт не присылает ни сумм, ни процентов — он
      присылает `quoteId` котировки, которую сервер сам же и посчитал. Поэтому
      `Order.quote` — это СНИМОК: строки, которые уйдут в спецификацию и в эскроу.
   2. Черновик живёт на сервере, а не в браузере. Оформление переживает закрытие
      вкладки, потерю сети и переход на другое устройство — see 7.6.

   Время — строка RFC 3339 в UTC («2026-09-21T18:00:00Z»), даты без времени — ISO
   `YYYY-MM-DD`, как в остальных доменах. */

/** Укрупнённая проекция автомата заказа для заказчика — ARCHITECTURE.md, 5.2 */
export type CustomerStage = "paid" | "materials" | "production" | "quality_control" | "shipped";

/** Полный автомат заказа. Имена — `serde(rename_all = "snake_case")` из
    `crates/orders/src/domain/status.rs`; менять их нельзя без миграции. */
export type OrderStatus =
  | "draft"
  | "awaiting_payment"
  | "awaiting_confirmation"
  | "confirmed"
  | "declined"
  | "artwork_review"
  | "materials"
  | "in_production"
  | "quality_control"
  | "shipped"
  | "acceptance"
  | "dispute"
  | "completed"
  | "refunded"
  | "cancelled";

/** Вкладки кабинета заказчика. Считает сервер из `status` — фронт не раскладывает
    статусы по корзинам сам, иначе две проекции разойдутся (ARCHITECTURE.md, 5.2). */
export type OrderBucket = "work" | "action" | "done" | "cancelled";

/* ─────────────────────────────── параметры партии ─────────────────────────────── */

/** Строка разбивки по цвету: «белый 600 · чёрный 400». */
export interface OrderColorLine {
  /** Название цвета, как его показывает фабрика: «белый», «графит». */
  color: string;
  qty: number;
}

/** Строка размерного ряда: «S 200 · M 300 · L 300 · XL 200». */
export interface OrderSizeLine {
  size: string;
  qty: number;
}

/** Параметры изделия — то, что уйдёт в спецификацию.
 *
 * Инвариант, который проверяет сервер: `sum(colors.qty) === sum(sizes.qty) === qty`.
 * Пустые `colors`/`sizes` допустимы только у черновика — на `submit` они обязательны. */
export interface OrderParams {
  /** Объём партии, шт. Он же в котировке: расходиться им нельзя. */
  qty: number;
  /** Коды выбранных опций оффера в порядке выбора — те же, что в `QuoteRequest.optionIds`. */
  optionIds: string[];
  colors: OrderColorLine[];
  sizes: OrderSizeLine[];
  /** Крой из характеристик оффера: «классический», «оверсайз». */
  fit: string | null;
  /** Описание нанесения: «шелкография, 2 цвета, грудь». */
  print: string | null;
  /** Комментарий технологу. */
  comment: string | null;
}

/* ─────────────────────────────── макет печати ─────────────────────────────── */

/** Состояние файла макета.
 *
 * `uploading` живёт только между выдачей presigned-ссылки и подтверждением загрузки;
 * `review` — файл у технолога фабрики (макет: «на проверке у технолога»). */
export type ArtworkStatus = "uploading" | "review" | "approved" | "rejected" | "failed";

export interface OrderArtwork {
  /** Он же `fileId` из ответа на запрос загрузки. */
  id: string;
  fileName: string;
  /** Размер, байты. */
  size: number;
  contentType: string;
  status: ArtworkStatus;
  /** Ссылка на скачивание; `null`, пока файл не долетел до хранилища. */
  url: string | null;
  uploadedAt: string | null;
  /** Причина `rejected` или `failed` — её показывает строка списка файлов. */
  error: string | null;
}

/** Ограничения загрузки макета. Их задаёт сервер и присылает в ответе на запрос
    загрузки: зашивать мегабайты в браузер нельзя — они поменяются раньше релиза. */
export interface ArtworkLimits {
  /** Максимальный размер одного файла, байты. */
  maxSize: number;
  /** Разрешённые MIME-типы. */
  contentTypes: string[];
  /** Сколько файлов можно приложить к одному заказу. */
  maxFiles: number;
}

/** `POST /orders/{id}/artwork` — запрос presigned-ссылки. Файл уходит в S3 напрямую,
    минуя API (ARCHITECTURE.md, 8.2: «presigned URL для прямой загрузки»). */
export interface ArtworkUploadRequest {
  fileName: string;
  contentType: string;
  size: number;
}

export interface ArtworkUploadResponse {
  fileId: string;
  /** Куда браузер кладёт файл. Одноразовая ссылка с ограниченным сроком. */
  uploadUrl: string;
  /** Метод для `uploadUrl`; у S3 presigned PUT это `PUT`. */
  method: "PUT" | "POST";
  /** Заголовки, которые обязаны уйти вместе с телом (`Content-Type` и подпись). */
  headers: Record<string, string>;
  /** До какого момента ссылка действительна, RFC 3339. */
  expiresAt: string;
  limits: ArtworkLimits;
}

/* ─────────────────────────────── доставка ─────────────────────────────── */

/** Куда едет партия. `marketplace_warehouse` — склад WB/Ozon: фабрика маркирует
    «Честный знак» и сама оформляет поставку. */
export type OrderDeliveryKind = "marketplace_warehouse" | "address" | "pickup";

export interface OrderDelivery {
  /** Код варианта из `OfferDetail.delivery[]`; он же уходит в `QuoteRequest.deliveryId`. */
  optionId: string;
  /** Название варианта, как его показал оффер: «Доставка до склада WB». */
  title: string;
  /** Стоимость из котировки — сервер дублирует её здесь, чтобы строка заказа читалась
      без обращения к офферу; источник правды остаётся `quote`. */
  price: Kopecks;
  kind: OrderDeliveryKind;
  /** Адрес доставки или склада: «Коледино, Московская обл.». У самовывоза — `null`. */
  address: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  comment: string | null;
}

/** Что фронт присылает в PATCH. Название, цена и вид — за сервером: он знает оффер. */
export interface OrderDeliveryInput {
  optionId: string;
  address?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  comment?: string | null;
}

/* ─────────────────────────────── плательщик ─────────────────────────────── */

/** Плательщик — организация заказчика из `GET /me`. Реквизиты сервер берёт из карточки
    организации; здесь они дублируются снимком, потому что уйдут в счёт и договор. */
export interface OrderPayer {
  orgId: string;
  name: string;
  inn: string;
  kpp: string | null;
  /** Юридический адрес для счёта и договора. */
  legalAddress: string | null;
  /** Кому отправить счёт: «Отправить бухгалтеру» на экране оплаты. */
  accountantEmail: string | null;
}

export interface OrderPayerInput {
  orgId: string;
  legalAddress?: string | null;
  accountantEmail?: string | null;
}

/* ─────────────────────────────── оплата и документы ─────────────────────────────── */

/** Способ оплаты из макета `checkout`, блок «Оплата».
 *
 * `escrow_split_50_50` — две сделки-транша в одной `EscrowDeal` (ARCHITECTURE.md, 5.4):
 * половина при запуске, половина после приёмки. Доступность схемы решает сервер
 * (в макете — «для фабрик с рейтингом 4,7+»), поэтому у варианта есть `available`. */
export type PaymentMethod = "escrow_full" | "escrow_split_50_50";

/** Вариант оплаты, как его показывает шаг «Оплата»: тексты пишет сервер, а не браузер —
    условия схемы 50/50 зависят от фабрики и меняются без релиза фронта. */
export interface PaymentMethodOption {
  method: PaymentMethod;
  title: string;
  description: string;
  available: boolean;
  /** Почему вариант недоступен: «рейтинг фабрики ниже 4,7». */
  unavailableReason: string | null;
  /** Сколько платить сейчас: у `escrow_full` — весь итог, у 50/50 — первый транш. */
  amountDue: Kopecks;
}

export type OrderDocumentKind = "offer_contract" | "specification" | "invoice" | "act";

/** Как документ подписывается. `edo_pending` — ждёт подписи в ЭДО, `none` — счёт,
    его не подписывают. */
export type OrderDocumentSignature = "none" | "edo_pending" | "edo_signed";

export interface OrderDocument {
  id: string;
  kind: OrderDocumentKind;
  /** Название с номером: «Договор-оферта № 4812», «Спецификация 4812-С». */
  title: string;
  /** Ссылка на скачивание (PDF). `null` — документ ещё формируется. */
  url: string | null;
  signature: OrderDocumentSignature;
  createdAt: string;
}

/** Платёжное поручение: B2B-оплата — это счёт и перевод, а не карта (ARCHITECTURE.md, 5.4).
    Поступление ждём часы–дни, матчим по номеру заказа в назначении платежа. */
export interface PaymentInstructions {
  /** Номер счёта: «4812-СЧ». */
  invoiceNumber: string;
  payeeName: string;
  payeeInn: string;
  payeeKpp: string;
  bankName: string;
  bik: string;
  /** Расчётный счёт получателя — номинальный счёт платформы. */
  account: string;
  correspondentAccount: string;
  /** Назначение платежа целиком, как его надо вписать в платёжку. */
  purpose: string;
  /** Итог заказа. */
  amount: Kopecks;
  /** Сколько платить сейчас: у 50/50 — первый транш. */
  amountDue: Kopecks;
  /** Дедлайн оплаты, RFC 3339. После него резерв мощности снимается. */
  dueAt: string;
}

/** Применённый промокод. Скидку считает сервер строкой котировки (`QuoteLine.kind = "promo"`),
    здесь — только то, что показать в поле. */
export interface OrderPromo {
  code: string;
  title: string;
  /** Сумма скидки, неотрицательная (в строке котировки она же со знаком минус). */
  discount: Kopecks;
}

/* ─────────────────────────────── заказ ─────────────────────────────── */

/** Снимок оффера в заказе: заказ ссылается на версию оффера, а завод тем временем
    правит цены и название (ARCHITECTURE.md, D9). */
export interface OrderOffer {
  id: number;
  title: string;
  factoryId: number;
  factoryName: string;
  factoryCity: string;
  /** Градиент заглушки фото — тот же, что в каталоге. */
  tone: "a" | "b" | "c" | "d" | null;
}

export interface Order {
  /** Публичный номер заказа: отдельная последовательность, он же в URL и в счёте
      (ARCHITECTURE.md, 8.1). UUID заказа наружу не выходит. */
  id: number;
  status: OrderStatus;
  /** Укрупнённая стадия для трекинга; `null` до оплаты. */
  customerStage: CustomerStage | null;
  bucket: OrderBucket;
  createdAt: string;
  updatedAt: string;

  offer: OrderOffer;
  /** id котировки, на которой стоит заказ. В заказ идёт только он (ARCHITECTURE.md, 5.5). */
  quoteId: string;
  /** Снимок строк котировки: он уходит в спецификацию и в эскроу. */
  quote: Quote;
  /** До какого момента котировка действительна. После — `submit` отвечает 409. */
  quoteValidUntil: string | null;
  /** Считать как повторную партию у той же фабрики (скидка −9 %). */
  repeat: boolean;
  promo: OrderPromo | null;

  params: OrderParams;
  artwork: OrderArtwork[];
  delivery: OrderDelivery | null;
  payer: OrderPayer | null;
  paymentMethod: PaymentMethod | null;
  /** Варианты оплаты с условиями — считает сервер по фабрике и сумме. */
  paymentOptions: PaymentMethodOption[];

  /** Документы; у черновика список пуст — они формируются на `submit`. */
  documents: OrderDocument[];
  /** Реквизиты для оплаты; `null` до `submit`. */
  payment: PaymentInstructions | null;

  submittedAt: string | null;
  paidAt: string | null;
  /** Дедлайн подтверждения заводом; появляется вместе с деньгами в эскроу. */
  confirmDeadlineAt: string | null;
  /** Плановая отгрузка, ISO `YYYY-MM-DD`; у черновика — из котировки. */
  shipDate: string | null;

  /* ───────── заказ после оплаты: проекции соседних модулей ─────────

     Всё ниже необязательно и появляется по мере жизни заказа: у черновика этих полей
     нет вовсе. Они лежат здесь, а не приезжают отдельными запросами, потому что экран
     трекинга рисует из них одну шапку — а пять запросов ради одной шапки дали бы пять
     моментов времени и расходящиеся числа. Лента событий, сообщения и документы
     остаются отдельными (и постраничными) запросами: они растут без предела. */

  /** Проекция журнала: этапы, прогресс, курсор SSE (`tracking.ts`). `null` до оплаты. */
  tracking?: OrderTracking | null;
  /** Эскроу-сделка заказа (`payments.ts`); `null`, пока деньги не поступили. */
  escrow?: EscrowSummary | null;
  /** Окно приёмки; `null` вне статуса `acceptance`. */
  acceptance?: AcceptanceWindow | null;
  /** Открытый или закрытый спор (`disputes.ts`). */
  dispute?: DisputeSummary | null;
  /** Когда партия доставлена — с этого момента идёт окно приёмки. */
  deliveredAt?: string | null;
  /** Когда партия принята заказчиком или принята автоматически. */
  acceptedAt?: string | null;
  /** Скидка за повтор у этой фабрики, % — подпись кнопки «Повторить партию −9 %». */
  repeatDiscountPercent?: number | null;
  /** Заказ, повтором которого является этот; `null` — первая партия. */
  repeatOfOrderId?: number | null;
  /** Непрочитанных сообщений чата — бейдж на вкладке и в списке заказов. */
  unreadMessages?: number;
  /** Трек-номер доставки: его вводит завод, отмечая «Доставлено» (DECISIONS.md, п. 13).
      `null` — завод ещё не отметил доставку (или её отметил оператор). */
  trackingNumber?: string | null;
  /** Подписи сторон под макетом печати (п. 16): заказ уходит в `materials` после обеих. */
  artworkSignoff?: ArtworkSignoff;
  /** Можно ли отменить заказ самому (п. 17): черновик или неоплаченный счёт. */
  canCancel?: boolean;
}

/** Подписи сторон под макетом печати (DECISIONS.md, п. 16): технолог завода —
    производимость, заказчик — визуал. RFC 3339; `null` — сторона ещё не подписала. */
export interface ArtworkSignoff {
  customerApprovedAt: string | null;
  factoryApprovedAt: string | null;
}

/* ─────────────────────────────── приёмка ───────────────────────────────

   `POST /orders/{id}/accept` — команда `Accept` автомата (5.2). Окно приёмки — 5 рабочих
   дней после доставки; если заказчик молчит, срабатывает таймер `AcceptanceWindowExpired`
   и партия считается принятой. Отсюда форма типов: `AcceptanceWindow` описывает таймер,
   а не кнопку, — экран показывает оставшиеся дни даже когда человек ничего не нажимает. */

/** Строка чек-листа приёмки: что обещала спецификация и что сообщил контроль качества. */
export interface AcceptanceCheck {
  /** Код строки: `qty`, `colors`, `sizes`, `density`, `print`, `marking`. */
  id: string;
  /** «Количество», «Плотность ткани». */
  title: string;
  /** Значение по спецификации: «1 000 шт». */
  expected: string;
  /** Что сообщил контроль качества фабрики: «1 000 шт · акт склада WB 998 принято». */
  reported: string | null;
}

/** Отметка заказчика по строке чек-листа. */
export type AcceptanceCheckMark = "ok" | "issue";

/** Окно приёмки — то, что показывает шапка экрана приёмки. */
export interface AcceptanceWindow {
  /** Когда открылось (момент доставки). */
  openedAt: string;
  /** Когда партия будет принята автоматически. */
  autoAcceptAt: string;
  /** Сколько рабочих дней осталось; 0 — истекает сегодня. */
  workingDaysLeft: number;
  /** Чек-лист из спецификации и отчёта КК. */
  checks: AcceptanceCheck[];
  /** Фотографии отчёта контроля качества. */
  photoIds: string[];
  /** Подпись под отчётом КК: «Выборка 5 % (50 шт): брак 0…». */
  qualityNote: string | null;
  /** Можно ли ещё открыть спор — совпадает с окном приёмки. */
  disputeAllowed: boolean;
}

/** `POST /orders/{id}/accept`. Требует `Idempotency-Key`: приёмка освобождает деньги.
 *
 * Приёмка «с замечаниями» — это всё равно приёмка: деньги уходят фабрике, а замечания
 * остаются в журнале заказа и в рейтинге фабрики. Претензия, которая блокирует деньги,
 * — это спор, а не отметка в чек-листе. */
export interface AcceptOrderBody {
  /** Отметки по строкам чек-листа: код строки → отметка. Необязательны. */
  marks?: Record<string, AcceptanceCheckMark>;
  /** Текст замечаний — уходит в журнал заказа. */
  note?: string | null;
  /** Отзыв о фабрике; без него приёмка тоже проходит. */
  review?: AcceptanceReview | null;
}

/** Отзыв, который экран приёмки предлагает оставить вместе с приёмкой. */
export interface AcceptanceReview {
  /** Оценка 1–5. */
  rating: number;
  text: string;
  /** Отмеченные качества: «В срок», «Качество печати». */
  tags?: string[];
}

/* ─────────────────────────────── повтор партии ─────────────────────────────── */

/** `POST /orders/{id}/repeat` — новый черновик по спецификации прошлой партии.
 *
 * Черновик создаёт сервер, а не браузер: скидку за повтор считает движок котировок, и
 * собрать такой заказ ссылкой «/order/new?repeat=1» означало бы дать браузеру решать,
 * положена ли скидка. Ответ содержит готовый черновик — экран уходит в оформление. */
export interface RepeatOrderResponse {
  /** Новый черновик: `status = "draft"`, `repeat = true`, `repeatOfOrderId` заполнен. */
  order: Order;
  /** Скидка за повтор, % — её показывает шапка оформления. */
  discountPercent: number;
  /** На сколько дней зафиксирована цена повтора. */
  priceLockedDays: number;
}

/** Черновик — тот же заказ в статусе `draft`. Отдельного типа у сервера нет, и
    заводить его на фронте значило бы обещать бэку структуру, которой у него нет. */
export type OrderDraft = Order & { status: "draft" };

/* ─────────────────────────────── список кабинета ─────────────────────────────── */

export interface OrderListItem {
  id: number;
  status: OrderStatus;
  customerStage: CustomerStage | null;
  bucket: OrderBucket;
  /** Строка таблицы: «Футболки 180 г/м², 1 000 шт». */
  title: string;
  /** «Волна, Иваново». */
  factory: string;
  offerId: number;
  total: Kopecks;
  /** Готовность партии, % — проекция журнала заказа. У черновика 0. */
  progressPct: number;
  /** Плановая отгрузка, ISO `YYYY-MM-DD`; `null`, пока даты нет. */
  shipDate: string | null;
  createdAt: string;
  updatedAt: string;
  /** Непрочитанных сообщений чата — бейдж в строке таблицы. */
  unreadMessages?: number;
  /** Когда истекает окно приёмки; `null` вне статуса `acceptance`. */
  acceptanceDueAt?: string | null;
  /** По заказу открыт спор — строка подсвечивается. */
  disputeOpen?: boolean;

  /* Поля ниже нужны разделу «Повторные партии»: он показывает прошлую цену за штуку
     и спецификацию, а собирать их из строки заголовка браузер не должен. */

  /** Объём партии, шт. */
  qty?: number;
  /** Цена за штуку в прошлой партии. */
  unitPrice?: Kopecks;
  /** Краткая спецификация: «белый 300 · чёрный 200, S–XL, шелкография 2 цв.». */
  spec?: string;
  /** Скидка за повтор у этой фабрики, %. */
  repeatDiscountPercent?: number;
  /** Сколько раз эта спецификация уже заказывалась у фабрики. */
  repeatCount?: number;
  /** Свободная мощность фабрики в ближайшем месяце, % — «свободно в октябре 38 %». */
  freeCapacityPct?: number;
}

/** Сводка кабинета — четыре KPI над таблицей заказов.
 *
 * Считает сервер по ВСЕЙ выдаче, а не браузер по странице: «в эскроу 411 900 ₽» должно
 * сходиться с разделом «Эскроу и счета», а не с тем, что поместилось на экран. */
export interface OrderListSummary {
  /** Заказов не в корзине «Получены». */
  active: number;
  /** Сколько сейчас в эскроу. */
  escrowTotal: Kopecks;
  /** Ближайшая отгрузка среди активных, ISO `YYYY-MM-DD`; `null` — дат нет. */
  nearestShipDate: string | null;
  /** Сколько сэкономлено на повторных партиях. */
  savedOnRepeats: Kopecks;
  /** На скольких партиях. */
  repeatOrders: number;
}

export interface OrderList {
  items: OrderListItem[];
  total: number;
  summary?: OrderListSummary;
}

export interface OrderListQuery {
  /** Пусто — все заказы. Счётчики вкладок считаются по полной выдаче. */
  bucket?: OrderBucket;
  page?: number;
  perPage?: number;
}

/* ─────────────────────────────── запросы ─────────────────────────────── */

/** `POST /orders` — создать черновик из котировки.
 *
 * Тело состоит из одного поля намеренно: всё остальное (оффер, объём, опции, доставка,
 * цены, срок) сервер достаёт из сохранённой котировки. Прислать их ещё раз — значит
 * завести второй источник правды и рано или поздно разойтись с первым. */
export interface CreateOrderDraftBody {
  quoteId: string;
}

/** `PATCH /orders/{id}` — частичное обновление черновика.
 *
 * Отсутствующий ключ означает «не трогать», явный `null` — «очистить». Поэтому
 * необязательные поля здесь `?: T | null`, а не просто `?: T`. */
export interface UpdateOrderDraftBody {
  /** Пересчитали партию — пришла новая котировка. Оффер менять нельзя: 409.
   *
   * Промокод, объём, опции и вариант доставки меняются ТОЛЬКО так: сначала `POST /quotes`
   * с новым выбором, потом сюда её `id`. Отдельного поля «промокод» здесь нет намеренно —
   * иначе у денег стало бы два источника правды, и рано или поздно они разошлись бы. */
  quoteId?: string;
  params?: Partial<OrderParams>;
  delivery?: OrderDeliveryInput;
  payer?: OrderPayerInput;
  paymentMethod?: PaymentMethod;
}

/** `POST /orders/{id}/submit` → документы и платёжные инструкции.
 *
 * Все три поля описывают одно и то же состояние; `documents` и `payment` вынесены
 * наверх, потому что после `submit` они гарантированно есть, а в `Order` объявлены
 * как «могут отсутствовать». Экран оплаты читает их отсюда без проверок на `null`. */
export interface SubmitOrderResponse {
  order: Order;
  documents: OrderDocument[];
  payment: PaymentInstructions;
}

/** `POST /orders/{id}/submit` — тело с принятием оферты (DECISIONS.md, п. 12).
 *
 * Время принятия ставит сервер, IP и браузер он берёт из заголовков; браузер сообщает
 * только, какую версию оферты видел человек. Без `offerAccepted: true` — 422
 * `orders/offer-not-accepted` с `errors.offerAccepted` / `errors.offerVersion`. */
export interface SubmitOrderBody {
  offerAccepted: boolean;
  /** Версия текста оферты: «2026-10-01» (латиница, цифры, `.-_`, до 64 символов). */
  offerVersion: string;
}

/** `POST /orders/{id}/cancel` — отмена заказчиком до оплаты (DECISIONS.md, п. 17).
    Ответ — `Order` в статусе `cancelled`. После оплаты — 409 `orders/cancel-after-payment`. */
export interface CancelOrderBody {
  /** Причина — уходит в журнал заказа. */
  reason?: string | null;
}

/* ─────────────────────────────── ошибки ───────────────────────────────

   RFC 7807; `type` — стабильный URI, по нему экран и различает случаи (`title` и
   `detail` — для человека и могут меняться). Полный список кодов домена: */

/** Коды problem+json домена «Заказы». */
export type OrderProblemType =
  /** 409 · котировка истекла — пересчитать и повторить. */
  | "https://partiya.ru/problems/orders/quote-expired"
  /** 409 · цена оффера изменилась: котировка больше не соответствует версии оффера. */
  | "https://partiya.ru/problems/orders/quote-mismatch"
  /** 409 · котировка от другого оффера, чем черновик. */
  | "https://partiya.ru/problems/orders/quote-offer-mismatch"
  /** 409 · заказ уже не черновик: PATCH и загрузка макета запрещены. */
  | "https://partiya.ru/problems/orders/not-draft"
  /** 422 · шаги оформления заполнены не полностью; `errors` — по полям. */
  | "https://partiya.ru/problems/orders/draft-incomplete"
  /** 422 · промокод не найден или не применим к этой партии. */
  | "https://partiya.ru/problems/orders/promo-not-found"
  /** 413 · файл макета больше лимита. */
  | "https://partiya.ru/problems/orders/artwork-too-large"
  /** 415 · неподдерживаемый тип файла макета. */
  | "https://partiya.ru/problems/orders/artwork-unsupported-type"
  /** 409 · файлов уже максимум. */
  | "https://partiya.ru/problems/orders/artwork-limit-reached"
  /** 409 · свободной мощности на выбранную неделю не осталось. */
  | "https://partiya.ru/problems/orders/capacity-unavailable"
  /** 409 · принять можно только заказ в статусе `acceptance`. */
  | "https://partiya.ru/problems/orders/not-in-acceptance"
  /** 409 · окно приёмки закрыто: партия уже принята автоматически. */
  | "https://partiya.ru/problems/orders/acceptance-window-closed"
  /** 409 · по заказу открыт спор — приёмка невозможна до решения. */
  | "https://partiya.ru/problems/orders/dispute-open"
  /** 409 · повторить можно только завершённый заказ. */
  | "https://partiya.ru/problems/orders/repeat-not-allowed"
  /** 409 · предложение снято с публикации — повторить партию нечем. */
  | "https://partiya.ru/problems/orders/offer-unavailable"
  /** 422 · оферта не принята или не указана её версия (п. 12); `errors` — по полям. */
  | "https://partiya.ru/problems/orders/offer-not-accepted"
  /** 409 · деньги уже поступили — отменить можно только через оператора (п. 17). */
  | "https://partiya.ru/problems/orders/cancel-after-payment"
  /** 409 · из этого статуса команда не применима (например, подпись макета не на
      согласовании). */
  | "https://partiya.ru/problems/orders/transition-not-allowed";
