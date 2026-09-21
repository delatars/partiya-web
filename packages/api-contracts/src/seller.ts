import type { OfferBadge, PriceTier } from "./catalog";
import type { Kopecks } from "./common";
import type { OptionPriceUnit } from "./offers";
import type {
  ArtworkUploadRequest,
  ArtworkUploadResponse,
  OrderDelivery,
  OrderDocument,
  OrderParams,
  OrderStatus,
} from "./orders";
import type { OrderStageProgress } from "./tracking";

/* Домен «Кабинет завода» — крейты `orders` (срез завода), `offers`, `samples`,
   `analytics`, `reviews`, `audit` (ARCHITECTURE.md, 8.4, раздел «— завод —»):

     GET  /seller/orders?stage&page&perPage        → очередь заказов завода
     GET  /seller/orders/{id}                      → карточка заказа глазами завода
     POST /seller/orders/{id}/confirm              → подтвердить (Idempotency-Key)
     POST /seller/orders/{id}/decline              → отклонить, деньги возвращаются
     POST /seller/orders/{id}/progress             → {stage, done, total}
     POST /seller/orders/{id}/stage                → шаг автомата
     POST /seller/orders/{id}/photo-report/upload  → presigned-ссылка на фото
     POST /seller/orders/{id}/photo-report         → {fileIds, caption}
     GET/POST/PATCH /seller/offers…                → черновик → модерация → публикация
     GET  /seller/samples   POST /seller/samples/{id}/accept|decline|ship
     GET  /seller/analytics/funnel?period
     GET  /seller/feedback  POST /seller/feedback/questions/{id}/answer
     GET  /seller/audit     POST /seller/audit/request
     GET/PUT /seller/profile
     GET  /seller/finance/payouts | /summary       → уже реализованы бэком

   Правило домена: завод не видит заказ до денег. Черновики и неоплаченные заказы в
   выдачу `/seller/orders` не попадают вовсе — до эскроу заказа для завода не существует.

   Деньги считает сервер: `payout` и `fee` приходят готовыми числами из тех же функций,
   что кладут проводки в ledger. Формулы «минус 8 %» в браузере нет. */

/* ─────────────────────────────── заказы завода ─────────────────────────────── */

/** Ступень заказа в кабинете завода.
 *
 * ⚠ Q-01: в макете у завода четыре вкладки («Новые · В производстве · КК · Выплачено»),
 * и для `shipped`/`acceptance` ячейки нет. Допущение фронта: добавлена пятая ступень
 * `shipped` («Отгружен») — иначе отгруженный заказ исчезает из всех вкладок, а завод
 * не видит, что партия ждёт приёмки. Спор ступени не меняет: он показывается бейджем
 * поверх `shipped` (`SellerOrderListItem.disputeOpen`). */
export type SellerStage = "new" | "in_production" | "quality_control" | "shipped" | "paid_out";

/** Строка очереди заказов завода. */
export interface SellerOrderListItem {
  /** Публичный номер заказа — тот же, что видит заказчик. */
  id: number;
  status: OrderStatus;
  /** Ступень вкладки; `null` — заказ заводу не виден (сюда такие не попадают). */
  sellerStage: SellerStage | null;
  /** «Футболки 1 000 шт». */
  title: string;
  /** «ООО «Кора», Москва». */
  customer: string;
  customerOrgId: string;
  /** Итог заказа, копейки. */
  total: Kopecks;
  /** Комиссия платформы по этому заказу. */
  fee: Kopecks;
  /** Сколько получит завод. */
  payout: Kopecks;
  /** Подпись из макета: «подтвердить до 18:00», «день 6 из 24», «приёмка 23.09». */
  note: string | null;
  /** Дедлайн подтверждения; `null` — заказ уже подтверждён или отклонён. */
  confirmDeadlineAt: string | null;
  /** Плановая отгрузка, ISO `YYYY-MM-DD`. */
  shipDate: string | null;
  /** Готовность партии, % — та же проекция статуса, что у заказчика. */
  progressPct: number;
  /** Непрочитанных сообщений от заказчика. */
  unreadMessages: number;
  /** По заказу открыт спор — бейдж поверх ступени. */
  disputeOpen: boolean;
  /** Сколько условных единиц мощности резервирует заказ (5.3). */
  capacityUnits: number;
  createdAt: string;
  updatedAt: string;
}

/** Счётчики вкладок и KPI сводки — считает сервер по всей выдаче, а не по странице. */
export interface SellerOrderSummary {
  all: number;
  new: number;
  inProduction: number;
  qualityControl: number;
  shipped: number;
  paidOut: number;
  /** Сколько заказов ждут подтверждения прямо сейчас. */
  awaitingConfirmation: number;
  /** Ближайший дедлайн подтверждения; `null` — подтверждать нечего. */
  nearestConfirmDeadlineAt: string | null;
  /** Сумма в эскроу «за вас». */
  escrowHeld: Kopecks;
  /** Начислено и ещё не выплачено. */
  payoutPlanned: Kopecks;
}

export interface SellerOrderList {
  items: SellerOrderListItem[];
  total: number;
  summary: SellerOrderSummary;
}

/** `GET /seller/orders`. */
export interface SellerOrderListQuery {
  /** Вкладка кабинета; пусто — все видимые заводу. */
  stage?: SellerStage;
  page?: number;
  perPage?: number;
}

/** Деньги по заказу глазами завода — блок «Деньги» экрана `seller-order`. */
export interface SellerOrderMoney {
  /** Сумма в эскроу. */
  escrowAmount: Kopecks;
  /** Комиссия платформы. */
  fee: Kopecks;
  /** Ставка комиссии, % — её показывает строка «Комиссия 8 %». */
  feePercent: number;
  /** К выплате заводу. */
  payout: Kopecks;
  /** Когда уйдёт выплата; `null` — пока неизвестно. */
  payoutAt: string | null;
  /** Готовая строка: «в течение 2 раб. дней после приёмки заказчиком». */
  note: string;
  /** Выплата заблокирована спором. */
  blockedByDispute: boolean;
}

/** Заказ глазами завода. Это НЕ `Order` заказчика: реквизитов плательщика, промокода
    и платёжных инструкций здесь нет — заводу они не принадлежат. */
export interface SellerOrder {
  id: number;
  status: OrderStatus;
  sellerStage: SellerStage | null;
  title: string;
  customer: string;
  customerOrgId: string;
  /** Город заказчика отдельной строкой — шапка показывает «ООО «Кора», Москва». */
  customerCity: string | null;
  offerId: number;
  offerTitle: string;
  params: OrderParams;
  delivery: OrderDelivery | null;
  /** Макеты печати: заводу видны имена файлов и статус проверки. */
  artwork: { id: string; fileName: string; status: string; url: string | null }[];
  /** Строки прогресса — их же правит форма «Внести прогресс». */
  progress: OrderStageProgress[];
  /** Документы заказа, доступные заводу (оферта, спецификация, УПД, акт). */
  documents: OrderDocument[];
  money: SellerOrderMoney;
  /** Дедлайн подтверждения, RFC 3339; `null` — подтверждать уже нечего. */
  confirmDeadlineAt: string | null;
  shipDate: string | null;
  /** «день 6 из 18» — сколько дней идёт производство и сколько заложено. */
  productionDay: number | null;
  productionDays: number | null;
  /** Какие команды автомата завод может подать прямо сейчас. Решает сервер. */
  availableCommands: SellerStageCommand[];
  /** Можно ли подтвердить или отклонить заказ. */
  canConfirm: boolean;
  canDecline: boolean;
  /** Когда завод последний раз вносил прогресс; `null` — ни разу. */
  progressUpdatedAt: string | null;
  unreadMessages: number;
  disputeOpen: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Команды автомата, которые подаёт завод (ARCHITECTURE.md, 5.2; бэк уже реализовал
    `POST /seller/orders/{id}/stage`). */
export type SellerStageCommand =
  "start_artwork_review" | "materials_purchased" | "start_quality_control" | "ship";

/** `POST /seller/orders/{id}/decline`. Причина уходит в журнал заказа и заказчику. */
export interface DeclineOrderBody {
  reason?: string | null;
}

/** `POST /seller/orders/{id}/progress` — отчёт о выработке. */
export interface ReportProgressBody {
  /** Код строки внутри заказа: `cut`, `sewn`, `print`, `pack`. */
  stage: string;
  done: number;
  total: number;
}

/** `POST /seller/orders/{id}/stage`. */
export interface AdvanceStageBody {
  command: SellerStageCommand;
}

/** `POST /seller/orders/{id}/photo-report/upload` — presigned-ссылка, как у макета печати. */
export type PhotoReportUploadRequest = ArtworkUploadRequest;
export type PhotoReportUploadResponse = ArtworkUploadResponse;

/** `POST /seller/orders/{id}/photo-report` — публикация фотоотчёта в ленте заказа. */
export interface PhotoReportBody {
  /** `fileId` из ответов на запросы загрузки. Минимум один. */
  fileIds: string[];
  /** Подпись: «Готовые изделия, чёрные. Принт после 26.09». */
  caption?: string | null;
}

/* ─────────────────────────────── предложения (SKU) ─────────────────────────────── */

/** Статус предложения. Имена совпадают с `OfferStatus` бэка. */
export type SellerOfferStatus = "draft" | "moderation" | "published" | "archived";

/** Строка таблицы «Предложения». Метрики считает аналитика, а не браузер. */
export interface SellerOfferListItem {
  id: number;
  title: string;
  status: SellerOfferStatus;
  /** Номер опубликованной версии; у черновика — версия, которая готовится. */
  version: number;
  /** Цена от, копейки; `null` — ступеней ещё нет. */
  priceFrom: Kopecks | null;
  moq: number | null;
  /** Показы в выдаче за 30 дней. */
  impressions: number;
  views: number;
  inCompare: number;
  orders: number;
  /** Конверсия просмотр → заказ, %; `null` — просмотров не было. */
  conversionPct: number | null;
  /** В выдаче (тумблер «В выдаче»). Скрытое предложение остаётся опубликованным. */
  listed: boolean;
  tone: "a" | "b" | "c" | "d" | null;
  badges: OfferBadge[];
  updatedAt: string;
}

export interface SellerOfferList {
  items: SellerOfferListItem[];
  total: number;
  /** Счётчики таб-бара: «Все · 5 · В выдаче · 2 · Скрытые · 1 · На модерации · 1». */
  counts: { all: number; listed: number; hidden: number; moderation: number; draft: number };
  /** Подсказка аналитики — блок под таблицей («420 просмотров, 0 заказов»). */
  hint: SellerOfferHint | null;
}

/** Совет по предложению: сервер сравнивает с медианой категории. */
export interface SellerOfferHint {
  offerId: number;
  title: string;
  text: string;
}

/** Ступень цены в редакторе: то же, что `PriceTier`, но `unitPrice` может быть пустым
    у только что добавленной строки — иначе форма не даёт стереть цифру. */
export interface SellerPriceTierInput {
  fromQty: number;
  unitPrice: Kopecks;
}

/** Опция предложения в редакторе. */
export interface SellerOfferOptionInput {
  /** Код опции; у новой строки его выдаёт сервер при сохранении. */
  id?: string;
  title: string;
  price: Kopecks;
  unit: OptionPriceUnit;
  note?: string | null;
}

/** Значение атрибута категории: одно значение, число или список выбранных. */
export type SellerAttributeValue = string | number | string[];

/** Определение атрибута из схемы категории (`admin-taxonomy`). Форму SKU собирает оно,
    а не редактор: завод не сможет выбрать того, чего в схеме нет (ARCHITECTURE.md, 5.1). */
export interface CategoryAttributeDef {
  key: string;
  label: string;
  /** Как рисовать поле. */
  kind: "select" | "multiselect" | "number" | "text";
  /** Варианты для `select`/`multiselect`. */
  options?: string[];
  required: boolean;
  /** Единица измерения для числа: «г/м²». */
  unit?: string | null;
  /** Где используется — колонка таблицы бэк-офиса. */
  usedIn?: string[];
}

/** Схема категории: атрибуты формы SKU плюс умолчания мощности. */
export interface CategorySchema {
  /** Путь категории: ["tekstil", "futbolki"]. */
  path: string[];
  /** «Текстиль › Футболки». */
  title: string;
  attributes: CategoryAttributeDef[];
  /** Сколько условных единиц мощности «съедает» одно изделие по умолчанию. */
  defaultCapacityUnitsPerItem: number;
  /** Единица измерения партии: «шт». */
  unit: string;
}

/** Фото предложения в редакторе. */
export interface SellerOfferImage {
  id: string;
  label: string;
  tone: "a" | "b" | "c" | "d";
  url?: string | null;
}

/** Версия предложения — неизменяемый снимок (ARCHITECTURE.md, 5.1). */
export interface SellerOfferVersion {
  version: number;
  status: SellerOfferStatus;
  createdAt: string;
  publishedAt: string | null;
  /** Что изменилось относительно предыдущей версии — строки для истории и для модерации. */
  changes: SellerOfferChange[];
  /** Комментарий оператора, если версию вернули на доработку. */
  moderationComment?: string | null;
}

/** Строка диффа версии: поле, было, стало. Её же показывает бэк-офис. */
export interface SellerOfferChange {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
  /** Автофлаг модерации: «фото с чужим логотипом». */
  flag?: string | null;
}

/** Черновик предложения — то, что редактирует форма `seller-offer-edit`. */
export interface SellerOfferDraft {
  /** `null` — предложение ещё не создано. */
  id: number | null;
  status: SellerOfferStatus;
  /** Номер версии, которая правится. */
  version: number;
  title: string;
  categoryPath: string[];
  /** Коэффициент мощности — из категории, завод его не меняет (поле только для чтения). */
  capacityUnitsPerItem: number;
  images: SellerOfferImage[];
  /** Значения атрибутов по схеме категории. */
  attributes: Record<string, SellerAttributeValue>;
  moq: number;
  tiers: SellerPriceTierInput[];
  options: SellerOfferOptionInput[];
  /** Срок производства, рабочие дни. */
  leadDaysMin: number;
  leadDaysMax: number;
  /** Прибавка к сроку за каждую 1 000 шт сверх первой. */
  leadDaysPer1000: number;
  /** Образец: предлагать, цена, срок. */
  sampleAvailable: boolean;
  samplePrice: Kopecks | null;
  sampleDays: number | null;
  /** Вариант доставки предложения. */
  delivery: SellerOfferDeliveryInput[];
  /** Показывать ли предложение в выдаче. */
  listed: boolean;
  updatedAt: string | null;
}

export interface SellerOfferDeliveryInput {
  id: string;
  title: string;
  price: Kopecks;
  days?: number | null;
}

/** Полный ответ редактора: черновик, схема категории и справочные числа. */
export interface SellerOfferEditor {
  draft: SellerOfferDraft;
  schema: CategorySchema;
  /** Доступные категории — выпадающий список «Категория». */
  categories: { path: string[]; title: string }[];
  /** История версий, свежая первой. */
  versions: SellerOfferVersion[];
  /** Медиана цены категории при 1 000 шт — подпись под таблицей ступеней. */
  categoryMedianPrice: Kopecks | null;
  /** Готовность к публикации: чек-лист правой колонки. */
  readiness: { key: string; title: string; state: "done" | "now" | "todo" }[];
  /** Карточка «Как увидит заказчик» — та же, что в каталоге. */
  preview: SellerOfferPreview;
}

/** Предпросмотр карточки: ровно те поля, из которых каталог рисует плитку. */
export interface SellerOfferPreview {
  title: string;
  priceFrom: Kopecks;
  moq: number;
  leadDaysMin: number;
  freeCapacityPct: number;
  sampleAvailable: boolean;
  badges: OfferBadge[];
  tone: "a" | "b" | "c" | "d" | null;
  factoryName: string;
  factoryCity: string;
  rating: number;
  reviews: number;
  tiers: PriceTier[];
}

/** `POST /seller/offers` и `PATCH /seller/offers/{id}` — сохранение черновика.
    Поля необязательны: форма шлёт только то, что изменилось. */
export type SaveSellerOfferBody = Partial<
  Omit<SellerOfferDraft, "id" | "status" | "version" | "updatedAt" | "capacityUnitsPerItem">
>;

/** `POST /seller/offers/{id}/submit` — отправить версию на модерацию. */
export interface SubmitSellerOfferResponse {
  offer: SellerOfferListItem;
  /** Что уйдёт оператору: те же строки диффа. */
  changes: SellerOfferChange[];
  /** Оценка SLA модерации: «до 1 рабочего дня». */
  slaNote: string;
}

/** `POST /seller/offers/{id}/listing` — тумблер «В выдаче». */
export interface SetOfferListedBody {
  listed: boolean;
}

/* ─────────────────────────────── образцы ─────────────────────────────── */

export type SellerSampleStatus = "new" | "in_work" | "shipped" | "delivered" | "declined";

export interface SellerSampleRequest {
  /** «С-218». */
  id: string;
  status: SellerSampleStatus;
  /** «Футболка 180 г/м² × 2 · M, L · белый · тестовая печать». */
  title: string;
  /** «ООО «Кора», Москва». */
  customer: string;
  /** Оплачено заказчиком, копейки. */
  paid: Kopecks;
  /** Готовая подпись: «зачтётся в партию». */
  creditNote: string | null;
  /** Срок изготовления: «Изготовить до 21 сен». */
  dueNote: string | null;
  /** Трек-номер, когда образец отправлен. */
  trackingNumber: string | null;
  /** Заказ, выросший из образца: «Доставлен → заказ № 4771». */
  orderId: number | null;
  tone: "a" | "b" | "c" | "d" | null;
  createdAt: string;
}

export interface SellerSampleList {
  items: SellerSampleRequest[];
  total: number;
  /** Доля получивших образец, оформивших партию, % — подпись из макета. */
  conversionPct: number;
}

/** `POST /seller/samples/{id}/ship`. */
export interface ShipSampleBody {
  trackingNumber: string;
}

/** `POST /seller/samples/{id}/decline`. */
export interface DeclineSampleBody {
  reason?: string | null;
}

/* ─────────────────────────────── аналитика ─────────────────────────────── */

export interface SellerFunnelStep {
  key: string;
  /** «Показы в выдаче», «Просмотры карточек». */
  title: string;
  value: number;
  /** Ширина полосы, 0–100. */
  pct: number;
}

/** `GET /seller/analytics/funnel?period=30d`. */
export interface SellerFunnel {
  period: string;
  steps: SellerFunnelStep[];
  /** Конверсия показ → заказ, %. */
  conversionPct: number;
  /** Просмотры по дням недели — график «Просмотры → заказы, 7 дней». */
  views: { day: string; value: number }[];
}

/** Сводка кабинета завода (`seller-home`) одним запросом: KPI обязаны сходиться. */
export interface SellerDashboard {
  /** «Загрузка · сентябрь». */
  capacity: {
    month: string;
    loadPct: number;
    soldUnits: number;
    totalUnits: number;
    unit: string;
    weeks: { label: string; loadPct: number }[];
  };
  finance: { escrowHeld: Kopecks; paidMonth: Kopecks; nextPayoutAt: string | null };
  /** Позиция в «Популярных» — считает ранжирование. */
  ranking: { position: number; category: string; deltaWeek: number } | null;
  funnel: SellerFunnel;
  /** «Нужно сделать сегодня» — список задач, собранный сервером. */
  todo: SellerTodoItem[];
  /** Заказ, который горит: блок-предупреждение над KPI. */
  urgentOrder: SellerOrderListItem | null;
  /** Блок «Качество работы». */
  quality: { label: string; value: string }[];
  orders: SellerOrderSummary;
}

export interface SellerTodoItem {
  key: string;
  title: string;
  note: string | null;
  href: string;
  /** Горит: кружок с акцентной обводкой. */
  urgent: boolean;
}

/* ─────────────────────────────── отзывы и вопросы ─────────────────────────────── */

export interface SellerQuestion {
  id: number;
  text: string;
  /** К какому предложению задан. */
  offerId: number;
  offerTitle: string;
  askedAt: string;
  /** Ответ завода; `null` — вопрос без ответа. */
  answer: { text: string; answeredAt: string } | null;
}

export interface SellerReview {
  id: number;
  author: string;
  rating: number;
  text: string;
  when: string;
  orderId: number | null;
  /** Публичный ответ завода. */
  reply: { text: string; repliedAt: string } | null;
}

/** `GET /seller/feedback`. */
export interface SellerFeedback {
  questions: SellerQuestion[];
  reviews: SellerReview[];
  /** Средняя оценка завода (байесовская — считает сервер). */
  rating: number;
  reviewCount: number;
  /** Распределение оценок: 5★ → 102. */
  distribution: { rating: number; count: number }[];
  /** Среднее время ответа, минуты — оно видно на витрине. */
  respondsInMinutes: number;
  unansweredQuestions: number;
  /** Шаблоны ответов: «сроки», «Pantone», «образец». */
  templates: { key: string; title: string; text: string }[];
}

/** `POST /seller/feedback/questions/{id}/answer` и `…/reviews/{id}/reply`. */
export interface AnswerBody {
  text: string;
}

/* ─────────────────────────────── аудит ─────────────────────────────── */

export type SellerAuditStatus = "none" | "requested" | "scheduled" | "passed" | "expiring";

export interface SellerAuditCheck {
  key: string;
  /** «Юрлицо и реквизиты». */
  title: string;
  /** «Выписка ЕГРЮЛ, карточка предприятия». */
  basis: string;
  state: "ok" | "work" | "todo";
  /** Дата подтверждения или срок: «12.06.2026», «до 30.10.2026». */
  date: string | null;
  /** Сколько файлов приложено. */
  files: number;
}

/** `GET /seller/audit`. */
export interface SellerAudit {
  status: SellerAuditStatus;
  /** До какой даты действует аудит, ISO `YYYY-MM-DD`; `null` — аудита нет. */
  validUntil: string | null;
  /** Ссылка на отчёт аудитора. */
  reportUrl: string | null;
  checks: SellerAuditCheck[];
  /** Предупреждение: «Сертификат ТР ТС истекает 30 октября». */
  warning: { title: string; text: string } | null;
  /** Когда назначен выезд аудитора. */
  visitAt: string | null;
  auditorName: string | null;
}

/** `POST /seller/audit/request` — заявка на аудит из онбординга и раздела «Аудит». */
export interface RequestAuditBody {
  comment?: string | null;
}

/* ─────────────────────────────── профиль завода ─────────────────────────────── */

/** `GET/PUT /seller/profile` — витрина завода глазами владельца (экран `factory`). */
export interface SellerProfile {
  orgId: string;
  name: string;
  city: string;
  /** Ключ специализации из справочника. */
  specialization: string;
  about: string | null;
  since: number | null;
  workers: number | null;
  /** Мощность, условных единиц в месяц. */
  capacityPerMonth: number | null;
  /** Оборудование списком — блок витрины. */
  equipment: string[];
  /** Подписи заглушек фото цеха. */
  gallery: { label: string; tone: "a" | "b" | "c" | "d" }[];
  rating: number;
  reviews: number;
  completedOrders: number;
  onTimePct: number | null;
  auditedAt: string | null;
  /** Реквизиты для выплат — их показывает раздел «Финансы». */
  payoutAccount: string | null;
}

export type UpdateSellerProfileBody = Partial<
  Pick<
    SellerProfile,
    "name" | "city" | "specialization" | "about" | "since" | "workers" | "equipment"
  >
>;

/* ─────────────────────────────── онбординг завода ─────────────────────────────── */

/** Черновик мастера подключения (Q-111: раньше жил в `sessionStorage`).
 *
 * Мастер длинный, его бросают и возвращаются через день — черновик обязан жить
 * на сервере, как и черновик оформления (ARCHITECTURE.md, 7.6). */
export interface FactoryOnboardingDraft {
  /** На каком шаге остановились, с 1. */
  step: number;
  /** Профиль производства. */
  specialization: string | null;
  city: string | null;
  workers: number | null;
  equipment: string[];
  /** Мощность в условных единицах на месяц. */
  capacityPerMonth: number | null;
  /** Коэффициенты изделий: ключ → единиц на изделие. */
  itemCoefficients: Record<string, number>;
  /** Первое предложение: черновик SKU, если он уже заведён. */
  firstOfferId: number | null;
  /** Заявка на аудит отправлена. */
  auditRequested: boolean;
  /** Мастер завершён — кабинет открыт целиком. */
  completed: boolean;
  updatedAt: string | null;
}

/** `PATCH /seller/onboarding` — частичное сохранение шага. */
export type SaveFactoryOnboardingBody = Partial<Omit<FactoryOnboardingDraft, "updatedAt">>;

/* ─────────────────────────────── финансы ─────────────────────────────── */

/* Ниже — типы уже реализованных бэком эндпоинтов. Имена и поля скопированы из
   `docs/openapi.json` один в один, менять их нельзя. */

/** Статус сделки (`DealStatusName` openapi). */
export type DealStatusName =
  | "awaiting_funds"
  | "partially_funded"
  | "funded"
  | "released"
  | "refunded"
  | "partially_refunded"
  | "cancelled";

/** Статус счёта по сделке (`TrancheStatusName` openapi). */
export type TrancheStatusName = "awaiting_funds" | "held" | "released" | "refunded" | "cancelled";

/** Строка таблицы «Выплаты» (`SellerPayout` openapi). */
export interface SellerPayout {
  dealId: string;
  dealNo: number;
  subjectId: string;
  customerOrgId: string;
  amount: Kopecks;
  feeAmount: Kopecks;
  payoutAmount: Kopecks;
  status: DealStatusName;
  statusTitle: string;
  createdAt: string;
  updatedAt: string;
  /* ── расширения фронта: необязательные, бэк их пока не присылает ── */
  /** Публичный номер заказа — по нему строка кликается в заказ (Q-S3). */
  orderId?: number;
  /** «Футболки 500 шт» — заголовок заказа. */
  orderTitle?: string;
  /** «ИП Лебедева» — название организации заказчика. */
  customerName?: string;
  /** Документ УПД по заказу. */
  updDocumentId?: string;
}

/** `GET /seller/finance/payouts` (`SellerPayoutsPage` openapi). */
export interface SellerPayoutsPage {
  items: SellerPayout[];
  nextCursor: string | null;
}

/** `GET /seller/finance/summary` (`SellerFinanceSummary` openapi). */
export interface SellerFinanceSummary {
  escrowHeld: Kopecks;
  payable: Kopecks;
  paidTotal: Kopecks;
  feeWithheld: Kopecks;
  feePercent: number;
  /* ── расширения фронта ── */
  /** Ближайшая выплата и её дата — KPI «Ближайшая выплата 132 480 ₽ · 23.09». */
  nextPayoutAmount?: Kopecks;
  nextPayoutAt?: string | null;
  /** Счёт для выплат: «ООО «Волна» · р/с …8820». */
  payoutAccount?: string | null;
  /** Активные резервы в эскроу — правая колонка экрана «Финансы». */
  escrowOrders?: { orderId: number; title: string; amount: Kopecks; note: string }[];
}

/* ─────────────────────────────── ошибки ─────────────────────────────── */

/** Коды problem+json кабинета завода. */
export type SellerProblemType =
  /** 403 · организация вошедшего — не завод. */
  | "https://partiya.ru/problems/seller/not-a-factory"
  /** 404 · заказа нет или он чужой (эти случаи снаружи неразличимы). */
  | "https://partiya.ru/problems/seller/order-not-found"
  /** 409 · из этого статуса переход не применим. */
  | "https://partiya.ru/problems/seller/transition-not-allowed"
  /** 409 · срок подтверждения истёк, заказ отменён платформой. */
  | "https://partiya.ru/problems/seller/confirm-deadline-passed"
  /** 422 · прогресс больше объёма партии или отрицателен. */
  | "https://partiya.ru/problems/seller/invalid-progress"
  /** 422 · предложение не проходит валидацию ступеней (`errors` по полям). */
  | "https://partiya.ru/problems/seller/invalid-offer"
  /** 409 · предложение уже на модерации: второй раз отправить нельзя. */
  | "https://partiya.ru/problems/seller/offer-in-moderation"
  /** 409 · мощности на выбранные недели не хватает. */
  | "https://partiya.ru/problems/seller/capacity-exceeded";
