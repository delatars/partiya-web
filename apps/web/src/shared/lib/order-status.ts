import type { CustomerStage, OrderBucket, OrderStatus } from "@partiya/api-contracts";

/* Проекции автомата заказа: русское название, тон бейджа, вкладка кабинета и
   укрупнённая стадия трекинга.

   Всё это считается из одного `status` — так выполняется тезис «статусы стандартизованы»
   (ARCHITECTURE.md, 5.2). Функции чистые и лежат в shared, потому что их знают и таблица
   кабинета, и экран оплаты, и мок-бэкенд заказов.

   ⚠ `bucket` и `customerStage` в контракте приходят с сервера — он авторитетен. Эти
   функции нужны, чтобы моки считали их теми же правилами, а не «как получится». */

/** Тон бейджа `Tag` — те же значения, что в `statusColor` макета. */
export type OrderTone = "new" | "work" | "qc" | "done" | "hot";

interface StatusView {
  title: string;
  tone: OrderTone;
  bucket: OrderBucket;
  stage: CustomerStage | null;
  /** Готовность партии, % — грубая проекция для колонки таблицы. */
  progressPct: number;
}

/* Порядок строк повторяет порядок автомата из `crates/orders/src/domain/status.rs`. */
const VIEWS: Record<OrderStatus, StatusView> = {
  draft: { title: "Черновик", tone: "done", bucket: "action", stage: null, progressPct: 0 },
  awaiting_payment: {
    title: "Ожидает оплаты",
    tone: "new",
    bucket: "action",
    stage: null,
    progressPct: 0,
  },
  awaiting_confirmation: {
    title: "Ожидает подтверждения",
    tone: "new",
    bucket: "action",
    stage: "paid",
    progressPct: 0,
  },
  confirmed: { title: "Подтверждён", tone: "work", bucket: "work", stage: "paid", progressPct: 5 },
  declined: {
    title: "Отклонён фабрикой",
    tone: "done",
    bucket: "cancelled",
    stage: null,
    progressPct: 0,
  },
  artwork_review: {
    title: "Макет на согласовании",
    tone: "work",
    bucket: "action",
    stage: "paid",
    progressPct: 10,
  },
  materials: {
    title: "Сырьё закуплено",
    tone: "work",
    bucket: "work",
    stage: "materials",
    progressPct: 25,
  },
  in_production: {
    title: "В производстве",
    tone: "work",
    bucket: "work",
    stage: "production",
    progressPct: 65,
  },
  quality_control: {
    title: "Контроль качества",
    tone: "qc",
    bucket: "work",
    stage: "quality_control",
    progressPct: 92,
  },
  shipped: { title: "Отгружен", tone: "qc", bucket: "work", stage: "shipped", progressPct: 97 },
  acceptance: {
    title: "Ожидает приёмки",
    tone: "qc",
    bucket: "action",
    stage: "shipped",
    progressPct: 99,
  },
  dispute: { title: "Спор", tone: "hot", bucket: "action", stage: "shipped", progressPct: 99 },
  completed: { title: "Получен", tone: "done", bucket: "done", stage: "shipped", progressPct: 100 },
  refunded: { title: "Возврат", tone: "done", bucket: "cancelled", stage: null, progressPct: 0 },
  cancelled: { title: "Отменён", tone: "done", bucket: "cancelled", stage: null, progressPct: 0 },
};

/** Название статуса по-русски. Незнакомый статус (бэк уехал вперёд) показываем кодом —
    это честнее, чем подставить «Неизвестно» и спрятать факт расхождения. */
export function orderStatusTitle(status: OrderStatus): string {
  return VIEWS[status]?.title ?? status;
}

export function orderStatusTone(status: OrderStatus): OrderTone {
  return VIEWS[status]?.tone ?? "done";
}

/** Вкладка кабинета. У сервера это поле заказа; здесь — то же правило для моков. */
export function orderBucketOf(status: OrderStatus): OrderBucket {
  return VIEWS[status]?.bucket ?? "work";
}

export function customerStageOf(status: OrderStatus): CustomerStage | null {
  return VIEWS[status]?.stage ?? null;
}

export function orderProgressPct(status: OrderStatus): number {
  return VIEWS[status]?.progressPct ?? 0;
}

/** Заказ ещё оформляется: черновик можно продолжить, всё остальное — только смотреть. */
export function isDraftStatus(status: OrderStatus): boolean {
  return status === "draft";
}

/** Деньги ещё не в эскроу — экран оплаты имеет смысл. */
export function isAwaitingPayment(status: OrderStatus): boolean {
  return status === "awaiting_payment";
}
