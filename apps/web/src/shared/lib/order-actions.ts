import type { Order, OrderStatus } from "@partiya/api-contracts";

/* Какие действия доступны заказчику в текущем статусе — проекция автомата 5.2.
 *
 * Правило одно: список действий выводится из статуса, а не из того, какие кнопки удобно
 * показать. Иначе «Принять партию» появляется в производстве, сервер отвечает 409, и
 * человек узнаёт о правилах из текста ошибки.
 *
 * Функция чистая и лежит в shared рядом с `order-status.ts`: её знают и экран трекинга,
 * и шапка приёмки, и таблица кабинета. */

export type OrderActionKind =
  /** Продолжить оформление черновика. */
  | "continue_draft"
  /** Открыть счёт и реквизиты. */
  | "pay"
  /** Согласовать макет и цветопробу (команда `ApproveArtwork`, актор — заказчик). */
  | "approve_artwork"
  /** Написать технологу. */
  | "message"
  /** Принять партию (команда `Accept`). */
  | "accept"
  /** Открыть спор (команда `OpenDispute`; допустима из `in_production` и `acceptance`). */
  | "dispute"
  /** Смотреть открытый спор. */
  | "view_dispute"
  /** Повторить партию со скидкой. */
  | "repeat"
  /** Отменить заказ до оплаты (п. 17, `canCancel` с сервера). */
  | "cancel";

/** Что нужно знать о заказе, чтобы решить. Не весь `Order` — так функция проверяется
    тестом на голых данных, без сборки фикстуры заказа целиком. */
export interface OrderActionContext {
  status: OrderStatus;
  /** Открыт ли спор прямо сейчас. */
  disputeOpen?: boolean;
  /** Окно приёмки ещё идёт: после `autoAcceptAt` сервер примет партию сам. */
  acceptanceOpen?: boolean;
  /** Сервер разрешает отменить заказ самому (`Order.canCancel`, п. 17). */
  canCancel?: boolean;
  /** Заказчик уже подписал макет (`artworkSignoff.customerApprovedAt`, п. 16). */
  artworkSignedByCustomer?: boolean;
}

/** Доступные действия в порядке важности: первое — главное на экране. */
export function orderActions(context: OrderActionContext): OrderActionKind[] {
  const actions = statusActions(context);
  // отмена — всегда последняя и никогда не главная: её решает сервер, а не статус
  return context.canCancel === true ? [...actions, "cancel"] : actions;
}

function statusActions(context: OrderActionContext): OrderActionKind[] {
  const { status } = context;
  const disputeOpen = context.disputeOpen === true;

  if (disputeOpen) return ["view_dispute", "message"];

  switch (status) {
    case "draft":
      return ["continue_draft"];
    case "awaiting_payment":
      return ["pay"];
    case "awaiting_confirmation":
    case "confirmed":
      return ["message"];
    case "artwork_review":
      // своя подпись уже стоит — ждём технолога, повторно подписывать нечего
      return context.artworkSignedByCustomer === true
        ? ["message"]
        : ["approve_artwork", "message"];
    case "materials":
      return ["message"];
    // спор из производства разрешён автоматом: партия ещё не доехала, но брак уже виден
    case "in_production":
      return ["message", "dispute"];
    case "quality_control":
    case "shipped":
      return ["message"];
    case "acceptance":
      // окно закрылось — сервер примет партию сам, и кнопки уже ничего не меняют
      return context.acceptanceOpen === false ? ["message"] : ["accept", "dispute", "message"];
    case "dispute":
      return ["view_dispute", "message"];
    case "completed":
      return ["repeat"];
    case "declined":
    case "refunded":
    case "cancelled":
      return [];
    default:
      return [];
  }
}

/** Те же действия по заказу целиком — форма, в которой их спрашивают экраны. */
export function orderActionsOf(order: Order, now: number = Date.now()): OrderActionKind[] {
  const dispute = order.dispute ?? null;
  const acceptance = order.acceptance ?? null;
  return orderActions({
    status: order.status,
    disputeOpen:
      dispute !== null && dispute.status !== "resolved" && dispute.status !== "withdrawn",
    acceptanceOpen: acceptance === null ? undefined : Date.parse(acceptance.autoAcceptAt) > now,
    canCancel: order.canCancel === true,
    artworkSignedByCustomer: (order.artworkSignoff?.customerApprovedAt ?? null) !== null,
  });
}

/** Подписи кнопок — из макета. Скидку за повтор подставляет вызывающий. */
export const ORDER_ACTION_TITLES: Record<OrderActionKind, string> = {
  continue_draft: "Продолжить оформление",
  pay: "Оплатить счёт",
  approve_artwork: "Согласовать макет",
  message: "Написать технологу",
  accept: "Принять партию",
  dispute: "Открыть спор",
  view_dispute: "Перейти к спору",
  repeat: "Повторить партию",
  cancel: "Отменить заказ",
};

/** Главное действие рисуется `cta`, остальные — обычными кнопками. */
export function isPrimaryAction(kind: OrderActionKind, actions: OrderActionKind[]): boolean {
  return actions[0] === kind;
}
