import type { Order } from "@partiya/api-contracts";

import { isUsableArtwork } from "./artwork";

/* Состояние аккордеона оформления — чистая функция от черновика.

   Считать его в компоненте нельзя: «первый незаполненный шаг», подсветка и блокировка
   кнопки «Оплатить» должны совпадать с тем, что на submit скажет сервер. Поэтому правила
   здесь ровно те же, что в `missingFields` мок-бэкенда, и проверяются тестом.

   Один шаг может быть не заполнен, а следующий — заполнен (человек вернулся назад),
   поэтому это не линейный мастер: `done` считается для каждого шага независимо. */

export const CHECKOUT_STEPS = ["params", "delivery", "payer", "payment"] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

/** `done` — заполнен, `on` — открыт сейчас, `todo` — ещё не заполнен (классы `.acc` макета). */
export type StepState = "done" | "on" | "todo";

export const STEP_TITLES: Record<CheckoutStep, string> = {
  params: "Параметры партии и макет",
  delivery: "Доставка",
  payer: "Плательщик и документы",
  payment: "Оплата",
};

/** Короткое имя для подписи кнопки «Дальше · доставка». */
export const STEP_SHORT_TITLES: Record<CheckoutStep, string> = {
  params: "параметры",
  delivery: "доставка",
  payer: "плательщик",
  payment: "оплата",
};

/** Подпись кнопки перехода: она обязана называть тот шаг, который реально откроется.
    Мастер не линейный — «Дальше» ведёт к первому незаполненному, а не к следующему
    по счёту, и врать об этом кнопка не должна. */
export function nextStepLabel(target: CheckoutStep | null): string {
  return target === null ? "Всё заполнено" : `Дальше · ${STEP_SHORT_TITLES[target]}`;
}

/** Что человек подтвердил в браузере и чего нет в черновике на сервере.
 *
 * ⚠ Принятие оферты сервер пока никак не фиксирует: `POST /orders/{id}/submit` тела
 * не имеет (ARCHITECTURE.md, 8.4). До решения вопроса галочка живёт на клиенте —
 * см. отчёт, Q-C5. */
export interface LocalCheckoutState {
  offerAccepted: boolean;
}

/** Заполнен ли шаг «Параметры партии и макет». */
export function isParamsDone(order: Order): boolean {
  const { params } = order;
  const qty = params.qty;
  const sum = (lines: readonly { qty: number }[]) =>
    lines.reduce((total, line) => total + line.qty, 0);

  if (params.colors.length === 0 || sum(params.colors) !== qty) return false;
  if (params.sizes.length === 0 || sum(params.sizes) !== qty) return false;
  if (params.print === null || params.print.trim().length === 0) return false;

  // «Без печати» — единственный случай, когда макет не нужен
  const withoutPrint = params.print.toLowerCase().includes("без печати");
  if (withoutPrint) return true;
  return order.artwork.some(isUsableArtwork);
}

export function isDeliveryDone(order: Order): boolean {
  const delivery = order.delivery;
  if (!delivery) return false;
  if (delivery.kind !== "address") return true;
  // до двери нужен адрес и тот, кто откроет: склад маркетплейса платформа знает сама
  return Boolean(
    delivery.address?.trim() && delivery.recipientName?.trim() && delivery.recipientPhone?.trim(),
  );
}

export function isPayerDone(order: Order, local: LocalCheckoutState): boolean {
  if (!order.payer) return false;
  if (!order.payer.legalAddress?.trim()) return false;
  return local.offerAccepted;
}

export function isPaymentDone(order: Order): boolean {
  if (order.paymentMethod === null) return false;
  const option = order.paymentOptions.find((item) => item.method === order.paymentMethod);
  return option?.available !== false;
}

export function isStepDone(step: CheckoutStep, order: Order, local: LocalCheckoutState): boolean {
  switch (step) {
    case "params":
      return isParamsDone(order);
    case "delivery":
      return isDeliveryDone(order);
    case "payer":
      return isPayerDone(order, local);
    case "payment":
      return isPaymentDone(order);
    default:
      return false;
  }
}

/** Состояния всех четырёх шагов. Открытый шаг показывается как `on`, даже если заполнен:
    человек его сейчас правит, и рисовать галочку поверх открытой формы — вранье. */
export function stepStates(
  order: Order,
  local: LocalCheckoutState,
  open: CheckoutStep | null,
): Record<CheckoutStep, StepState> {
  const states = {} as Record<CheckoutStep, StepState>;
  for (const step of CHECKOUT_STEPS) {
    states[step] = step === open ? "on" : isStepDone(step, order, local) ? "done" : "todo";
  }
  return states;
}

/** Первый незаполненный шаг — на него экран открывается и на него же уводит ошибка
    submit. `null` — заполнено всё, можно платить. */
export function firstIncompleteStep(order: Order, local: LocalCheckoutState): CheckoutStep | null {
  return CHECKOUT_STEPS.find((step) => !isStepDone(step, order, local)) ?? null;
}

export function canSubmit(order: Order, local: LocalCheckoutState): boolean {
  return order.status === "draft" && firstIncompleteStep(order, local) === null;
}

/** Какой шаг открыть следующим после заполнения текущего: следующий незаполненный
    после него, а если таких нет — первый незаполненный вообще. */
export function nextStepAfter(
  step: CheckoutStep,
  order: Order,
  local: LocalCheckoutState,
): CheckoutStep | null {
  const index = CHECKOUT_STEPS.indexOf(step);
  const after = CHECKOUT_STEPS.slice(index + 1).find((item) => !isStepDone(item, order, local));
  return after ?? firstIncompleteStep(order, local);
}

/** Поле ошибки сервера → шаг, который надо открыть. Ключи — из `errors` problem+json. */
export function stepOfField(field: string): CheckoutStep {
  if (field.startsWith("delivery")) return "delivery";
  if (field.startsWith("payer")) return "payer";
  if (field === "paymentMethod") return "payment";
  return "params";
}
