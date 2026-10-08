import type {
  AcceptanceCheck,
  AcceptanceWindow,
  CustomerStage,
  EscrowSummary,
  FinalPayment,
  Order,
  OrderEvent,
  OrderPhoto,
  OrderPipelineStage,
  OrderStageProgress,
  OrderStatus,
  OrderTracking,
} from "@partiya/api-contracts";

import { addWorkingDays, formatShortDate, workingDaysLeft } from "@/shared/lib/dates";
import { feeOf, PLATFORM_FEE_PERCENT } from "@/shared/lib/fee";

import type { NewOrderEvent } from "./mock-seed";
import { customerStageOf, orderProgressPct } from "@/shared/lib/order-status";

/* Проекции заказа для экрана трекинга — то, что у бэка считает крейт `tracking`.
 *
 * Все они выводятся из двух вещей: статуса заказа и журнала событий. Отдельного
 * хранилища «прогресс» или «этапы» здесь нет намеренно — иначе у состояния заказа
 * появилось бы два источника правды, и лента рассказывала бы одну историю, а шапка
 * другую. Ровно так же устроен бэк (ARCHITECTURE.md, 5.2: обе ленты — проекции `status`). */

/** Окно приёмки — 5 рабочих дней после доставки (ARCHITECTURE.md, 5.2). */
export const ACCEPTANCE_WINDOW_DAYS = 5;

/** Комиссия платформы, % — одна константа на весь фронт (`shared/lib/fee.ts`). */
export { PLATFORM_FEE_PERCENT };

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

/** Комиссия платформы с суммы заказа, копейки (DECISIONS.md, п. 2): только со стоимости
    товара — доставка `delivery` из котировки не облагается. Округление — как `payments::fee_of`. */
export function platformFeeOf(total: number, delivery = 0): number {
  return feeOf(total, delivery);
}

/** Комиссия по заказу: сумма и доставка — из снимка котировки. */
export function orderFeeOf(order: { quote: { total: number; delivery: number } }): number {
  return platformFeeOf(order.quote.total, order.quote.delivery);
}

/** Выплата заводу по заказу — остаток вычитанием, как `release_split`. */
export function orderPayoutOf(order: { quote: { total: number; delivery: number } }): number {
  return order.quote.total - orderFeeOf(order);
}

/* ───────── 50/50 (DECISIONS.md, п. 4 и 6) ───────── */

/** Схема из двух платежей. */
export function isSplitPayment(order: Pick<Order, "paymentMethod">): boolean {
  return order.paymentMethod === "escrow_split_50_50";
}

/** Первый транш 50/50 — половина вверх (как `PaymentMethodOption::amount_due` бэка). */
export function firstTrancheAmount(total: number): number {
  return Math.ceil(total / 2);
}

/** Второй транш — остаток вычитанием: сумма траншей обязана совпасть с заказом. */
export function secondTrancheAmount(total: number): number {
  return total - firstTrancheAmount(total);
}

/** Назначение платежа (`payments::domain::reference`): номер заказа и спецификации,
    у 50/50 — ещё «платёж N из 2». Формулировка «Без НДС» — на проверке у юриста (п. 6). */
export function paymentPurpose(orderId: number, tranche?: { no: number; of: number }): string {
  const no = String(orderId);
  const part =
    tranche && tranche.of > 1 ? `, платёж ${String(tranche.no)} из ${String(tranche.of)}` : "";
  return `Оплата по заказу № ${no}, спецификация ${no}-С${part}. Без НДС`;
}

/** Номер счёта, как его выдаёт `payments`: `4813-СЧ` — разовая оплата, `4813-1-СЧ` /
    `4813-2-СЧ` — транши 50/50. Экран показывает строку как есть и сам её не собирает. */
export function invoiceNumberOf(orderId: number, trancheNo?: number): string {
  return trancheNo === undefined
    ? `${String(orderId)}-СЧ`
    : `${String(orderId)}-${String(trancheNo)}-СЧ`;
}

/** Статусы, в которых второй транш 50/50 уже выставлен: «готов к отгрузке» = переход в
    `quality_control` (Q-342) и всё, что после него. */
export const SECOND_TRANCHE_ISSUED_STATUSES: readonly OrderStatus[] = [
  "quality_control",
  "shipped",
  "acceptance",
  "dispute",
  "completed",
];

/** Срок оплаты второго транша — 48 ч от выставления (`payments::DEFAULT_DEFERRED_DUE`). */
export const SECOND_TRANCHE_DUE_MS = 48 * 60 * 60_000;

/** Минимум полей заказа мока для траншей 50/50 — `MockOrder` без циклического импорта. */
interface SplitOrder {
  id: number;
  paymentMethod: Order["paymentMethod"];
  quote: { total: number };
  secondTrancheDueAt?: string | null;
}

/** «Готов к отгрузке» (переход в `quality_control`, Q-342): у 50/50 выставляется второй
    транш на 48 ч. Повторный вызов срок не сдвигает. `true` — счёт выставлен сейчас. */
export function issueSecondTranche(order: SplitOrder, occurredAt: string, emit: EmitFn): boolean {
  if (!isSplitPayment(order) || order.secondTrancheDueAt != null) return false;
  order.secondTrancheDueAt = new Date(Date.parse(occurredAt) + SECOND_TRANCHE_DUE_MS).toISOString();
  emit(order.id, {
    type: "money",
    orderId: order.id,
    occurredAt,
    actor: { kind: "system", name: "Система", orgId: null },
    title: "Выставлен второй транш · перед отгрузкой",
    detail: paymentPurpose(order.id, { no: 2, of: 2 }),
    operation: "invoice",
    amount: secondTrancheAmount(order.quote.total),
  });
  return true;
}

/* ───────── просрочка второго транша 50/50 (Q-401, вариант «в») ───────── */

/** Автопродление — те же 48 ч, один раз (`payments::AUTO_EXTENSION`). */
export const SECOND_TRANCHE_EXTENSION_MS = SECOND_TRANCHE_DUE_MS;

/** Потолок ручного продления оператором, часов (`MANUAL_EXTENSION_MAX_HOURS`). */
export const MANUAL_EXTENSION_MAX_HOURS = 14 * 24;

/** Строка истории сроков счёта — как `payments.tranche_extensions`. */
export interface TrancheExtensionRecord {
  kind: "auto" | "manual";
  previousDueAt: string;
  dueAt: string;
  comment: string | null;
  at: string;
}

/** Поля заказа мока, которыми живёт второй транш. */
export interface FinalPaymentOrder extends SplitOrder {
  status: OrderStatus;
  secondTranchePaidAt?: string | null;
  /** Сколько раз продлевали срок (авто + вручную). */
  secondTrancheExtensions?: number;
  /** Повторная просрочка: счёт в очереди оператора. */
  secondTrancheOverdueSince?: string | null;
  /** Счёт снят: оператор открыл спор от имени платформы. */
  secondTrancheCancelledAt?: string | null;
  secondTrancheHistory?: TrancheExtensionRecord[];
}

/** «10.10.2026 12:00 МСК» — как `orders::app::msk` бэка. */
export function formatMsk(iso: string): string {
  const date = new Date(Date.parse(iso) + 3 * 60 * 60_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${String(date.getUTCFullYear())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} МСК`;
}

/** Счёт второго транша ждёт денег: выставлен, не оплачен, не снят. */
function finalPaymentOpen(order: FinalPaymentOrder): boolean {
  return (
    isSplitPayment(order) &&
    order.secondTrancheDueAt != null &&
    order.secondTranchePaidAt == null &&
    order.secondTrancheCancelledAt == null &&
    order.status !== "cancelled" &&
    order.status !== "refunded"
  );
}

/** Таймер срока второго транша — у бэка задание `payments.tranche_expire` (Q-401).
    У мока воркера нет, поэтому таймер «срабатывает» лениво при чтении: первая просрочка —
    тот же счёт продлён на 48 ч от прежнего срока, повторная — счёт у оператора.
    `true` — что-то изменилось (надо сохранить). */
export function settleSecondTranche(
  order: FinalPaymentOrder,
  nowMs: number,
  emit: EmitFn,
): boolean {
  let changed = false;
  while (finalPaymentOpen(order) && order.secondTrancheOverdueSince == null) {
    const dueAt = order.secondTrancheDueAt ?? "";
    const due = Date.parse(dueAt);
    if (Number.isNaN(due) || nowMs < due) break;
    changed = true;
    if ((order.secondTrancheExtensions ?? 0) === 0) {
      const next = new Date(due + SECOND_TRANCHE_EXTENSION_MS).toISOString();
      order.secondTrancheExtensions = 1;
      order.secondTrancheDueAt = next;
      (order.secondTrancheHistory ??= []).push({
        kind: "auto",
        previousDueAt: dueAt,
        dueAt: next,
        comment: null,
        at: dueAt,
      });
      emit(order.id, {
        type: "money",
        orderId: order.id,
        occurredAt: dueAt,
        actor: { kind: "system", name: "Система", orgId: null },
        title: `Срок оплаты второго транша продлён до ${formatMsk(next)}`,
        detail: `Счёт ${invoiceNumberOf(order.id, 2)} тот же; срок продлён автоматически, один раз`,
        operation: "invoice",
        amount: secondTrancheAmount(order.quote.total),
      });
    } else {
      order.secondTrancheOverdueSince = dueAt;
      emit(order.id, {
        type: "note",
        orderId: order.id,
        occurredAt: dueAt,
        actor: { kind: "system", name: "Система", orgId: null },
        title: "Второй транш не оплачен и после продления — заказ передан оператору платформы",
        detail: `Счёт ${invoiceNumberOf(order.id, 2)}: решение примет оператор`,
        topic: "payment",
      });
    }
  }
  return changed;
}

/** Второй транш 50/50 в форме контракта (`FinalPayment`). `null` — оплата одним платежом.
    Реквизиты (`instructions`) — только заказчику и пока счёт ждёт оплаты. */
export function finalPaymentOf(
  order: FinalPaymentOrder & { payment?: Order["payment"] },
  withRequisites: boolean,
): FinalPayment | null {
  if (!isSplitPayment(order)) return null;
  const amount = secondTrancheAmount(order.quote.total);
  const dueAt = order.secondTrancheDueAt ?? null;
  const state: FinalPayment["state"] =
    order.secondTranchePaidAt != null
      ? "paid"
      : order.secondTrancheCancelledAt != null
        ? "cancelled"
        : dueAt === null
          ? order.status === "cancelled" || order.status === "refunded"
            ? "cancelled"
            : "not_issued"
          : order.status === "cancelled" || order.status === "refunded"
            ? "cancelled"
            : order.secondTrancheOverdueSince != null
              ? "operator"
              : (order.secondTrancheExtensions ?? 0) > 0
                ? "extended"
                : "awaiting";
  const open = state === "awaiting" || state === "extended" || state === "operator";
  const invoiceNumber = dueAt === null ? null : invoiceNumberOf(order.id, 2);
  const note =
    state === "not_issued"
      ? "Счёт на второй транш выставим, когда партия перейдёт на контроль качества"
      : state === "awaiting"
        ? `Ждём оплату второго транша до ${formatMsk(dueAt ?? "")}`
        : state === "extended"
          ? `Срок оплаты второго транша продлён до ${formatMsk(dueAt ?? "")}`
          : state === "operator"
            ? "Второй транш не оплачен в срок — заказ передан оператору платформы"
            : state === "paid"
              ? "Второй транш оплачен — отгрузка разрешена"
              : "Счёт на второй транш снят";
  const base = order.payment;
  return {
    state,
    invoiceNumber,
    amount,
    dueAt,
    extensions: order.secondTrancheExtensions ?? 0,
    overdueSince: order.secondTrancheOverdueSince ?? null,
    paidAt: order.secondTranchePaidAt ?? null,
    instructions:
      withRequisites && open && invoiceNumber !== null && dueAt !== null
        ? {
            invoiceNumber,
            payeeName: base?.payeeName ?? "ООО «Партия» · номинальный счёт",
            payeeInn: base?.payeeInn ?? "7700000000",
            payeeKpp: base?.payeeKpp ?? "770001001",
            bankName: base?.bankName ?? "банк-партнёр платформы",
            bik: base?.bik ?? "044525999",
            account: base?.account ?? `407028100000${String(order.id).padStart(8, "0")}`,
            correspondentAccount: base?.correspondentAccount ?? "30101810400000000999",
            purpose: paymentPurpose(order.id, { no: 2, of: 2 }),
            amount: order.quote.total,
            amountDue: amount,
            dueAt,
          }
        : null,
    note,
  };
}

/** Нормализация трек-номера как у бэка (`normalize_tracking_number`, Q-350): обрезать
    пробелы по краям; 1–64 символа, без управляющих. `null` — номер не годится. */
export function normalizeTrackingNumber(raw: string): string | null {
  const value = raw.trim();
  if (value.length === 0 || value.length > 64) return null;
  // eslint-disable-next-line no-control-regex -- именно управляющие символы и ищем
  if (/[\u0000-\u001f\u007f]/u.test(value)) return null;
  return value;
}

/** `shipped → acceptance`: доставку отметил завод по трек-номеру или оператор (п. 13).
    Открывается окно приёмки; деньги раскрывает только приёмка заказчика. */
export function markOrderDelivered(
  order: Pick<Order, "id" | "status" | "deliveredAt" | "trackingNumber">,
  occurredAt: string,
  actor: OrderEvent["actor"],
  trackingNumber: string | null,
  emit: EmitFn,
): void {
  order.status = "acceptance";
  order.deliveredAt = occurredAt;
  if (trackingNumber !== null) order.trackingNumber = trackingNumber;
  emit(order.id, {
    type: "status_changed",
    orderId: order.id,
    occurredAt,
    actor,
    title: "Партия доставлена",
    detail:
      trackingNumber === null
        ? "открыто окно приёмки: 5 рабочих дней"
        : `трек-номер ${trackingNumber} · открыто окно приёмки: 5 рабочих дней`,
    from: "shipped",
    to: "acceptance",
    stage: customerStageOf("acceptance"),
  });
}

/* ───────── двойное согласование макета (DECISIONS.md, п. 16; Q-354) ───────── */

type SignableOrder = Pick<Order, "id" | "status" | "artworkSignoff">;
type EmitFn = (orderId: number, event: NewOrderEvent) => void;

/** Подпись стороны под макетом. Порядок любой; заказ уходит в `materials` второй подписью.
    Повторная подпись — без изменений (у бэка 200). Возвращает `true`, если статус сменился. */
export function signArtwork(
  order: SignableOrder,
  side: "customer" | "factory",
  occurredAt: string,
  actor: OrderEvent["actor"],
  emit: EmitFn,
): boolean {
  const signoff = order.artworkSignoff ?? { customerApprovedAt: null, factoryApprovedAt: null };
  const key = side === "customer" ? "customerApprovedAt" : "factoryApprovedAt";
  if (signoff[key] !== null) {
    order.artworkSignoff = signoff;
    return false;
  }
  signoff[key] = occurredAt;
  order.artworkSignoff = signoff;

  const both = signoff.customerApprovedAt !== null && signoff.factoryApprovedAt !== null;
  if (!both) {
    emit(order.id, {
      type: "note",
      orderId: order.id,
      occurredAt,
      actor,
      title:
        side === "factory"
          ? "Технолог согласовал макет: производимость"
          : "Заказчик согласовал макет: визуал",
      detail:
        side === "factory" ? "ждём согласования заказчика" : "ждём согласования технолога завода",
      topic: "artwork",
    });
    return false;
  }

  const from = order.status;
  order.status = "materials";
  emit(order.id, {
    type: "status_changed",
    orderId: order.id,
    occurredAt,
    actor,
    title: "Макет согласован обеими сторонами",
    detail: "фабрика закупает сырьё",
    from,
    to: "materials",
    stage: customerStageOf("materials"),
  });
  return true;
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
