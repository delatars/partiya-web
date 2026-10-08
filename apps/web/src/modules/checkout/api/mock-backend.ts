import type {
  AcceptOrderBody,
  ArtworkUploadRequest,
  ArtworkUploadResponse,
  CancelOrderBody,
  CreateOrderDraftBody,
  CreateSampleBody,
  Dispute,
  Me,
  NotificationSettings,
  OfferDetail,
  Order,
  OrderArtwork,
  OrderDocument,
  OrderEvent,
  OrderList,
  OrderListItem,
  OrderListQuery,
  PaymentInstructions,
  PaymentMethodOption,
  Quote,
  RepeatOrderResponse,
  SampleList,
  SampleOptions,
  SampleOrder,
  SubmitOrderBody,
  SubmitOrderResponse,
  UpdateOrderDraftBody,
  UserCounters,
} from "@partiya/api-contracts";

import { ApiError } from "@/shared/api";
import { addWorkingDays, toIsoDate } from "@/shared/lib/dates";
import { DEMO_ORG_IDS, DEMO_ORG_LEGAL_ADDRESS, factoryOrgIdOf, isDemoOrg } from "@/shared/lib/demo";
import { customerStageOf, orderBucketOf, orderProgressPct } from "@/shared/lib/order-status";
import { decodeQuoteId, QUOTE_TTL_DAYS } from "@/shared/lib/quote-id";
import {
  FIRST_MOCK_ORDER_NO,
  FIRST_MOCK_SAMPLE_NO,
  mockQuote,
  requireMockOffer,
  resetSellerOffers,
} from "@/shared/mocks";

import { ARTWORK_LIMITS, isAllowedArtworkType } from "../lib/artwork";
import { sampleOptionsFor } from "../lib/sample-options";
import {
  type BackofficeStore,
  createBackofficeSlice,
  type MockBackofficeSlice,
} from "./mock-backoffice";
import {
  acceptanceOf,
  escrowNoteOf,
  escrowStatusOf,
  firstTrancheAmount,
  invoiceNumberOf,
  isSplitPayment,
  orderFeeOf,
  paymentPurpose,
  signArtwork,
  trackingOf,
} from "./mock-projections";
import {
  defaultParams,
  messagesOf,
  type MockOrder,
  type NewOrderEvent,
  seedDemoOrders,
} from "./mock-seed";
import { createSellerSlice, type MockSellerSlice, type SellerStore } from "./mock-seller";
import { seedFactoryOrders } from "./mock-seller-seed";
import { createTrackingSlice, type MockTrackingSlice, type TrackingContext } from "./mock-tracking";

/* Мок крейтов `orders` и `samples`: тот же контракт, те же статусы, те же тексты ошибок.

   Ценность мока ровно в этом. Если экран оформления правильно ведёт себя здесь —
   с 409 на истёкшую котировку, 422 с разбором по полям и идемпотентным submit, — он
   поведёт себя правильно и с настоящим бэком. Поэтому «всегда успех» тут нет нигде.

   Три вещи, которые мок воспроизводит всерьёз:

   * Черновик живёт на сервере (ARCHITECTURE.md, 7.6). Состояние — в sessionStorage,
     поэтому закрытая вкладка не теряет оформление, а приватный режим и запрет
     хранилища не ломают экран: каждое обращение обёрнуто.
   * Деньги считает только котировка. Объём, опции, доставка и промокод меняются
     через `POST /quotes` и приезжают сюда как `quoteId` — своей арифметики у заказа нет.
   * `Idempotency-Key` работает: повторный submit с тем же ключом возвращает первый
     ответ, а не заводит второй заказ (ARCHITECTURE.md, 8.4).

   Кто сейчас вошёл, мок узнаёт у соседнего мока входа — через `getMe` внутреннего
   сервиса. Прямой импорт `modules/auth` запрещён правилами слоёв, и это правильно:
   домен заказов не должен знать, как устроен домен входа. */

/* v4: оферта в submit, двойная подпись макета, трек-номер, второй транш 50/50 по событию. */
const STORAGE_KEY = "partiya.mock.orders.v4";

/** Счёт живёт 48 часов — «мощность зарезервирована за вами на 48 часов» из макета. */
const INVOICE_TTL_MS = 48 * 60 * 60_000;

/** Реквизиты номинального счёта платформы. Демо-данные: настоящих нет и быть не может
    до выбора банка-партнёра (ARCHITECTURE.md, 5.4 — «⚠ проверить»). */
const PLATFORM_PAYEE = {
  name: "ООО «Партия» · номинальный счёт",
  inn: "7700000000",
  kpp: "770001001",
  bank: "банк-партнёр платформы",
  bik: "044525999",
  correspondentAccount: "30101810400000000999",
} as const;

interface MockSample extends SampleOrder {
  orgId: string;
}

interface MockUpload {
  fileId: string;
  orderId: number | null;
  fileName: string;
  contentType: string;
  size: number;
  expiresAtMs: number;
}

export interface MockState {
  orders: MockOrder[];
  samples: MockSample[];
  uploads: MockUpload[];
  /** `Idempotency-Key` → сохранённый ответ, как в таблице ключей бэка. */
  idempotency: Record<string, { kind: string; orderId: number }>;
  orderSeq: number;
  sampleSeq: number;
  /** Журналы заказов: номер заказа → события по возрастанию `seq` (append-only). */
  events: Record<string, OrderEvent[]>;
  /** Споры по заказам: номер заказа → спор. */
  disputes: Record<string, Dispute>;
  /** До какого `seq` заказчик прочитал ветку: `<orderId>:<channel>` → seq. */
  readCursors: Record<string, number>;
  /** Прочитанные уведомления: лента выводится из журналов, а прочитанность — своя. */
  readNotifications: string[];
  notificationSettings: NotificationSettings | null;
  /** Организации, которым уже разложена демо-история: второй раз её класть нельзя. */
  seededOrgs: string[];
  /** Заводские фикстуры (очередь заказов «Волны») уже разложены. */
  factorySeeded?: boolean;
  /** Кабинет завода: план мощности, образцы, отзывы, аудит, профиль, онбординг. */
  seller?: Record<string, SellerStore>;
  /** Справочники бэк-офиса: очередь заводов, таксономия, веса ранжирования. */
  backoffice?: BackofficeStore;
}

export interface MockOrdersOptions {
  now?: () => number;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  latencyMs?: number;
  /** Кто вошёл. Бросает 401 у анонима — ровно как `GET /me`. */
  getMe: () => Promise<Me>;
}

/* ─────────────────────────────── ошибки как у бэка ─────────────────────────────── */

function problem(
  status: number,
  type: string,
  title: string,
  detail?: string,
  errors?: Record<string, string[]>,
): ApiError {
  return new ApiError({
    status,
    message: detail ?? title,
    problem: { type, title, status, detail, errors },
  });
}

const P = "https://partiya.ru/problems/orders";

const badRequest = (detail: string) =>
  problem(400, "/problems/bad-request", "Некорректный запрос", detail);
const forbidden = (detail: string) => problem(403, "/problems/forbidden", "Нет доступа", detail);
const notFound = (detail: string) => problem(404, "/problems/not-found", "Не найдено", detail);

const quoteExpired = () =>
  problem(
    409,
    `${P}/quote-expired`,
    "Расчёт партии устарел",
    "Цена действовала ограниченное время. Пересчитайте партию — параметры сохранятся.",
  );

/** Проверка тела `submit` — `OfferConsent::parse` бэка: галочка и версия оферты
    (до 64 символов, латиница, цифры, «.», «-», «_»). Пустой объект — всё в порядке. */
function offerConsentErrors(body: Partial<SubmitOrderBody> | undefined): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (body?.offerAccepted !== true) errors.offerAccepted = ["Примите условия оферты"];
  const version = body?.offerVersion?.trim() ?? "";
  if (version.length === 0) {
    errors.offerVersion = ["Не указана версия оферты"];
  } else if (version.length > 64 || !/^[A-Za-z0-9._-]+$/u.test(version)) {
    errors.offerVersion = ["Версия оферты — до 64 символов: латиница, цифры, «.», «-», «_»"];
  }
  return errors;
}

const notDraft = () =>
  problem(
    409,
    `${P}/not-draft`,
    "Заказ уже оформлен",
    "Менять можно только черновик: оформленный заказ правится через фабрику.",
  );

const draftIncomplete = (errors: Record<string, string[]>) =>
  problem(
    422,
    `${P}/draft-incomplete`,
    "Оформление не закончено",
    "Заполните оставшиеся шаги — мы подсветили их в списке.",
    errors,
  );

const invalidDraft = (errors: Record<string, string[]>) =>
  problem(422, `${P}/draft-incomplete`, "Проверьте параметры партии", undefined, errors);

/* ─────────────────────────────── вспомогательное ─────────────────────────────── */

function seedState(): MockState {
  return {
    orders: [],
    samples: [],
    uploads: [],
    idempotency: {},
    // последовательность хранит ВЫДАННЫЙ номер, поэтому стартует на шаг раньше первого
    orderSeq: FIRST_MOCK_ORDER_NO - 1,
    sampleSeq: FIRST_MOCK_SAMPLE_NO - 1,
    events: {},
    disputes: {},
    readCursors: {},
    readNotifications: [],
    notificationSettings: null,
    seededOrgs: [],
  };
}

/** Вид доставки по коду варианта оффера: адрес нужен только там, где его некому знать. */
function deliveryKindOf(optionId: string): "marketplace_warehouse" | "address" | "pickup" {
  if (optionId === "pickup") return "pickup";
  if (optionId === "address") return "address";
  return "marketplace_warehouse";
}

/** Адрес склада маркетплейса известен платформе — человек его не вводит. */
function defaultDeliveryAddress(optionId: string): string | null {
  if (optionId === "wb") return "Коледино, Московская обл., склад WB";
  if (optionId === "pickup") return null;
  return null;
}

function paymentOptionsFor(quote: Quote, factoryRating: number): PaymentMethodOption[] {
  const splitAvailable = factoryRating >= 4.7;
  return [
    {
      method: "escrow_full",
      title: "Эскроу 100 %",
      description: "Сумма резервируется платформой, фабрика получает после вашей приёмки.",
      available: true,
      unavailableReason: null,
      amountDue: quote.total,
    },
    {
      method: "escrow_split_50_50",
      title: "Эскроу 50 / 50",
      // DECISIONS.md, п. 4: второй транш — по событию «готов к отгрузке», не после приёмки
      description:
        "Половина при запуске, половина — когда партия готова к отгрузке. Для фабрик с рейтингом 4,7+.",
      available: splitAvailable,
      unavailableReason: splitAvailable ? null : "рейтинг фабрики ниже 4,7",
      // делим пополам вверх: недоплаченной копейки в эскроу быть не должно
      amountDue: firstTrancheAmount(quote.total),
    },
  ];
}

/** Краткая спецификация для раздела «Повторные партии»: цвета, размеры, нанесение. */
function specOf(order: MockOrder): string {
  const colors = order.params.colors.map((line) => `${line.color} ${String(line.qty)}`).join(" · ");
  const sizes = order.params.sizes.map((line) => line.size).join("–");
  return [colors, sizes, order.params.print].filter(Boolean).join(", ");
}

function toListItem(
  order: MockOrder,
  extra: {
    unreadMessages: number;
    acceptanceDueAt: string | null;
    disputeOpen: boolean;
    repeatCount: number;
    freeCapacityPct: number | undefined;
  },
): OrderListItem {
  return {
    id: order.id,
    status: order.status,
    customerStage: order.customerStage,
    bucket: order.bucket,
    title: `${order.offer.title}, ${String(order.params.qty)} шт`,
    factory: `${order.offer.factoryName}, ${order.offer.factoryCity}`,
    offerId: order.offer.id,
    total: order.quote.total,
    progressPct: orderProgressPct(order.status),
    shipDate: order.shipDate,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    unreadMessages: extra.unreadMessages,
    acceptanceDueAt: extra.acceptanceDueAt,
    disputeOpen: extra.disputeOpen,
    qty: order.params.qty,
    unitPrice: order.quote.unitPrice,
    spec: specOf(order),
    repeatDiscountPercent: order.repeatDiscountPercent ?? undefined,
    repeatCount: extra.repeatCount,
    freeCapacityPct: extra.freeCapacityPct,
  };
}

/** Свободная мощность фабрики предложения, % — строка «свободно в октябре 38 %». */
function offerFreeCapacity(offerId: number): number | undefined {
  try {
    return requireMockOffer(offerId).freeCapacityPct;
  } catch {
    // предложение сняли с публикации — повторить партию уже нельзя, и это честно видно
    return undefined;
  }
}

/** Четыре KPI кабинета. Считаются по всей выдаче, а не по странице: «в эскроу» обязано
    сходиться с разделом «Эскроу и счета». */
function summaryOf(orders: readonly MockOrder[], items: readonly OrderListItem[]) {
  const active = items.filter((item) => item.bucket !== "done" && item.bucket !== "cancelled");
  const shipDates = active
    .map((item) => item.shipDate)
    .filter((date) => date !== null)
    .sort();
  const escrowTotal = orders
    .filter((order) => order.paidAt !== null && order.status !== "completed")
    .reduce((sum, order) => sum + order.quote.total, 0);
  const repeats = orders.filter((order) => order.repeat && order.status !== "draft");
  const savedOnRepeats = repeats.reduce((sum, order) => {
    const line = order.quote.lines.find((item) => item.kind === "repeat_discount");
    return sum + (line ? -line.amount : 0);
  }, 0);

  return {
    active: active.length,
    escrowTotal,
    nearestShipDate: shipDates[0] ?? null,
    savedOnRepeats,
    repeatOrders: repeats.length,
  };
}

/** Наружу уходит контрактный `Order` — владельца заказа снаружи знать незачем. */
function stripOwner(order: MockOrder): Order {
  const rest: Partial<MockOrder> = { ...order };
  delete rest.orgId;
  // внутренние отметки мока: заказчику их не показывают (у бэка их нет в `Order`)
  delete rest.payoutAt;
  delete rest.secondTrancheDueAt;
  delete rest.secondTranchePaidAt;
  delete rest.secondTrancheExtensions;
  delete rest.secondTrancheOverdueSince;
  delete rest.secondTrancheCancelledAt;
  delete rest.secondTrancheHistory;
  delete rest.cancelReason;
  return rest as Order;
}

function documentsFor(id: number, now: Date, split = false): OrderDocument[] {
  const createdAt = now.toISOString();
  const invoice = invoiceNumberOf(id, split ? 1 : undefined);
  return [
    {
      id: `doc-offer-${String(id)}`,
      kind: "offer_contract",
      title: `Договор-оферта № ${String(id)}`,
      url: `#/documents/${String(id)}/offer.pdf`,
      signature: "edo_pending",
      createdAt,
    },
    {
      id: `doc-spec-${String(id)}`,
      kind: "specification",
      title: `Спецификация ${String(id)}-С`,
      url: `#/documents/${String(id)}/spec.pdf`,
      signature: "edo_pending",
      createdAt,
    },
    {
      id: `doc-invoice-${String(id)}`,
      kind: "invoice",
      title: `Счёт ${invoice}`,
      url: `#/documents/${String(id)}/invoice.pdf`,
      signature: "none",
      createdAt,
    },
  ];
}

function paymentFor(order: MockOrder, nowMs: number): PaymentInstructions {
  const no = String(order.id);
  const option = order.paymentOptions.find((item) => item.method === order.paymentMethod);
  return {
    // номер счёта выдаёт `payments`: разовая оплата — `N-СЧ`, 50/50 — `N-1-СЧ` / `N-2-СЧ`
    invoiceNumber: invoiceNumberOf(order.id, isSplitPayment(order) ? 1 : undefined),
    payeeName: PLATFORM_PAYEE.name,
    payeeInn: PLATFORM_PAYEE.inn,
    payeeKpp: PLATFORM_PAYEE.kpp,
    bankName: PLATFORM_PAYEE.bank,
    bik: PLATFORM_PAYEE.bik,
    // расчётный счёт заканчивается номером заказа — по нему и сопоставляется поступление
    account: `407028100000${no.padStart(8, "0")}`,
    correspondentAccount: PLATFORM_PAYEE.correspondentAccount,
    // п. 6: номер заказа в назначении; у 50/50 — «платёж 1 из 2» (Q-345: номер счёта один)
    purpose: paymentPurpose(order.id, isSplitPayment(order) ? { no: 1, of: 2 } : undefined),
    amount: order.quote.total,
    amountDue: option?.amountDue ?? order.quote.total,
    dueAt: new Date(nowMs + INVOICE_TTL_MS).toISOString(),
  };
}

/** «до 18:00 следующего рабочего дня» из макета — дедлайн подтверждения фабрикой. */
function confirmDeadline(nowMs: number): string {
  const day = addWorkingDays(new Date(nowMs), 1);
  day.setHours(18, 0, 0, 0);
  return day.toISOString();
}

/* ─────────────────────────────── сам мок ─────────────────────────────── */

export interface MockOrdersBackend extends MockTrackingSlice, MockSellerSlice, MockBackofficeSlice {
  createOrderDraft(body: CreateOrderDraftBody, idempotencyKey: string): Promise<Order>;
  getOrder(id: number): Promise<Order>;
  listOrders(query?: OrderListQuery): Promise<OrderList>;
  updateOrderDraft(id: number, body: UpdateOrderDraftBody): Promise<Order>;
  requestArtworkUpload(id: number, body: ArtworkUploadRequest): Promise<ArtworkUploadResponse>;
  completeArtworkUpload(id: number, fileId: string): Promise<OrderArtwork>;
  deleteArtwork(id: number, fileId: string): Promise<void>;
  submitOrder(
    id: number,
    body: SubmitOrderBody,
    idempotencyKey: string,
  ): Promise<SubmitOrderResponse>;
  cancelOrder(id: number, body: CancelOrderBody): Promise<Order>;
  getSampleOptions(offerId: number): Promise<SampleOptions>;
  requestSampleArtworkUpload(body: ArtworkUploadRequest): Promise<ArtworkUploadResponse>;
  createSample(body: CreateSampleBody, idempotencyKey: string): Promise<SampleOrder>;
  listSamples(): Promise<SampleList>;
  approveArtwork(id: number): Promise<Order>;
  acceptOrder(id: number, body: AcceptOrderBody, idempotencyKey: string): Promise<Order>;
  repeatOrder(id: number, idempotencyKey: string): Promise<RepeatOrderResponse>;
  /** Только моки: «Я оплатил (демо)» — банк прислал бы webhook, здесь его нажимает человек. */
  markPaid(id: number): Promise<Order>;
  /** Только для тестов и дев-инструментов. */
  reset(): void;
}

export function createMockOrdersBackend(options: MockOrdersOptions): MockOrdersBackend {
  const now = options.now ?? (() => Date.now());
  const storage = options.storage === undefined ? safeSessionStorage() : options.storage;
  const latencyMs = options.latencyMs ?? LATENCY_MS;
  const { getMe } = options;

  let state = load() ?? seedState();

  /* Заводские фикстуры раскладывает `ensureFactorySeed`, объявленный ниже; ссылка нужна,
     потому что `requireCustomerOrg` определён раньше него. */
  const ensureFactorySeedRef: { current: (() => void) | null } = { current: null };

  function load(): MockState | null {
    if (!storage) return null;
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      const parsed = JSON.parse(raw) as MockState;
      // загрузка, прерванная перезагрузкой страницы, не возобновится сама
      for (const order of parsed.orders) {
        for (const file of order.artwork) {
          if (file.status === "uploading") {
            file.status = "failed";
            file.error = "Загрузка прервана — повторите";
          }
        }
      }
      return parsed;
    } catch {
      // приватная вкладка, запрет хранилища, чужой формат — начинаем заново
      return null;
    }
  }

  function save(): void {
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* хранилище недоступно — мок продолжает работать в памяти */
    }
  }

  /** История демо-компании раскладывается лениво: до входа неизвестно, чья она.
      Второй раз не кладётся — признак организации живёт в том же хранилище. */
  function ensureSeeded(orgId: string): void {
    if (!isDemoOrg(orgId) || state.seededOrgs.includes(orgId)) return;
    const seeded = seedDemoOrders(orgId, DEMO_ORG_LEGAL_ADDRESS[orgId] ?? null, now());
    state.orders.push(...seeded.orders);
    Object.assign(state.events, seeded.events);
    state.seededOrgs.push(orgId);
    // чат заказа 4812 в макете открыт с непрочитанным сообщением технолога — оставляем как есть
    save();
  }

  /** Активная организация-заказчик. 401 бросает сам `getMe`, как настоящий `/me`. */
  async function requireCustomerOrg(): Promise<{ me: Me; orgId: string }> {
    const me = await getMe();
    const active = me.organizations.find((org) => org.id === me.activeOrgId);
    if (!active) throw forbidden("Выберите организацию, от имени которой оформляете партию");
    if (active.kind !== "customer") {
      throw forbidden("Оформить партию может только организация-заказчик");
    }
    ensureSeeded(active.id);
    // заказ 4811 «Коры» лежит в заводских фикстурах: хранилище одно на три роли
    ensureFactorySeedRef.current?.();
    return { me, orgId: active.id };
  }

  /* ───────── журнал заказа: единственное место, где он пополняется ─────────

     Всё, что меняет заказ после оплаты, обязано оставить событие: из журнала считаются
     и лента, и прогресс, и фотоотчёты, и сводка шапки. Поэтому `append` возвращает
     записанное событие — вызывающий отдаёт его подписчикам канала. */

  function journal(orderId: number): OrderEvent[] {
    return (state.events[String(orderId)] ??= []);
  }

  function append(orderId: number, event: NewOrderEvent): OrderEvent {
    const events = journal(orderId);
    const seq = (events.at(-1)?.seq ?? 0) + 1;
    const stored = { ...event, seq } as OrderEvent;
    events.push(stored);
    const order = state.orders.find((row) => row.id === orderId);
    if (order) order.updatedAt = stored.occurredAt;
    return stored;
  }

  /** Непрочитанных сообщений ветки: всё чужое новее курсора прочтения. */
  function unreadOf(orderId: number, channel = "order"): number {
    const cursor = state.readCursors[`${String(orderId)}:${channel}`] ?? 0;
    return messagesOf(journal(orderId), channel).filter(
      (message) => !message.own && message.seq > cursor,
    ).length;
  }

  /** Открытый спор заказа: отозванный и решённый уже ничего не блокируют. */
  function openDisputeOf(orderId: number): Dispute | null {
    const dispute = state.disputes[String(orderId)];
    if (!dispute) return null;
    return dispute.status === "resolved" || dispute.status === "withdrawn" ? null : dispute;
  }

  /** Контрактный заказ со всеми проекциями: трекинг, эскроу, приёмка, спор.
   *
   * Собирается здесь, а не в отдельном эндпоинте, потому что так же устроен контракт:
   * `Order.tracking`, `Order.escrow` и `Order.acceptance` — поля заказа (см. orders.ts). */
  function publicOrder(order: MockOrder): Order {
    const base = stripOwner(order);
    const events = journal(order.id);
    const dispute = state.disputes[String(order.id)];
    const open = openDisputeOf(order.id);
    const paid = order.paidAt !== null;
    const escrowStatus = escrowStatusOf(order.status, open !== null);
    const total = order.quote.total;
    const acceptance = acceptanceOf(base, events, now());

    return {
      ...base,
      // п. 16: подписи сторон под макетом; п. 13: трек-номер; п. 17: отмена до оплаты
      artworkSignoff: order.artworkSignoff ?? { customerApprovedAt: null, factoryApprovedAt: null },
      trackingNumber: order.trackingNumber ?? null,
      canCancel: order.status === "draft" || order.status === "awaiting_payment",
      unreadMessages: unreadOf(order.id),
      tracking: paid ? trackingOf(order, events, unreadOf(order.id)) : null,
      escrow: paid
        ? {
            dealId: `deal-${String(order.id)}`,
            status: escrowStatus,
            amount: total,
            heldAmount:
              escrowStatus === "held" || escrowStatus === "blocked"
                ? isSplitPayment(order)
                  ? firstTrancheAmount(total) +
                    (order.secondTranchePaidAt != null ? total - firstTrancheAmount(total) : 0)
                  : total
                : 0,
            note: escrowNoteOf(escrowStatus),
            autoReleaseAt: acceptance?.autoAcceptAt ?? null,
            method: order.paymentMethod ?? "escrow_full",
          }
        : null,
      acceptance,
      dispute: dispute
        ? {
            id: dispute.id,
            status: dispute.status,
            reasonTitle: dispute.reasonTitle,
            openedAt: dispute.openedAt,
            decisionDueAt: dispute.decisionDueAt,
            escrowBlocked: dispute.escrowBlocked,
          }
        : null,
    };
  }

  async function requireOwnOrder(id: number): Promise<MockOrder> {
    const { orgId } = await requireCustomerOrg();
    const order = state.orders.find((row) => row.id === id && row.orgId === orgId);
    // чужой заказ неотличим от несуществующего
    if (!order) throw notFound(`Заказ № ${String(id)}`);
    return order;
  }

  /** Участник заказа: заказчик, завод или оператор платформы.
   *
   * Журнал, чат и вложения принадлежат сделке, а не одной её стороне: у бэка доступ к
   * `/orders/{id}/events` и `/orders/{id}/messages` проверяется участием в заказе
   * (ARCHITECTURE.md, раздел 9 — оператор обязан видеть переписку рядом с журналом).
   * Поэтому здесь отдельная проверка, а не `requireOwnOrder`: иначе завод не смог бы
   * ответить заказчику в чате собственного заказа. */
  async function requireParticipant(
    id: number,
  ): Promise<{ order: MockOrder; side: "customer" | "factory" | "operator" }> {
    const me = await getMe();
    const active = me.organizations.find((org) => org.id === me.activeOrgId);
    const operator = (me as Me & { platformOperator?: boolean }).platformOperator === true;
    if (active?.kind === "customer") ensureSeeded(active.id);
    ensureFactorySeedRef.current?.();

    const order = state.orders.find((row) => row.id === id);
    if (!order) throw notFound(`Заказ № ${String(id)}`);
    if (operator) return { order, side: "operator" };
    if (active?.kind === "customer" && order.orgId === active.id) {
      return { order, side: "customer" };
    }
    if (active?.kind === "factory" && factoryOrgIdOf(order.offer.factoryId) === active.id) {
      return { order, side: "factory" };
    }
    throw notFound(`Заказ № ${String(id)}`);
  }

  /** Непрочитанных сообщений для конкретной стороны. Курсоры у сторон разные: то, что
      завод уже прочитал, заказчику ничего не говорит. */
  function unreadFor(
    orderId: number,
    side: "customer" | "factory" | "operator",
    channel = "order",
  ): number {
    const own =
      side === "customer"
        ? `${String(orderId)}:${channel}`
        : `${String(orderId)}:${channel}:${side}`;
    const cursor = state.readCursors[own] ?? 0;
    return messagesOf(journal(orderId), channel).filter(
      (message) => message.author.kind !== side && message.seq > cursor,
    ).length;
  }

  /** Котировка по её id: мок восстанавливает вход из самого id (shared/lib/quote-id.ts). */
  function quoteFromId(quoteId: string): { quote: Quote; offer: OfferDetail } {
    const decoded = decodeQuoteId(quoteId);
    if (!decoded) throw badRequest("Расчёт партии не найден — пересчитайте партию");
    if (now() >= decoded.expiresAtMs) throw quoteExpired();
    const offer = requireMockOffer(decoded.request.offerId);
    // считаем на момент выдачи: иначе сдвинулась бы дата отгрузки в уже показанном расчёте
    return { quote: mockQuote(decoded.request, decoded.issuedAtMs), offer };
  }

  function touch(order: MockOrder): void {
    order.updatedAt = new Date(now()).toISOString();
    order.bucket = orderBucketOf(order.status);
    order.customerStage = customerStageOf(order.status);
  }

  /** Заново привязывает заказ к котировке: объём, опции, промокод, доставка, срок. */
  function applyQuote(order: MockOrder, quoteId: string, offer: OfferDetail, quote: Quote): void {
    const decoded = decodeQuoteId(quoteId);
    const request = decoded?.request;
    order.quoteId = quoteId;
    order.quote = quote;
    order.quoteValidUntil = quote.validUntil ?? null;
    order.shipDate = quote.shipDate ?? null;
    order.repeat = request?.repeat === true;
    order.params.qty =
      quote.lines.length > 0 ? (request?.qty ?? order.params.qty) : order.params.qty;
    order.params.optionIds = request?.optionIds ?? order.params.optionIds;

    const promoLine = quote.lines.find((line) => line.kind === "promo");
    order.promo =
      promoLine && request?.promo !== undefined
        ? { code: request.promo, title: promoLine.title, discount: -promoLine.amount }
        : null;

    // разбивку по цветам и размерам пересчитываем под новый объём — суммы обязаны сойтись
    const fresh = defaultParams(order.params.qty, order.params.optionIds);
    if (sumOf(order.params.colors) !== order.params.qty) order.params.colors = fresh.colors;
    if (sumOf(order.params.sizes) !== order.params.qty) order.params.sizes = fresh.sizes;

    const optionId = request?.deliveryId;
    if (optionId !== undefined) {
      const option = offer.delivery.find((item) => item.id === optionId);
      if (option) {
        order.delivery = {
          optionId: option.id,
          title: option.title,
          price: option.price,
          kind: deliveryKindOf(option.id),
          address: order.delivery?.address ?? defaultDeliveryAddress(option.id),
          recipientName: order.delivery?.recipientName ?? null,
          recipientPhone: order.delivery?.recipientPhone ?? null,
          comment: order.delivery?.comment ?? null,
        };
        // адрес склада подставляем заново: у каждого варианта он свой
        if (option.id !== "address") order.delivery.address = defaultDeliveryAddress(option.id);
      }
    }

    order.paymentOptions = paymentOptionsFor(quote, offer.factory.rating);
    if (order.paymentMethod !== null) {
      const chosen = order.paymentOptions.find((item) => item.method === order.paymentMethod);
      // фабрика потеряла рейтинг, пока человек оформлял — тихо возвращаем к 100 %
      if (!chosen?.available) order.paymentMethod = "escrow_full";
    }
  }

  function sumOf(lines: readonly { qty: number }[]): number {
    return lines.reduce((total, line) => total + line.qty, 0);
  }

  /** Чего не хватает для `submit`. Пустой объект — можно отправлять. */
  function missingFields(order: MockOrder): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    const { params } = order;

    if (params.colors.length === 0) errors["params.colors"] = ["Укажите разбивку по цветам"];
    else if (sumOf(params.colors) !== params.qty) {
      errors["params.colors"] = ["Сумма по цветам должна совпадать с объёмом партии"];
    }
    if (params.sizes.length === 0) errors["params.sizes"] = ["Укажите размерный ряд"];
    else if (sumOf(params.sizes) !== params.qty) {
      errors["params.sizes"] = ["Сумма по размерам должна совпадать с объёмом партии"];
    }
    if (params.print === null || params.print.trim().length === 0) {
      errors["params.print"] = ["Укажите нанесение или выберите «без печати»"];
    }

    const printed = (params.print ?? "").toLowerCase();
    const needsArtwork = printed.length > 0 && !printed.includes("без печати");
    const usable = order.artwork.filter(
      (file) => file.status === "review" || file.status === "approved",
    );
    if (needsArtwork && usable.length === 0) {
      errors.artwork = ["Приложите макет печати — технолог проверит его до запуска"];
    }

    if (!order.delivery) errors["delivery.optionId"] = ["Выберите доставку"];
    else if (order.delivery.kind === "address") {
      if (!order.delivery.address?.trim()) errors["delivery.address"] = ["Укажите адрес доставки"];
      if (!order.delivery.recipientName?.trim()) {
        errors["delivery.recipientName"] = ["Укажите получателя"];
      }
      if (!order.delivery.recipientPhone?.trim()) {
        errors["delivery.recipientPhone"] = ["Укажите телефон получателя"];
      }
    }

    if (!order.payer) errors["payer.orgId"] = ["Выберите плательщика"];
    else if (!order.payer.legalAddress?.trim()) {
      errors["payer.legalAddress"] = ["Укажите юридический адрес — он уйдёт в счёт и договор"];
    }

    if (order.paymentMethod === null) errors.paymentMethod = ["Выберите способ оплаты"];

    return errors;
  }

  /* Трекинг, чат, документы, споры, уведомления и деньги — тот же заказ, тот же журнал.
     Слайс живёт в соседнем файле, но состояние у него это же: второго хранилища заказов
     в моках нет. */
  const trackingContext: TrackingContext = {
    now,
    getState: () => state,
    save,
    respond: (work) => respondAsync(latencyMs, work),
    requireCustomerOrg,
    requireOwnOrder,
    requireParticipant,
    publicOrder,
    journal,
    append,
    unreadOf,
    unreadFor,
    openDisputeOf,
    touch,
  };
  const tracking = createTrackingSlice(trackingContext);

  /** Очередь заказов завода — те же заказы одного хранилища (см. mock-seller-seed.ts). */
  function ensureFactorySeed(): void {
    // демо-мир один на три роли: очередь «Волны» включает заказ 4812 «Коры»
    ensureSeeded(DEMO_ORG_IDS.kora);
    if (state.factorySeeded === true) return;
    const seeded = seedFactoryOrders(now());
    for (const order of seeded.orders) {
      if (!state.orders.some((row) => row.id === order.id)) state.orders.push(order);
    }
    for (const [id, events] of Object.entries(seeded.events)) {
      state.events[id] ??= events;
    }
    state.factorySeeded = true;
    save();
  }
  ensureFactorySeedRef.current = ensureFactorySeed;

  const seller = createSellerSlice({
    now,
    getState: () => state,
    save,
    respond: (work) => respondAsync(latencyMs, work),
    getMe,
    emit: (orderId, event) => {
      tracking.emit(orderId, event);
    },
    journalOf: journal,
    touch,
    unreadOf: (orderId) => unreadFor(orderId, "factory"),
    disputeOpen: (orderId) => openDisputeOf(orderId) !== null,
    ensureFactorySeed,
  });

  const backoffice = createBackofficeSlice({
    now,
    getState: () => state,
    save,
    respond: (work) => respondAsync(latencyMs, work),
    getMe,
    emit: (orderId, event) => {
      tracking.emit(orderId, event);
    },
    touch,
    ensureFactorySeed,
    publicOrder: (order) => publicOrder(order),
    disputeOpen: (orderId) => openDisputeOf(orderId) !== null,
  });

  return {
    ...tracking,
    ...seller,
    ...backoffice,

    /** Счётчики шапки и сайдбара. У завода и оператора они свои: «ждут подтверждения»
        вместо «требуют действия», и считаются по тем же заказам одного хранилища. */
    getUserCounters(): Promise<UserCounters> {
      return respondAsync(latencyMs, async () => {
        const me = await getMe();
        const active = me.organizations.find((row) => row.id === me.activeOrgId);
        if (active?.kind !== "factory") return tracking.getUserCounters();
        ensureFactorySeed();
        const own = seller.ordersOfFactory(active.id);
        return {
          unreadNotifications: own.filter((order) => order.status === "awaiting_confirmation")
            .length,
          unreadMessages: own.reduce((sum, order) => sum + unreadFor(order.id, "factory"), 0),
          ordersAwaitingAction: own.filter(
            (order) =>
              order.status === "awaiting_confirmation" ||
              order.status === "confirmed" ||
              order.status === "materials",
          ).length,
          documentsAwaitingSignature: 0,
          ordersInAcceptance: own.filter((order) => order.status === "acceptance").length,
          openDisputes: own.filter((order) => openDisputeOf(order.id) !== null).length,
        };
      });
    },

    createOrderDraft(body: CreateOrderDraftBody, idempotencyKey: string): Promise<Order> {
      return respondAsync(latencyMs, async () => {
        const { me, orgId } = await requireCustomerOrg();

        const stored = state.idempotency[idempotencyKey];
        if (stored?.kind === "create-draft") {
          const existing = state.orders.find((row) => row.id === stored.orderId);
          if (existing) return publicOrder(existing);
        }

        const { quote, offer } = quoteFromId(body.quoteId);
        const decoded = decodeQuoteId(body.quoteId);
        const request = decoded?.request;

        // повторный заход с тем же оффером продолжает начатый черновик, а не плодит новые
        const resumed = state.orders.find(
          (row) => row.orgId === orgId && row.status === "draft" && row.offer.id === offer.id,
        );
        if (resumed) {
          applyQuote(resumed, body.quoteId, offer, quote);
          touch(resumed);
          state.idempotency[idempotencyKey] = { kind: "create-draft", orderId: resumed.id };
          save();
          return publicOrder(resumed);
        }

        const org = me.organizations.find((item) => item.id === orgId);
        const createdAt = new Date(now()).toISOString();
        state.orderSeq += 1;
        const id = state.orderSeq;

        const order: MockOrder = {
          orgId,
          id,
          status: "draft",
          customerStage: null,
          bucket: orderBucketOf("draft"),
          createdAt,
          updatedAt: createdAt,
          offer: {
            id: offer.id,
            title: offer.title,
            factoryId: offer.factory.id,
            factoryName: offer.factory.name,
            factoryCity: offer.factory.city,
            tone: offer.tone ?? null,
          },
          quoteId: body.quoteId,
          quote,
          quoteValidUntil: quote.validUntil ?? null,
          repeat: request?.repeat === true,
          promo: null,
          params: defaultParams(request?.qty ?? offer.moq, request?.optionIds ?? []),
          artwork: [],
          delivery: null,
          payer: org
            ? {
                orgId: org.id,
                name: org.name,
                inn: org.inn,
                kpp: org.kpp,
                legalAddress: DEMO_ORG_LEGAL_ADDRESS[org.id] ?? null,
                accountantEmail: null,
              }
            : null,
          // макет открывает шаг «Оплата» с выбранным «Эскроу 100 %»
          paymentMethod: "escrow_full",
          paymentOptions: paymentOptionsFor(quote, offer.factory.rating),
          documents: [],
          payment: null,
          submittedAt: null,
          paidAt: null,
          confirmDeadlineAt: null,
          shipDate: quote.shipDate ?? null,
        };
        applyQuote(order, body.quoteId, offer, quote);

        state.orders.push(order);
        state.idempotency[idempotencyKey] = { kind: "create-draft", orderId: id };
        save();
        return publicOrder(order);
      });
    },

    getOrder(id: number): Promise<Order> {
      return respondAsync(latencyMs, async () => publicOrder(await requireOwnOrder(id)));
    },

    listOrders(query: OrderListQuery = {}): Promise<OrderList> {
      return respondAsync(latencyMs, async () => {
        // история из макета раскладывается здесь же (ensureSeeded): у новой компании
        // заказов нет, и пустое состояние видно честно
        const { orgId } = await requireCustomerOrg();
        const own = state.orders.filter((row) => row.orgId === orgId).sort((a, b) => b.id - a.id);
        const all = own.map((row) =>
          toListItem(row, {
            unreadMessages: unreadOf(row.id),
            acceptanceDueAt:
              acceptanceOf(stripOwner(row), journal(row.id), now())?.autoAcceptAt ?? null,
            disputeOpen: openDisputeOf(row.id) !== null,
            // «заказано 2 раза» — сколько партий этого же предложения уже было
            repeatCount: own.filter(
              (other) => other.offer.id === row.offer.id && other.status !== "draft",
            ).length,
            freeCapacityPct: offerFreeCapacity(row.offer.id),
          }),
        );
        const items = all.filter(
          (item) => query.bucket === undefined || item.bucket === query.bucket,
        );
        return { items, total: items.length, summary: summaryOf(own, all) };
      });
    },

    updateOrderDraft(id: number, body: UpdateOrderDraftBody): Promise<Order> {
      return respondAsync(latencyMs, async () => {
        const order = await requireOwnOrder(id);
        if (order.status !== "draft") throw notDraft();
        const errors: Record<string, string[]> = {};

        if (body.quoteId !== undefined && body.quoteId !== order.quoteId) {
          const { quote, offer } = quoteFromId(body.quoteId);
          if (offer.id !== order.offer.id) {
            throw problem(
              409,
              `${P}/quote-offer-mismatch`,
              "Расчёт от другого предложения",
              "Чтобы сменить предложение, начните оформление заново.",
            );
          }
          applyQuote(order, body.quoteId, offer, quote);
        }

        if (body.params) {
          const next = { ...order.params, ...body.params };
          // объём меняется только вместе с котировкой: иначе цена разойдётся с партией
          if (body.params.qty !== undefined && body.params.qty !== order.params.qty) {
            errors["params.qty"] = ["Объём меняется пересчётом партии, а не напрямую"];
          }
          if (body.params.colors && sumOf(body.params.colors) !== order.params.qty) {
            errors["params.colors"] = [
              `Сумма по цветам — ${String(sumOf(body.params.colors))} шт, а в партии ${String(order.params.qty)} шт`,
            ];
          }
          if (body.params.sizes && sumOf(body.params.sizes) !== order.params.qty) {
            errors["params.sizes"] = [
              `Сумма по размерам — ${String(sumOf(body.params.sizes))} шт, а в партии ${String(order.params.qty)} шт`,
            ];
          }
          if (Object.keys(errors).length === 0) {
            order.params = { ...next, qty: order.params.qty, optionIds: order.params.optionIds };
          }
        }

        if (body.delivery) {
          const offer = requireMockOffer(order.offer.id);
          const option = offer.delivery.find((item) => item.id === body.delivery?.optionId);
          if (!option) errors["delivery.optionId"] = ["Такого варианта доставки у фабрики нет"];
          else {
            const kind = deliveryKindOf(option.id);
            order.delivery = {
              optionId: option.id,
              title: option.title,
              price: option.price,
              kind,
              address:
                kind === "address"
                  ? (body.delivery.address ?? order.delivery?.address ?? null)
                  : defaultDeliveryAddress(option.id),
              recipientName: body.delivery.recipientName ?? order.delivery?.recipientName ?? null,
              recipientPhone:
                body.delivery.recipientPhone ?? order.delivery?.recipientPhone ?? null,
              comment: body.delivery.comment ?? order.delivery?.comment ?? null,
            };
          }
        }

        if (body.payer) {
          const me = await getMe();
          const org = me.organizations.find(
            (item) => item.id === body.payer?.orgId && item.kind === "customer",
          );
          if (!org) errors["payer.orgId"] = ["Эта организация не может быть плательщиком"];
          else {
            order.payer = {
              orgId: org.id,
              name: org.name,
              inn: org.inn,
              kpp: org.kpp,
              legalAddress:
                body.payer.legalAddress ??
                order.payer?.legalAddress ??
                DEMO_ORG_LEGAL_ADDRESS[org.id] ??
                null,
              accountantEmail: body.payer.accountantEmail ?? order.payer?.accountantEmail ?? null,
            };
          }
        }

        if (body.paymentMethod !== undefined) {
          const option = order.paymentOptions.find((item) => item.method === body.paymentMethod);
          if (!option?.available) {
            errors.paymentMethod = [option?.unavailableReason ?? "Этот способ оплаты недоступен"];
          } else order.paymentMethod = body.paymentMethod;
        }

        if (Object.keys(errors).length > 0) throw invalidDraft(errors);

        touch(order);
        save();
        return publicOrder(order);
      });
    },

    requestArtworkUpload(id: number, body: ArtworkUploadRequest): Promise<ArtworkUploadResponse> {
      return respondAsync(latencyMs, async () => {
        const order = await requireOwnOrder(id);
        if (order.status !== "draft") throw notDraft();

        if (order.artwork.length >= ARTWORK_LIMITS.maxFiles) {
          throw problem(
            409,
            `${P}/artwork-limit-reached`,
            "Файлов уже максимум",
            `К заказу можно приложить не больше ${String(ARTWORK_LIMITS.maxFiles)} файлов`,
          );
        }
        if (!isAllowedArtworkType(body.contentType, body.fileName)) {
          throw problem(
            415,
            `${P}/artwork-unsupported-type`,
            "Такой файл не подойдёт",
            "Макет принимаем в PDF, AI, EPS, PNG, TIFF или SVG",
          );
        }
        if (body.size > ARTWORK_LIMITS.maxSize) {
          throw problem(
            413,
            `${P}/artwork-too-large`,
            "Файл слишком большой",
            `Максимум ${String(Math.round(ARTWORK_LIMITS.maxSize / 1024 / 1024))} МБ на файл`,
          );
        }

        const fileId = `art-${String(id)}-${String(now())}-${String(order.artwork.length + 1)}`;
        const expiresAtMs = now() + 15 * 60_000;
        state.uploads.push({
          fileId,
          orderId: id,
          fileName: body.fileName,
          contentType: body.contentType,
          size: body.size,
          expiresAtMs,
        });
        order.artwork.push({
          id: fileId,
          fileName: body.fileName,
          size: body.size,
          contentType: body.contentType,
          status: "uploading",
          url: null,
          uploadedAt: null,
          error: null,
        });
        touch(order);
        save();

        return {
          fileId,
          // ⚠ схема `mock:` — сигнал загрузчику имитировать прогресс вместо настоящего PUT
          uploadUrl: `mock://artwork/${fileId}`,
          method: "PUT",
          headers: { "Content-Type": body.contentType },
          expiresAt: new Date(expiresAtMs).toISOString(),
          limits: ARTWORK_LIMITS,
        };
      });
    },

    completeArtworkUpload(id: number, fileId: string): Promise<OrderArtwork> {
      return respondAsync(latencyMs, async () => {
        const order = await requireOwnOrder(id);
        const file = order.artwork.find((item) => item.id === fileId);
        if (!file) throw notFound("Файл макета");
        const upload = state.uploads.find((item) => item.fileId === fileId);
        if (upload && now() > upload.expiresAtMs) {
          file.status = "failed";
          file.error = "Ссылка на загрузку истекла — повторите";
          save();
          throw problem(409, `${P}/artwork-upload-expired`, "Ссылка на загрузку истекла");
        }
        // макет уходит технологу фабрики: макет экрана — «на проверке у технолога»
        file.status = "review";
        file.uploadedAt = new Date(now()).toISOString();
        file.url = `#/artwork/${fileId}`;
        file.error = null;
        state.uploads = state.uploads.filter((item) => item.fileId !== fileId);
        touch(order);
        save();
        return file;
      });
    },

    deleteArtwork(id: number, fileId: string): Promise<void> {
      return respondAsync(latencyMs, async () => {
        const order = await requireOwnOrder(id);
        if (order.status !== "draft") throw notDraft();
        order.artwork = order.artwork.filter((item) => item.id !== fileId);
        state.uploads = state.uploads.filter((item) => item.fileId !== fileId);
        touch(order);
        save();
      });
    },

    submitOrder(
      id: number,
      body: SubmitOrderBody,
      idempotencyKey: string,
    ): Promise<SubmitOrderResponse> {
      return respondAsync(latencyMs, async () => {
        const order = await requireOwnOrder(id);

        // повтор с тем же ключом возвращает первый ответ — второго заказа не появляется
        const stored = state.idempotency[idempotencyKey];
        if (stored?.kind === "submit" && stored.orderId === order.id) {
          if (!order.payment) throw notDraft();
          return { order: publicOrder(order), documents: order.documents, payment: order.payment };
        }

        // п. 12: без принятия оферты и её версии заказ не оформить (`OfferConsent::parse`)
        const consentErrors = offerConsentErrors(body);
        if (Object.keys(consentErrors).length > 0) {
          throw problem(
            422,
            `${P}/offer-not-accepted`,
            "Примите условия оферты",
            "без принятия оферты заказ не оформить",
            consentErrors,
          );
        }

        if (order.status !== "draft") throw notDraft();

        const errors = missingFields(order);
        if (Object.keys(errors).length > 0) throw draftIncomplete(errors);

        // цена, с которой человек согласился, должна быть ещё живой
        const validUntil = order.quoteValidUntil;
        if (validUntil !== null && Date.parse(validUntil) <= now()) throw quoteExpired();

        const nowMs = now();
        order.status = "awaiting_payment";
        order.submittedAt = new Date(nowMs).toISOString();
        order.documents = documentsFor(order.id, new Date(nowMs), isSplitPayment(order));
        order.payment = paymentFor(order, nowMs);
        touch(order);
        // в журнал — версия оферты, без IP (Q-351: IP и браузер видит только сервер)
        tracking.emit(order.id, {
          type: "note",
          orderId: order.id,
          occurredAt: new Date(nowMs).toISOString(),
          actor: { kind: "customer", name: "Вы", orgId: order.orgId },
          title: "Принята оферта платформы",
          detail: `редакция ${body.offerVersion.trim()}`,
          topic: "offer",
        });
        state.idempotency[idempotencyKey] = { kind: "submit", orderId: order.id };
        save();

        return { order: publicOrder(order), documents: order.documents, payment: order.payment };
      });
    },

    /** `POST /orders/{id}/cancel` — отмена заказчиком до оплаты (п. 17, Q-355). */
    cancelOrder(id: number, body: CancelOrderBody): Promise<Order> {
      return respondAsync(latencyMs, async () => {
        const order = await requireOwnOrder(id);
        if (order.status === "cancelled") return publicOrder(order);
        if (order.status !== "draft" && order.status !== "awaiting_payment") {
          throw problem(
            409,
            `${P}/cancel-after-payment`,
            "Отменить можно только через оператора",
            "Деньги уже поступили в эскроу — отменить заказ можно только через оператора платформы.",
          );
        }
        const reason = body.reason?.trim().slice(0, 500) ?? "";
        const occurredAt = new Date(now()).toISOString();
        const from = order.status;
        order.status = "cancelled";
        order.customerStage = null;
        order.bucket = orderBucketOf("cancelled");
        order.cancelReason = reason.length > 0 ? reason : null;
        touch(order);
        tracking.emit(order.id, {
          type: "status_changed",
          orderId: order.id,
          occurredAt,
          actor: { kind: "customer", name: "Вы", orgId: order.orgId },
          title: "Заказ отменён",
          detail:
            reason.length > 0 ? `Заказчик отменил заказ: ${reason}` : "Заказчик отменил заказ",
          from,
          to: "cancelled",
          stage: null,
        });
        save();
        return publicOrder(order);
      });
    },

    getSampleOptions(offerId: number): Promise<SampleOptions> {
      return respondAsync(latencyMs, () =>
        Promise.resolve(sampleOptionsFor(requireMockOffer(offerId))),
      );
    },

    requestSampleArtworkUpload(body: ArtworkUploadRequest): Promise<ArtworkUploadResponse> {
      return respondAsync(latencyMs, async () => {
        await requireCustomerOrg();
        if (!isAllowedArtworkType(body.contentType, body.fileName)) {
          throw problem(
            415,
            `${P}/artwork-unsupported-type`,
            "Такой файл не подойдёт",
            "Макет принимаем в PDF, AI, EPS, PNG, TIFF или SVG",
          );
        }
        if (body.size > ARTWORK_LIMITS.maxSize) {
          throw problem(
            413,
            `${P}/artwork-too-large`,
            "Файл слишком большой",
            `Максимум ${String(Math.round(ARTWORK_LIMITS.maxSize / 1024 / 1024))} МБ на файл`,
          );
        }
        const fileId = `smp-art-${String(now())}`;
        const expiresAtMs = now() + 15 * 60_000;
        state.uploads.push({
          fileId,
          orderId: null,
          fileName: body.fileName,
          contentType: body.contentType,
          size: body.size,
          expiresAtMs,
        });
        save();
        return {
          fileId,
          uploadUrl: `mock://artwork/${fileId}`,
          method: "PUT",
          headers: { "Content-Type": body.contentType },
          expiresAt: new Date(expiresAtMs).toISOString(),
          limits: ARTWORK_LIMITS,
        };
      });
    },

    createSample(body: CreateSampleBody, idempotencyKey: string): Promise<SampleOrder> {
      return respondAsync(latencyMs, async () => {
        const { orgId } = await requireCustomerOrg();

        const stored = state.idempotency[idempotencyKey];
        if (stored?.kind === "create-sample") {
          const existing = state.samples.find((row) => row.id === stored.orderId);
          if (existing) return existing;
        }

        const offer = requireMockOffer(body.offerId);
        const options = sampleOptionsFor(offer);
        const errors: Record<string, string[]> = {};

        if (!options.qtyChoices.includes(body.params.qty)) {
          errors["params.qty"] = ["Образцов можно заказать от 1 до 3 штук"];
        }
        if (body.params.sizes.trim().length === 0) errors["params.sizes"] = ["Укажите размеры"];
        if (!options.colorChoices.includes(body.params.color)) {
          errors["params.color"] = ["Такого цвета у фабрики нет"];
        }
        const print = options.printChoices.find((item) => item.value === body.params.print);
        if (!print) errors["params.print"] = ["Выберите вид печати"];
        const delivery = options.delivery.find((item) => item.id === body.delivery.optionId);
        if (!delivery) errors["delivery.optionId"] = ["Выберите доставку"];
        if (body.delivery.address.trim().length === 0) {
          errors["delivery.address"] = ["Укажите адрес доставки"];
        }
        if (body.delivery.recipientName.trim().length === 0) {
          errors["delivery.recipientName"] = ["Укажите получателя"];
        }
        if (body.delivery.recipientPhone.trim().length === 0) {
          errors["delivery.recipientPhone"] = ["Укажите телефон получателя"];
        }
        if (Object.keys(errors).length > 0) {
          throw problem(
            422,
            "https://partiya.ru/problems/samples/invalid",
            "Проверьте форму заказа образца",
            undefined,
            errors,
          );
        }
        if (!delivery || !print) throw badRequest("Некорректная форма");

        const nowMs = now();
        state.sampleSeq += 1;
        // цена образца — за заказ, а не за штуку: так сходится итог 1 920 ₽ из макета (Q-133)
        const samplePrice = options.price;
        const upload =
          body.artworkFileId === undefined || body.artworkFileId === null
            ? undefined
            : state.uploads.find((item) => item.fileId === body.artworkFileId);

        const sample: MockSample = {
          orgId,
          id: state.sampleSeq,
          // карта платит сразу, счёт на юрлицо — ждёт поступления (допущение по Q-13)
          status: body.payment === "card" ? "paid" : "awaiting_payment",
          createdAt: new Date(nowMs).toISOString(),
          offer: {
            id: offer.id,
            title: offer.title,
            factoryId: offer.factory.id,
            factoryName: offer.factory.name,
            factoryCity: offer.factory.city,
            tone: offer.tone ?? null,
          },
          params: body.params,
          delivery: {
            optionId: delivery.id,
            title: delivery.title,
            price: delivery.price,
            address: body.delivery.address,
            recipientName: body.delivery.recipientName,
            recipientPhone: body.delivery.recipientPhone,
          },
          lines: [
            {
              kind: "base",
              title: `Образец × ${String(body.params.qty)}`,
              amount: samplePrice,
            },
            { kind: "option", title: body.params.print, amount: print.price },
            { kind: "delivery", title: delivery.title, amount: delivery.price },
          ],
          total: samplePrice + print.price + delivery.price,
          payment: body.payment,
          credit: {
            amount: samplePrice,
            days: options.credit.days,
            validUntil: toIsoDate(new Date(nowMs + options.credit.days * 24 * 60 * 60_000)),
          },
          leadDays: options.leadDays,
          artworkFileName: upload?.fileName ?? null,
          shipDate: toIsoDate(addWorkingDays(new Date(nowMs), options.leadDays)),
        };

        state.samples.push(sample);
        state.idempotency[idempotencyKey] = { kind: "create-sample", orderId: sample.id };
        save();
        return sample;
      });
    },

    listSamples(): Promise<SampleList> {
      return respondAsync(latencyMs, async () => {
        const { orgId } = await requireCustomerOrg();
        const items = state.samples
          .filter((row) => row.orgId === orgId)
          .sort((a, b) => b.id - a.id)
          .map((row) => {
            const rest: Partial<MockSample> = { ...row };
            delete rest.orgId;
            return rest as SampleOrder;
          });
        return { items, total: items.length };
      });
    },

    /** `POST /orders/{id}/artwork/approve` — команда `ApproveArtwork`: её подаёт заказчик. */
    approveArtwork(id: number): Promise<Order> {
      return respondAsync(latencyMs, async () => {
        const order = await requireOwnOrder(id);
        if (order.status !== "artwork_review") {
          throw problem(
            409,
            `${P}/not-draft`,
            "Согласовывать нечего",
            "Макет согласуют, пока он у технолога.",
          );
        }
        // п. 16: заказчик подписывает визуал; в `materials` заказ уйдёт второй подписью
        signArtwork(
          order,
          "customer",
          new Date(now()).toISOString(),
          { kind: "customer", name: "Вы", orgId: order.orgId },
          (orderId, event) => {
            tracking.emit(orderId, event);
          },
        );
        touch(order);
        save();
        return publicOrder(order);
      });
    },

    /** `POST /orders/{id}/accept` — команда `Accept` автомата: деньги уходят фабрике. */
    acceptOrder(id: number, body: AcceptOrderBody, idempotencyKey: string): Promise<Order> {
      return respondAsync(latencyMs, async () => {
        const order = await requireOwnOrder(id);

        const stored = state.idempotency[idempotencyKey];
        if (stored?.kind === "accept" && stored.orderId === order.id) return publicOrder(order);

        if (openDisputeOf(order.id)) {
          throw problem(
            409,
            `${P}/dispute-open`,
            "По заказу открыт спор",
            "Пока идёт разбирательство, принять партию нельзя.",
          );
        }
        if (order.status !== "acceptance") {
          throw problem(
            409,
            `${P}/not-in-acceptance`,
            "Принимать пока нечего",
            "Приёмка открывается после доставки партии.",
          );
        }

        const nowMs = now();
        const occurredAt = new Date(nowMs).toISOString();
        const from = order.status;
        order.status = "completed";
        order.acceptedAt = occurredAt;
        touch(order);

        const issues = Object.values(body.marks ?? {}).filter((mark) => mark === "issue").length;
        tracking.emit(order.id, {
          type: "status_changed",
          orderId: order.id,
          occurredAt,
          actor: { kind: "customer", name: "Вы", orgId: order.orgId },
          title: issues > 0 ? "Партия принята с замечаниями" : "Партия принята",
          detail:
            body.note?.trim() ||
            (issues > 0 ? `замечаний: ${String(issues)}` : "претензий нет, выплата фабрике"),
          from,
          to: "completed",
          stage: customerStageOf("completed"),
        });
        const fee = orderFeeOf(order);
        tracking.emit(order.id, {
          type: "money",
          orderId: order.id,
          occurredAt,
          actor: { kind: "system", name: "Система", orgId: null },
          title: "Выплата фабрике после приёмки",
          detail: `комиссия платформы ${String(Math.round(fee / 100))} ₽`,
          operation: "release",
          amount: order.quote.total - fee,
        });
        // акт приёмки формируется приёмкой, а не отгрузкой
        const act: OrderDocument = {
          id: `doc-act-${String(order.id)}`,
          kind: "act",
          title: `Акт приёмки № ${String(order.id)}-А`,
          url: `#/documents/${String(order.id)}/act.pdf`,
          signature: "edo_signed",
          createdAt: occurredAt,
        };
        if (!order.documents.some((doc) => doc.id === act.id)) order.documents.push(act);

        state.idempotency[idempotencyKey] = { kind: "accept", orderId: order.id };
        save();
        return publicOrder(order);
      });
    },

    /** `POST /orders/{id}/repeat` — новый черновик по спецификации прошлой партии. */
    repeatOrder(id: number, idempotencyKey: string): Promise<RepeatOrderResponse> {
      return respondAsync(latencyMs, async () => {
        const source = await requireOwnOrder(id);
        const offer = requireMockOffer(source.offer.id);
        const discountPercent = offer.repeatDiscountPercent ?? 0;

        const stored = state.idempotency[idempotencyKey];
        if (stored?.kind === "repeat") {
          const existing = state.orders.find((row) => row.id === stored.orderId);
          if (existing) {
            return {
              order: publicOrder(existing),
              discountPercent,
              priceLockedDays: QUOTE_TTL_DAYS,
            };
          }
        }

        if (source.status !== "completed") {
          throw problem(
            409,
            `${P}/repeat-not-allowed`,
            "Повторить можно завершённый заказ",
            "Партия ещё в работе — повтор станет доступен после приёмки.",
          );
        }

        const nowMs = now();
        // скидку за повтор считает движок котировок, а не браузер: цена — это всегда котировка
        const request = {
          offerId: offer.id,
          qty: source.params.qty,
          optionIds: source.params.optionIds,
          deliveryId: source.delivery?.optionId,
          repeat: true,
        };
        const quote = mockQuote(request, nowMs);
        const createdAt = new Date(nowMs).toISOString();
        state.orderSeq += 1;
        const draft: MockOrder = {
          ...source,
          id: state.orderSeq,
          status: "draft",
          customerStage: null,
          bucket: orderBucketOf("draft"),
          createdAt,
          updatedAt: createdAt,
          quoteId: quote.id ?? "",
          quote,
          quoteValidUntil: quote.validUntil ?? null,
          repeat: true,
          repeatOfOrderId: source.id,
          repeatDiscountPercent: discountPercent,
          promo: null,
          params: { ...source.params },
          artwork: source.artwork.map((file) => ({ ...file })),
          documents: [],
          payment: null,
          submittedAt: null,
          paidAt: null,
          confirmDeadlineAt: null,
          deliveredAt: null,
          acceptedAt: null,
          // отметки прошлой партии новому черновику не наследуются
          payoutAt: null,
          trackingNumber: null,
          artworkSignoff: { customerApprovedAt: null, factoryApprovedAt: null },
          secondTrancheDueAt: null,
          secondTranchePaidAt: null,
          cancelReason: null,
          shipDate: quote.shipDate ?? null,
          paymentOptions: paymentOptionsFor(quote, offer.factory.rating),
        };
        state.orders.push(draft);
        state.idempotency[idempotencyKey] = { kind: "repeat", orderId: draft.id };
        save();
        return { order: publicOrder(draft), discountPercent, priceLockedDays: QUOTE_TTL_DAYS };
      });
    },

    markPaid(id: number): Promise<Order> {
      return respondAsync(latencyMs, async () => {
        const order = await requireOwnOrder(id);
        if (order.status !== "awaiting_payment") return publicOrder(order);
        const nowMs = now();
        const occurredAt = new Date(nowMs).toISOString();
        // у бэка этот переход делает webhook банка (ARCHITECTURE.md, 5.4)
        order.status = "awaiting_confirmation";
        order.paidAt = occurredAt;
        order.confirmDeadlineAt = confirmDeadline(nowMs);
        touch(order);
        tracking.emit(order.id, {
          type: "status_changed",
          orderId: order.id,
          occurredAt,
          actor: { kind: "system", name: "Система", orgId: null },
          title: "Оплата зарезервирована в эскроу",
          detail: "оферта и спецификация подписаны по ЭДО",
          from: "awaiting_payment",
          to: "awaiting_confirmation",
          stage: customerStageOf("awaiting_confirmation"),
        });
        tracking.emit(order.id, {
          type: "money",
          orderId: order.id,
          occurredAt,
          actor: { kind: "system", name: "Система", orgId: null },
          title: "Оплата зарезервирована в эскроу",
          detail: "деньги уйдут фабрике после вашей приёмки",
          operation: "hold",
          amount: order.quote.total,
        });
        save();
        return publicOrder(order);
      });
    },

    reset(): void {
      tracking.stopStreams();
      resetSellerOffers();
      state = seedState();
      try {
        storage?.removeItem(STORAGE_KEY);
      } catch {
        /* нечего чистить */
      }
    },
  };
}

/** Небольшая задержка: на моках должны быть видны блокировки кнопок и скелетоны. */
const LATENCY_MS = 180;

function respondAsync<T>(latencyMs: number, work: () => T | Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      void (async () => {
        try {
          resolve(await work());
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      })();
    }, latencyMs);
  });
}

function safeSessionStorage(): MockOrdersOptions["storage"] {
  try {
    if (typeof sessionStorage === "undefined") return null;
    sessionStorage.getItem(STORAGE_KEY);
    return sessionStorage;
  } catch {
    return null;
  }
}
