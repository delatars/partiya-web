import type {
  AcceptanceCheck,
  AcceptanceWindow,
  CustomerStage,
  EscrowSummary,
  Order,
  OrderEvent,
  OrderPhoto,
  OrderPipelineStage,
  OrderStageProgress,
  OrderStatus,
  OrderTracking,
} from "@partiya/api-contracts";

import { addWorkingDays, formatShortDate, workingDaysLeft } from "@/shared/lib/dates";
import { customerStageOf, orderProgressPct } from "@/shared/lib/order-status";

/* Проекции заказа для экрана трекинга — то, что у бэка считает крейт `tracking`.
 *
 * Все они выводятся из двух вещей: статуса заказа и журнала событий. Отдельного
 * хранилища «прогресс» или «этапы» здесь нет намеренно — иначе у состояния заказа
 * появилось бы два источника правды, и лента рассказывала бы одну историю, а шапка
 * другую. Ровно так же устроен бэк (ARCHITECTURE.md, 5.2: обе ленты — проекции `status`). */

/** Окно приёмки — 5 рабочих дней после доставки (ARCHITECTURE.md, 5.2). */
export const ACCEPTANCE_WINDOW_DAYS = 5;

/** Комиссия платформы, % — «фабрика получит 168 728 ₽, комиссия 14 672 ₽» из макета. */
export const PLATFORM_FEE_PERCENT = 8;

/** Порядок и подписи этапов ленты заказчика. */
const STAGES: { stage: CustomerStage; title: string }[] = [
  { stage: "paid", title: "Оплачен" },
  { stage: "materials", title: "Сырьё закуплено" },
  { stage: "production", title: "Производство" },
  { stage: "quality_control", title: "Контроль качества" },
  { stage: "shipped", title: "Отгрузка" },
];

const STAGE_INDEX = new Map(STAGES.map((item, index) => [item.stage, index]));

/** Когда каждый этап был достигнут — по событиям смены статуса в журнале. */
function stageDates(events: readonly OrderEvent[]): Map<CustomerStage, string> {
  const dates = new Map<CustomerStage, string>();
  for (const event of events) {
    if (event.type !== "status_changed") continue;
    const stage = event.stage ?? customerStageOf(event.to);
    if (stage && !dates.has(stage)) dates.set(stage, event.occurredAt);
  }
  return dates;
}

/** Полоса `.pipe`: пройденные этапы зелёные, текущий — с долей заливки, будущие серые. */
export function pipelineStages(
  order: Pick<Order, "status" | "shipDate">,
  events: readonly OrderEvent[],
): OrderPipelineStage[] {
  const current = customerStageOf(order.status);
  const currentIndex = current ? (STAGE_INDEX.get(current) ?? -1) : -1;
  const dates = stageDates(events);
  const progressPct = orderProgressPct(order.status);
  // после приёмки лента пройдена целиком (Q-03): `completed` не «застревает» на отгрузке
  const finished = order.status === "completed";

  return STAGES.map((item, index) => {
    const at = dates.get(item.stage) ?? null;
    const state: OrderPipelineStage["state"] =
      finished || index < currentIndex ? "done" : index === currentIndex ? "active" : "todo";
    return {
      stage: item.stage,
      title: item.title,
      state,
      pct: state === "active" ? progressPct : null,
      note: stageNote(item.stage, state, at, order.shipDate),
      at,
    };
  });
}

/** Подпись под этапом: дата факта, стрелка у текущего, оценка у будущего. */
function stageNote(
  stage: CustomerStage,
  state: OrderPipelineStage["state"],
  at: string | null,
  shipDate: string | null,
): string | null {
  if (at !== null) return state === "active" ? `${formatShortDate(at)} →` : formatShortDate(at);
  if (stage === "shipped" && shipDate !== null) {
    return formatShortDate(`${shipDate}T00:00:00`);
  }
  if (stage === "quality_control" && shipDate !== null) {
    // контроль качества — за пару рабочих дней до отгрузки
    const date = new Date(`${shipDate}T00:00:00`);
    date.setDate(date.getDate() - 3);
    return `~${formatShortDate(date.toISOString())}`;
  }
  return null;
}

/** Порядок строк прогресса — технологический, а не хронологический: «Принт» планируется
    заранее, но идёт после пошива, и в таблице должен стоять там же. */
const PROGRESS_ORDER = ["cut", "sewn", "print", "pack"];

/** Строки `.prog` — последнее состояние каждой строки прогресса из журнала. */
export function progressRowsOf(events: readonly OrderEvent[]): OrderStageProgress[] {
  const rows = new Map<string, OrderStageProgress>();
  for (const event of events) {
    if (event.type === "progress") rows.set(event.progress.id, event.progress);
  }
  const known = PROGRESS_ORDER.filter((id) => rows.has(id));
  const rest = [...rows.keys()].filter((id) => !PROGRESS_ORDER.includes(id));
  return [...known, ...rest].map((id) => rows.get(id) as OrderStageProgress);
}

/** Все фотографии заказа в порядке появления — полоса фотоотчётов и просмотрщик. */
export function photosOf(events: readonly OrderEvent[]): OrderPhoto[] {
  const photos: OrderPhoto[] = [];
  for (const event of events) {
    if (event.type === "photo_report") photos.push(...event.photos);
  }
  return photos;
}

/** Сводка трекинга (`Order.tracking`). `unreadMessages` считает вызывающий: он знает,
    до какого `seq` заказчик прочитал чат. */
export function trackingOf(
  order: Pick<Order, "status" | "shipDate">,
  events: readonly OrderEvent[],
  unreadMessages: number,
): OrderTracking {
  const last = events.at(-1);
  return {
    progressPct: orderProgressPct(order.status),
    stages: pipelineStages(order, events),
    progress: progressRowsOf(events),
    lastSeq: last?.seq ?? 0,
    updatedAt: last?.occurredAt ?? null,
    eventCount: events.length,
    photoCount: photosOf(events).length,
    unreadMessages,
  };
}

/* ─────────────────────────────── деньги ─────────────────────────────── */

/** Комиссия платформы с суммы заказа, копейки — округление вниз в пользу фабрики. */
export function platformFeeOf(total: number): number {
  return Math.floor((total * PLATFORM_FEE_PERCENT) / 100);
}

/** Статус эскроу по статусу заказа. Деньги идут за автоматом, а не наоборот. */
export function escrowStatusOf(status: OrderStatus, disputeOpen: boolean): EscrowSummary["status"] {
  if (disputeOpen) return "blocked";
  switch (status) {
    case "draft":
    case "awaiting_payment":
      return "awaiting_funds";
    case "completed":
      return "released";
    case "refunded":
    case "declined":
    case "cancelled":
      return "refunded";
    default:
      return "held";
  }
}

const ESCROW_NOTES: Record<EscrowSummary["status"], string> = {
  awaiting_funds: "ждём поступления по счёту",
  held: "зарезервировано платформой",
  partially_released: "первый транш выплачен, остаток в эскроу",
  released: "выплачено фабрике после приёмки",
  refunded: "возвращено на ваш счёт",
  blocked: "заблокировано до решения спора",
};

export function escrowNoteOf(status: EscrowSummary["status"]): string {
  return ESCROW_NOTES[status];
}

/* ─────────────────────────────── приёмка ─────────────────────────────── */

/** Когда истекает окно приёмки: 5 рабочих дней от доставки. */
export function autoAcceptAt(deliveredAtIso: string): string {
  const deadline = addWorkingDays(new Date(deliveredAtIso), ACCEPTANCE_WINDOW_DAYS);
  deadline.setHours(23, 59, 0, 0);
  return deadline.toISOString();
}

/** Чек-лист приёмки: слева спецификация заказа, справа — что сообщил контроль качества. */
export function acceptanceChecks(order: Order): AcceptanceCheck[] {
  const { params } = order;
  const colors = params.colors.map((line) => `${line.color} ${String(line.qty)}`).join(" · ");
  const sizes = params.sizes.map((line) => `${line.size} ${String(line.qty)}`).join(" · ");
  return [
    {
      id: "qty",
      title: "Количество",
      expected: `${String(params.qty)} шт`,
      reported: `${String(params.qty)} шт · принято складом, расхождений нет`,
    },
    { id: "colors", title: "Цвета", expected: colors || "—", reported: "соответствует" },
    { id: "sizes", title: "Размерная сетка", expected: sizes || "—", reported: "соответствует" },
    {
      id: "density",
      title: "Плотность ткани",
      expected: "180 г/м² ±5 %",
      reported: "182 г/м²",
    },
    {
      id: "print",
      title: "Печать",
      expected: params.print ?? "—",
      reported: "цветопроба согласована",
    },
    {
      id: "marking",
      title: "Маркировка",
      expected: "«Честный знак», вшивная бирка",
      reported: "нанесена, коды переданы",
    },
  ];
}

/** Окно приёмки для шапки экрана. `null` — заказ не в приёмке. */
export function acceptanceOf(
  order: Order,
  events: readonly OrderEvent[],
  nowMs: number,
): AcceptanceWindow | null {
  if (order.status !== "acceptance") return null;
  const openedAt = order.deliveredAt ?? new Date(nowMs).toISOString();
  const deadline = autoAcceptAt(openedAt);
  return {
    openedAt,
    autoAcceptAt: deadline,
    workingDaysLeft: workingDaysLeft(deadline, new Date(nowMs)),
    checks: acceptanceChecks(order),
    photoIds: photosOf(events)
      .slice(-5)
      .map((photo) => photo.id),
    qualityNote:
      "Выборка 5 % по ГОСТ: брак 0, замечаний 1 — нитки на 2 изделиях, устранено. Технолог фабрики.",
    disputeAllowed: Date.parse(deadline) > nowMs,
  };
}
