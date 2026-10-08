import type {
  Kopecks,
  Order,
  OrderColorLine,
  OrderDocument,
  OrderEvent,
  OrderMessage,
  OrderParams,
  OrderPhoto,
  OrderStatus,
  Quote,
  QuoteLine,
} from "@partiya/api-contracts";

import { customerStageOf, orderBucketOf } from "@/shared/lib/order-status";
import { encodeQuoteId } from "@/shared/lib/quote-id";
import { requireMockOffer } from "@/shared/mocks";

import { platformFeeOf, type TrancheExtensionRecord } from "./mock-projections";

/* История заказчика «Кора» — пять заказов из `mockups/lenta/data.js` целиком, а не
   пятью строками таблицы.

   Почему целиком. Экран трекинга показывает журнал, прогресс, фотоотчёты, чат, документы
   и эскроу. Если история останется списком `OrderListItem`, открыть из неё будет нечего:
   `GET /orders/4812` ответит 404, и «прокликать» жизненный цикл не получится. Поэтому
   здесь собираются настоящие `Order` с журналом событий — тем же, из которого бэк считает
   все проекции (ARCHITECTURE.md, 5.2, 8.3).

   Цены НЕ считаются движком котировок намеренно: у сквозного примера макета жёсткие числа
   (183 400 ₽ = 168 000 + 6 000 + 9 400), и подгонять под них фикстуры офферов — значит
   ломать каталог ради истории. Поэтому котировка прошлого заказа здесь — снимок,
   каким он и является в контракте: `Order.quote` описан как «снимок строк, которые ушли
   в спецификацию». Новые заказы считает движок, как и раньше.

   Журнал привязан к «сегодня» смещениями в днях, а не абсолютными датами: лента с
   заголовком «Сегодня, 21 сентября» должна читаться и через месяц. */

/** Заказ мока: контрактный `Order` плюс владелец — чужой заказ снаружи неотличим от
    несуществующего. */
export interface MockOrder extends Order {
  orgId: string;
  /** Когда оператор подтвердил выплату заводу; `null` — ещё не выплачено.
      В контракте `Order` этого поля нет: заказчику момент перевода заводу не показывают. */
  payoutAt?: string | null;
  /** 50/50 (п. 4): срок второго транша. Ставится переходом в «Контроль качества»
      («готов к отгрузке», Q-342); до этого `null` — счёт ещё не выставлен. */
  secondTrancheDueAt?: string | null;
  /** 50/50: когда оператор подтвердил поступление второго транша. */
  secondTranchePaidAt?: string | null;
  /** Q-401: сколько раз продлевали срок второго транша (авто + оператор). */
  secondTrancheExtensions?: number;
  /** Q-401: повторная просрочка — счёт в очереди оператора «Просроченные транши». */
  secondTrancheOverdueSince?: string | null;
  /** Q-401: счёт снят — оператор открыл спор от имени платформы. */
  secondTrancheCancelledAt?: string | null;
  /** Q-401: история сроков счёта. */
  secondTrancheHistory?: TrancheExtensionRecord[];
  /** Причина отмены заказчиком (п. 17) — уходит только в журнал. */
  cancelReason?: string | null;
}

/** Событие журнала до записи: `seq` проставляет хранилище, как и у бэка.
 *
 * Omit по объединению схлопывает варианты до общих полей, поэтому он здесь
 * дистрибутивный: иначе `progress`, `photos` и `message` теряются на входе. */
type OmitSeq<T> = T extends OrderEvent ? Omit<T, "seq"> : never;
export type NewOrderEvent = OmitSeq<OrderEvent>;

const rub = (value: number): Kopecks => value * 100;

/** Разбивка объёма по долям: 60/40 у цветов, 20/30/30/20 у размеров.
    Остаток от округления уходит в последнюю строку — сумма обязана сойтись с `qty`. */
export function split(qty: number, shares: readonly number[]): number[] {
  const parts = shares.map((share) => Math.floor((qty * share) / 100));
  const assigned = parts.reduce((sum, value) => sum + value, 0);
  const last = parts.length - 1;
  if (last >= 0) parts[last] = (parts[last] ?? 0) + (qty - assigned);
  return parts;
}

/** Параметры партии по умолчанию — те же, что в сводке макета:
    «1 000 шт · белый 600 / чёрный 400 · S–XL · шелкография 2 цв.». */
export function defaultParams(qty: number, optionIds: string[]): OrderParams {
  const colorQty = split(qty, [60, 40]);
  const sizeQty = split(qty, [20, 30, 30, 20]);
  return {
    qty,
    optionIds,
    colors: [
      { color: "белый", qty: colorQty[0] ?? 0 },
      { color: "чёрный", qty: colorQty[1] ?? 0 },
    ],
    sizes: [
      { size: "S", qty: sizeQty[0] ?? 0 },
      { size: "M", qty: sizeQty[1] ?? 0 },
      { size: "L", qty: sizeQty[2] ?? 0 },
      { size: "XL", qty: sizeQty[3] ?? 0 },
    ],
    fit: "классический",
    print: "шелкография, 2 цвета, грудь",
    comment: null,
  };
}

/* ─────────────────────────────── вход фикстур ─────────────────────────────── */

interface SeedInput {
  id: number;
  offerId: number;
  qty: number;
  status: OrderStatus;
  /** Сколько дней назад оформлен. */
  submittedDaysAgo: number;
  /** Плановая отгрузка, ISO `YYYY-MM-DD`; `null` — даты ещё нет. */
  shipDate: string | null;
  /** Строки котировки — снимок, ушедший в спецификацию. */
  lines: QuoteLine[];
  unitPrice: Kopecks;
  optionIds: string[];
  deliveryId: string;
  colors?: OrderColorLine[];
  print?: string;
  fit?: string;
}

const SEEDS: SeedInput[] = [
  {
    // сквозной пример макета: экран tracking
    id: 4812,
    offerId: 2231,
    qty: 1000,
    status: "in_production",
    submittedDaysAgo: 11,
    shipDate: "2026-10-02",
    lines: [
      { kind: "base", title: "Партия 1 000 шт", amount: rub(168_000) },
      { kind: "option", title: "Доп. цвет принта", amount: rub(6_000) },
      { kind: "delivery", title: "Доставка до склада WB", amount: rub(9_400) },
    ],
    unitPrice: rub(168),
    optionIds: ["extra-print-color"],
    deliveryId: "wb",
  },
  {
    id: 4790,
    offerId: 2160,
    qty: 2000,
    status: "quality_control",
    submittedDaysAgo: 24,
    shipDate: "2026-09-25",
    lines: [
      { kind: "base", title: "Партия 2 000 шт", amount: rub(192_000) },
      { kind: "delivery", title: "Самовывоз с фабрики", amount: 0 },
    ],
    unitPrice: rub(96),
    optionIds: [],
    deliveryId: "pickup",
    colors: [{ color: "натуральный", qty: 2000 }],
    print: "шелкография, 1 цвет",
  },
  {
    /* Был заказ свечей «Формата» (2187); категорию «Свечи и декор» убрали (Q-415, Q-431) —
       тот же заказ «ждёт подтверждения» на текстильном оффере «Камы», суммы — снимок макета. */
    id: 4744,
    offerId: 2085,
    qty: 300,
    status: "awaiting_confirmation",
    submittedDaysAgo: 2,
    shipDate: null,
    lines: [
      { kind: "base", title: "Партия 300 шт", amount: rub(63_000) },
      { kind: "delivery", title: "Самовывоз с фабрики", amount: 0 },
    ],
    unitPrice: rub(210),
    optionIds: [],
    deliveryId: "pickup",
    colors: [{ color: "чёрный", qty: 300 }],
    print: "DTF-печать, логотип на груди",
    fit: "оверсайз",
  },
  {
    id: 4601,
    offerId: 2231,
    qty: 500,
    status: "completed",
    submittedDaysAgo: 65,
    shipDate: "2026-08-14",
    lines: [
      { kind: "base", title: "Партия 500 шт", amount: rub(84_000) },
      { kind: "delivery", title: "Самовывоз с фабрики", amount: 0 },
    ],
    unitPrice: rub(168),
    optionIds: [],
    deliveryId: "pickup",
    colors: [
      { color: "белый", qty: 300 },
      { color: "чёрный", qty: 200 },
    ],
  },
  {
    id: 4522,
    offerId: 2204,
    qty: 300,
    status: "completed",
    submittedDaysAgo: 91,
    shipDate: "2026-07-30",
    lines: [
      { kind: "base", title: "Партия 300 шт", amount: rub(207_000) },
      { kind: "delivery", title: "Самовывоз с фабрики", amount: 0 },
    ],
    unitPrice: rub(690),
    optionIds: [],
    deliveryId: "pickup",
    colors: [{ color: "графит", qty: 300 }],
    print: "вышивка, грудь",
    fit: "оверсайз",
  },
];

/** Номера заказов моки выдают после самого свежего из фикстур: 4812 уже занят. */
export const SEEDED_ORDER_IDS = SEEDS.map((seed) => seed.id);

/* ─────────────────────────────── сборка заказа ─────────────────────────────── */

function at(nowMs: number, daysAgo: number, time: string): string {
  const date = new Date(nowMs);
  date.setDate(date.getDate() - daysAgo);
  const [hours, minutes] = time.split(":");
  date.setHours(Number(hours ?? 0), Number(minutes ?? 0), 0, 0);
  return date.toISOString();
}

function quoteOf(seed: SeedInput, issuedAtMs: number): Quote {
  const total = seed.lines.reduce((sum, line) => sum + line.amount, 0);
  const delivery = seed.lines.find((line) => line.kind === "delivery")?.amount ?? 0;
  return {
    lines: seed.lines,
    unitPrice: seed.unitPrice,
    subtotal: total - delivery,
    discountTotal: 0,
    delivery,
    total,
    id: encodeQuoteId(
      {
        offerId: seed.offerId,
        qty: seed.qty,
        optionIds: seed.optionIds,
        deliveryId: seed.deliveryId,
      },
      issuedAtMs,
    ),
    leadDays: 18,
    shipDate: seed.shipDate ?? undefined,
    // DECISIONS.md, п. 11: котировка живёт 14 дней
    validUntil: new Date(issuedAtMs + 14 * 24 * 60 * 60_000).toISOString(),
  };
}

function documentsOf(seed: SeedInput, createdAt: string): OrderDocument[] {
  const no = String(seed.id);
  const documents: OrderDocument[] = [
    {
      id: `doc-offer-${no}`,
      kind: "offer_contract",
      title: `Договор-оферта № ${no}`,
      url: `#/documents/${no}/offer.pdf`,
      signature: "edo_signed",
      createdAt,
    },
    {
      id: `doc-spec-${no}`,
      kind: "specification",
      title: `Спецификация ${no}-С`,
      url: `#/documents/${no}/spec.pdf`,
      signature: seed.status === "awaiting_confirmation" ? "edo_pending" : "edo_signed",
      createdAt,
    },
    {
      id: `doc-invoice-${no}`,
      kind: "invoice",
      title: `Счёт ${no}-СЧ`,
      url: `#/documents/${no}/invoice.pdf`,
      signature: "none",
      createdAt,
    },
  ];
  // УПД появляется после отгрузки, акт приёмки — после завершения
  if (seed.status === "shipped" || seed.status === "acceptance" || seed.status === "completed") {
    documents.push({
      id: `doc-upd-${no}`,
      kind: "act",
      title: `УПД № ${no}-У`,
      url: `#/documents/${no}/upd.pdf`,
      signature: seed.status === "completed" ? "edo_signed" : "edo_pending",
      createdAt,
    });
  }
  if (seed.status === "completed") {
    documents.push({
      id: `doc-act-${no}`,
      kind: "act",
      title: `Акт приёмки № ${no}-А`,
      url: `#/documents/${no}/act.pdf`,
      signature: "edo_signed",
      createdAt,
    });
  }
  return documents;
}

/** Путь заказа по автомату до его текущего статуса — отсюда берутся даты этапов. */
const PATH: OrderStatus[] = [
  "awaiting_payment",
  "awaiting_confirmation",
  "confirmed",
  "artwork_review",
  "materials",
  "in_production",
  "quality_control",
  "shipped",
  "acceptance",
  "completed",
];

const STATUS_EVENT_TITLE: Partial<Record<OrderStatus, { title: string; detail?: string }>> = {
  awaiting_payment: { title: "Заказ оформлен", detail: "счёт выставлен, документы сформированы" },
  awaiting_confirmation: {
    title: "Оплата поступила, заказ ушёл фабрике",
    detail: "оферта и спецификация подписаны по ЭДО",
  },
  confirmed: { title: "Фабрика подтвердила заказ", detail: "мощность зарезервирована" },
  artwork_review: { title: "Макет у технолога", detail: "цветопроба и раскладка" },
  materials: { title: "Сырьё закуплено", detail: "кулирка 180 г/м², 420 кг" },
  in_production: { title: "Старт производства", detail: "партия в работе" },
  quality_control: { title: "Партия на контроле качества", detail: "выборка 5 % по ГОСТ" },
  shipped: { title: "Партия отгружена", detail: "передана перевозчику" },
  acceptance: { title: "Партия доставлена", detail: "открыто окно приёмки: 5 рабочих дней" },
  completed: { title: "Партия принята", detail: "выплата фабрике отправлена" },
  dispute: { title: "Открыт спор", detail: "выплата фабрике заблокирована" },
  declined: { title: "Фабрика отклонила заказ", detail: "деньги возвращаются" },
  cancelled: { title: "Заказ отменён", detail: "счёт не оплачен в срок" },
  refunded: { title: "Деньги возвращены", detail: "возврат на расчётный счёт" },
};

const SYSTEM = { kind: "system" as const, name: "Система", orgId: null };
const FACTORY = (name: string) => ({
  kind: "factory" as const,
  name: `Технолог «${name}»`,
  orgId: null,
});

/** Заголовок и подпись события смены статуса — те же тексты, что пишет бэк. */
export function statusEventText(status: OrderStatus): { title: string; detail?: string } {
  return STATUS_EVENT_TITLE[status] ?? { title: `Статус: ${status}` };
}

interface JournalBuilder {
  events: OrderEvent[];
  seq: number;
}

function push(builder: JournalBuilder, event: NewOrderEvent): void {
  builder.seq += 1;
  builder.events.push({ ...event, seq: builder.seq } as OrderEvent);
}

function photo(id: string, label: string, tone: OrderPhoto["tone"], takenAt: string): OrderPhoto {
  return { id, url: null, label, tone, takenAt };
}

/** Журнал сквозного примера 4812 — события из макета, в том же порядке и с тем же текстом. */
function seedJournal4812(
  builder: JournalBuilder,
  seed: SeedInput,
  factoryName: string,
  nowMs: number,
): void {
  const orderId = seed.id;
  const factory = FACTORY(factoryName);
  const me = { kind: "customer" as const, name: "Вы", orgId: null };

  const statusAt: Partial<Record<OrderStatus, string>> = {
    awaiting_payment: at(nowMs, 11, "11:20"),
    awaiting_confirmation: at(nowMs, 11, "14:05"),
    confirmed: at(nowMs, 11, "16:30"),
    artwork_review: at(nowMs, 10, "10:15"),
    materials: at(nowMs, 9, "12:00"),
    in_production: at(nowMs, 6, "09:40"),
  };

  let previous: OrderStatus | null = "draft";
  for (const status of PATH) {
    const occurredAt = statusAt[status];
    if (occurredAt === undefined) break;
    const text = statusEventText(status);
    push(builder, {
      type: "status_changed",
      orderId,
      occurredAt,
      actor: status === "confirmed" || status === "materials" ? factory : SYSTEM,
      title: text.title,
      detail: text.detail ?? null,
      from: previous,
      to: status,
      stage: customerStageOf(status),
    });
    previous = status;

    if (status === "awaiting_confirmation") {
      push(builder, {
        type: "money",
        orderId,
        occurredAt,
        actor: SYSTEM,
        title: "Оплата зарезервирована в эскроу",
        detail: "деньги уйдут фабрике после вашей приёмки",
        operation: "hold",
        amount: rub(183_400),
      });
    }
    if (status === "in_production") {
      push(builder, {
        type: "progress",
        orderId,
        occurredAt,
        actor: factory,
        title: "Раскроено 1 000 / 1 000",
        detail: "партия белая",
        progress: { id: "cut", title: "Раскроено", done: 1000, total: 1000, updatedAt: occurredAt },
      });
      push(builder, {
        type: "photo_report",
        orderId,
        occurredAt,
        actor: factory,
        title: "Фотоотчёт: раскрой, партия белая",
        detail: "2 фото · технолог «Волна»",
        photos: [
          photo("ph-4812-1", "раскрой, стол 1", "a", occurredAt),
          photo("ph-4812-2", "раскрой, стол 2", "a", occurredAt),
        ],
        caption: "Раскрой, партия белая",
      });
      push(builder, {
        type: "progress",
        orderId,
        occurredAt,
        actor: factory,
        title: "Печать запланирована на 26.09",
        detail: "стартует после окончания пошива",
        progress: {
          id: "print",
          title: "Принт",
          done: 0,
          total: 1000,
          note: "с 26.09",
          updatedAt: occurredAt,
        },
      });
    }
  }

  const sewingPhotos = at(nowMs, 4, "18:05");
  push(builder, {
    type: "photo_report",
    orderId,
    occurredAt: sewingPhotos,
    actor: factory,
    title: "Фотоотчёт: пошив, 1-я линия",
    detail: "2 фото · технолог «Волна»",
    photos: [
      photo("ph-4812-3", "пошив, 1-я линия", "b", sewingPhotos),
      photo("ph-4812-4", "пошив, контроль шва", "c", sewingPhotos),
    ],
    caption: "Пошив, 1-я линия",
  });

  const density = at(nowMs, 2, "12:30");
  push(builder, {
    type: "photo_report",
    orderId,
    occurredAt: density,
    actor: factory,
    title: "Контроль плотности: 182 г/м²",
    detail: "в допуске ±5 %",
    photos: [photo("ph-4812-5", "контроль плотности", "a", density)],
    caption: "Контроль плотности",
  });

  push(builder, {
    type: "message",
    orderId,
    occurredAt: at(nowMs, 2, "12:34"),
    actor: factory,
    title: `Сообщение · ${factory.name}`,
    detail: null,
    message: {
      id: "msg-4812-1",
      seq: builder.seq + 1,
      orderId,
      channel: "order",
      author: factory,
      text: "Добрый день! Плотность по факту 182 г/м² — в допуске. Фото контроля приложил.",
      attachments: [],
      createdAt: at(nowMs, 2, "12:34"),
      readAt: at(nowMs, 2, "12:40"),
      own: false,
    },
  });
  push(builder, {
    type: "message",
    orderId,
    occurredAt: at(nowMs, 2, "13:02"),
    actor: me,
    title: "Сообщение · Вы",
    detail: null,
    message: {
      id: "msg-4812-2",
      seq: builder.seq + 1,
      orderId,
      channel: "order",
      author: me,
      text: "Спасибо. Принт по макету без изменений?",
      attachments: [],
      createdAt: at(nowMs, 2, "13:02"),
      readAt: at(nowMs, 2, "13:10"),
      own: true,
    },
  });
  push(builder, {
    type: "message",
    orderId,
    occurredAt: at(nowMs, 2, "13:15"),
    actor: factory,
    title: `Сообщение · ${factory.name}`,
    detail: null,
    message: {
      id: "msg-4812-3",
      seq: builder.seq + 1,
      orderId,
      channel: "order",
      author: factory,
      text: "Да, цветопроба согласована, печать начнём 26.09 после окончания пошива.",
      attachments: [],
      createdAt: at(nowMs, 2, "13:15"),
      readAt: null,
      own: false,
    },
  });
  push(builder, {
    type: "note",
    orderId,
    occurredAt: at(nowMs, 2, "13:15"),
    actor: factory,
    title: "Цветопроба согласована",
    detail: "печать стартует 26.09 · сообщение в чате",
    topic: "artwork",
  });

  const sewn = at(nowMs, 0, "09:15");
  push(builder, {
    type: "progress",
    orderId,
    occurredAt: sewn,
    actor: factory,
    title: "Отшито 650 / 1 000",
    detail: "1-я линия, план на неделю выполняется",
    progress: { id: "sewn", title: "Отшито", done: 650, total: 1000, updatedAt: sewn },
  });

  const report = at(nowMs, 0, "16:10");
  push(builder, {
    type: "photo_report",
    orderId,
    occurredAt: report,
    actor: factory,
    title: "Фотоотчёт: готовые изделия, чёрные",
    detail: "4 фото · технолог «Волна»",
    photos: [
      photo("ph-4812-6", "готовые изделия 1", "c", report),
      photo("ph-4812-7", "готовые изделия 2", "c", report),
      photo("ph-4812-8", "готовые изделия 3", "a", report),
      photo("ph-4812-9", "упаковка", "b", report),
    ],
    caption: "Готовые изделия, чёрные",
  });
}

/** Короткий журнал остальных заказов: смены статуса, деньги и по одному фотоотчёту. */
function seedJournalGeneric(
  builder: JournalBuilder,
  seed: SeedInput,
  factoryName: string,
  quote: Pick<Quote, "total" | "delivery">,
  nowMs: number,
): void {
  const total: Kopecks = quote.total;
  const orderId = seed.id;
  const factory = FACTORY(factoryName);
  const reached = PATH.slice(0, PATH.indexOf(seed.status) + 1);
  const span = Math.max(1, seed.submittedDaysAgo - 1);
  const step = span / Math.max(1, reached.length - 1 || 1);

  let previous: OrderStatus | null = "draft";
  reached.forEach((status, index) => {
    const daysAgo = Math.max(0, Math.round(seed.submittedDaysAgo - step * index));
    const occurredAt = at(nowMs, daysAgo, index === 0 ? "11:20" : "14:30");
    const text = statusEventText(status);
    push(builder, {
      type: "status_changed",
      orderId,
      occurredAt,
      actor: SYSTEM,
      title: text.title,
      detail: text.detail ?? null,
      from: previous,
      to: status,
      stage: customerStageOf(status),
    });
    previous = status;

    if (status === "awaiting_confirmation") {
      push(builder, {
        type: "money",
        orderId,
        occurredAt,
        actor: SYSTEM,
        title: "Оплата зарезервирована в эскроу",
        detail: null,
        operation: "hold",
        amount: total,
      });
    }
    if (status === "in_production") {
      push(builder, {
        type: "progress",
        orderId,
        occurredAt,
        actor: factory,
        title: `Раскроено ${String(seed.qty)} / ${String(seed.qty)}`,
        detail: null,
        progress: {
          id: "cut",
          title: "Раскроено",
          done: seed.qty,
          total: seed.qty,
          updatedAt: occurredAt,
        },
      });
      push(builder, {
        type: "photo_report",
        orderId,
        occurredAt,
        actor: factory,
        title: "Фотоотчёт: партия в работе",
        detail: "1 фото",
        photos: [photo(`ph-${String(orderId)}-1`, "партия в работе", "b", occurredAt)],
        caption: "Партия в работе",
      });
    }
    if (status === "quality_control") {
      push(builder, {
        type: "progress",
        orderId,
        occurredAt,
        actor: factory,
        title: `Отшито ${String(seed.qty)} / ${String(seed.qty)}`,
        detail: null,
        progress: {
          id: "sewn",
          title: "Отшито",
          done: seed.qty,
          total: seed.qty,
          updatedAt: occurredAt,
        },
      });
    }
    if (status === "completed") {
      // в ledger уходит сумма ЗА вычетом комиссии платформы — ровно та, что получит завод;
      // комиссия только со стоимости товара (п. 2)
      const fee = platformFeeOf(total, quote.delivery);
      push(builder, {
        type: "money",
        orderId,
        occurredAt,
        actor: SYSTEM,
        title: "Выплата фабрике после приёмки",
        detail: `комиссия платформы ${String(Math.round(fee / 100))} ₽`,
        operation: "release",
        amount: total - fee,
      });
    }
  });
}

export interface SeededDemo {
  orders: MockOrder[];
  /** Журналы по заказам: номер заказа → события по возрастанию `seq`. */
  events: Record<string, OrderEvent[]>;
}

/** История демо-компании: пять заказов из макета с журналами. */
export function seedDemoOrders(
  orgId: string,
  legalAddress: string | null,
  nowMs: number,
): SeededDemo {
  const orders: MockOrder[] = [];
  const events: Record<string, OrderEvent[]> = {};

  for (const seed of SEEDS) {
    const offer = requireMockOffer(seed.offerId);
    const submittedAt = at(nowMs, seed.submittedDaysAgo, "11:20");
    const submittedMs = Date.parse(submittedAt);
    const quote = quoteOf(seed, submittedMs);
    const params = defaultParams(seed.qty, seed.optionIds);
    if (seed.colors) params.colors = seed.colors;
    if (seed.print !== undefined) params.print = seed.print;
    if (seed.fit !== undefined) params.fit = seed.fit;
    if (seed.colors) {
      // размерный ряд пересобираем под фактическую разбивку по цветам
      params.sizes = defaultParams(seed.qty, seed.optionIds).sizes;
    }

    const builder: JournalBuilder = { events: [], seq: 0 };
    if (seed.id === 4812) seedJournal4812(builder, seed, offer.factory.name, nowMs);
    else seedJournalGeneric(builder, seed, offer.factory.name, quote, nowMs);

    const deliveryOption = offer.delivery.find((item) => item.id === seed.deliveryId);
    const paidAt = builder.events.find(
      (event) => event.type === "status_changed" && event.to === "awaiting_confirmation",
    )?.occurredAt;
    const deliveredAt = builder.events.find(
      (event) => event.type === "status_changed" && event.to === "acceptance",
    )?.occurredAt;
    const acceptedAt = builder.events.find(
      (event) => event.type === "status_changed" && event.to === "completed",
    )?.occurredAt;
    const lastAt = builder.events.at(-1)?.occurredAt ?? submittedAt;

    orders.push({
      orgId,
      id: seed.id,
      status: seed.status,
      customerStage: customerStageOf(seed.status),
      bucket: orderBucketOf(seed.status),
      createdAt: submittedAt,
      updatedAt: lastAt,
      offer: {
        id: offer.id,
        title: offer.title,
        factoryId: offer.factory.id,
        factoryName: offer.factory.name,
        factoryCity: offer.factory.city,
        tone: offer.tone ?? null,
      },
      quoteId: quote.id ?? "",
      quote,
      quoteValidUntil: quote.validUntil ?? null,
      repeat: false,
      promo: null,
      params,
      artwork: [
        {
          id: `art-${String(seed.id)}`,
          fileName: "logo_front.pdf",
          size: 1_258_291,
          contentType: "application/pdf",
          status: "approved",
          url: `#/artwork/${String(seed.id)}`,
          uploadedAt: submittedAt,
          error: null,
        },
      ],
      delivery: deliveryOption
        ? {
            optionId: deliveryOption.id,
            title: deliveryOption.title,
            price: deliveryOption.price,
            kind:
              deliveryOption.id === "pickup"
                ? "pickup"
                : deliveryOption.id === "address"
                  ? "address"
                  : "marketplace_warehouse",
            address: deliveryOption.id === "wb" ? "Коледино, Московская обл., склад WB" : null,
            recipientName: null,
            recipientPhone: null,
            comment: null,
          }
        : null,
      payer: {
        orgId,
        name: "ООО «Кора»",
        inn: "7707083893",
        kpp: "770101001",
        legalAddress,
        accountantEmail: "buh@kora.ru",
      },
      paymentMethod: "escrow_full",
      paymentOptions: [],
      documents: documentsOf(seed, submittedAt),
      payment: null,
      submittedAt,
      paidAt: paidAt ?? null,
      confirmDeadlineAt: null,
      shipDate: seed.shipDate,
      deliveredAt: deliveredAt ?? null,
      acceptedAt: acceptedAt ?? null,
      repeatDiscountPercent: offer.repeatDiscountPercent ?? null,
      repeatOfOrderId: null,
    });

    events[String(seed.id)] = builder.events;
  }

  return { orders, events };
}

/** Сообщения ветки из журнала — чат и лента читают один источник. */
export function messagesOf(events: readonly OrderEvent[], channel: string): OrderMessage[] {
  const items: OrderMessage[] = [];
  for (const event of events) {
    if (event.type === "message" && event.message.channel === channel) items.push(event.message);
  }
  return items;
}
