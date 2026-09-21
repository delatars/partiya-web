import type { Order, OrderArtwork } from "@partiya/api-contracts";
import { describe, expect, it } from "vitest";

import {
  canSubmit,
  firstIncompleteStep,
  isDeliveryDone,
  isParamsDone,
  nextStepAfter,
  stepOfField,
  stepStates,
} from "./steps";

/* Правила шагов обязаны совпадать с `missingFields` мок-бэкенда: если они разойдутся,
   кнопка «Оплатить в эскроу» станет активной там, где сервер ответит 422. */

const artwork = (status: OrderArtwork["status"]): OrderArtwork => ({
  id: "art-1",
  fileName: "logo_front.pdf",
  size: 1_200_000,
  contentType: "application/pdf",
  status,
  url: null,
  uploadedAt: null,
  error: null,
});

function order(patch: Partial<Order> = {}): Order {
  const base: Order = {
    id: 4813,
    status: "draft",
    customerStage: null,
    bucket: "action",
    createdAt: "2026-09-21T10:00:00.000Z",
    updatedAt: "2026-09-21T10:00:00.000Z",
    offer: {
      id: 2231,
      title: "Футболки 180 г/м² под СТМ",
      factoryId: 1,
      factoryName: "Волна",
      factoryCity: "Иваново",
      tone: "a",
    },
    quoteId: "q1.2231.1000._.wb._._.1758441600000",
    quote: {
      lines: [],
      unitPrice: 16_800,
      subtotal: 16_800_000,
      discountTotal: 0,
      delivery: 940_000,
      total: 18_340_000,
    },
    quoteValidUntil: null,
    repeat: false,
    promo: null,
    params: {
      qty: 1000,
      optionIds: [],
      colors: [
        { color: "белый", qty: 600 },
        { color: "чёрный", qty: 400 },
      ],
      sizes: [
        { size: "S", qty: 200 },
        { size: "M", qty: 300 },
        { size: "L", qty: 300 },
        { size: "XL", qty: 200 },
      ],
      fit: "классический",
      print: "шелкография, 2 цвета, грудь",
      comment: null,
    },
    artwork: [artwork("review")],
    delivery: {
      optionId: "wb",
      title: "Доставка до склада WB",
      price: 940_000,
      kind: "marketplace_warehouse",
      address: "Коледино",
      recipientName: null,
      recipientPhone: null,
      comment: null,
    },
    payer: {
      orgId: "org-1",
      name: "ООО «Кора»",
      inn: "7707083893",
      kpp: "770101001",
      legalAddress: "Москва, ул. Лесная, 9",
      accountantEmail: null,
    },
    paymentMethod: "escrow_full",
    paymentOptions: [
      {
        method: "escrow_full",
        title: "Эскроу 100 %",
        description: "",
        available: true,
        unavailableReason: null,
        amountDue: 18_340_000,
      },
      {
        method: "escrow_split_50_50",
        title: "Эскроу 50 / 50",
        description: "",
        available: false,
        unavailableReason: "рейтинг фабрики ниже 4,7",
        amountDue: 9_170_000,
      },
    ],
    documents: [],
    payment: null,
    submittedAt: null,
    paidAt: null,
    confirmDeadlineAt: null,
    shipDate: "2026-10-02",
  };
  return { ...base, ...patch };
}

const accepted = { offerAccepted: true };
const notAccepted = { offerAccepted: false };

describe("шаг «Параметры партии и макет»", () => {
  it("заполнен, когда суммы сходятся и макет у технолога", () => {
    expect(isParamsDone(order())).toBe(true);
  });

  it("не заполнен, если сумма по цветам не сходится с объёмом", () => {
    const broken = order({
      params: { ...order().params, colors: [{ color: "белый", qty: 900 }] },
    });
    expect(isParamsDone(broken)).toBe(false);
  });

  it("не заполнен, если сумма по размерам не сходится", () => {
    const broken = order({
      params: { ...order().params, sizes: [{ size: "S", qty: 999 }] },
    });
    expect(isParamsDone(broken)).toBe(false);
  });

  it("требует макет, пока печать не «без печати»", () => {
    expect(isParamsDone(order({ artwork: [] }))).toBe(false);
    expect(isParamsDone(order({ artwork: [artwork("uploading")] }))).toBe(false);
    expect(isParamsDone(order({ artwork: [artwork("failed")] }))).toBe(false);
    expect(isParamsDone(order({ artwork: [artwork("approved")] }))).toBe(true);
  });

  it("без печати макет не нужен", () => {
    const withoutPrint = order({
      artwork: [],
      params: { ...order().params, print: "без печати" },
    });
    expect(isParamsDone(withoutPrint)).toBe(true);
  });
});

describe("шаг «Доставка»", () => {
  it("склад маркетплейса не требует адреса — его знает платформа", () => {
    expect(isDeliveryDone(order())).toBe(true);
  });

  it("доставка до двери требует адрес, получателя и телефон", () => {
    const toDoor = order({
      delivery: {
        optionId: "address",
        title: "Доставка до адреса",
        price: 1_280_000,
        kind: "address",
        address: "Москва, ул. Лесная, 9",
        recipientName: null,
        recipientPhone: null,
        comment: null,
      },
    });
    expect(isDeliveryDone(toDoor)).toBe(false);

    const filled = order({
      delivery: {
        ...toDoor.delivery!,
        recipientName: "Анна Кораблёва",
        recipientPhone: "+79160001234",
      },
    });
    expect(isDeliveryDone(filled)).toBe(true);
  });

  it("не выбрана — шаг не заполнен", () => {
    expect(isDeliveryDone(order({ delivery: null }))).toBe(false);
  });
});

describe("состояния аккордеона", () => {
  it("открытый шаг показывается как `on`, даже когда заполнен", () => {
    const states = stepStates(order(), accepted, "params");
    expect(states).toEqual({ params: "on", delivery: "done", payer: "done", payment: "done" });
  });

  it("незаполненные шаги — `todo`", () => {
    const states = stepStates(order({ artwork: [] }), notAccepted, null);
    expect(states).toEqual({
      params: "todo",
      delivery: "done",
      payer: "todo",
      payment: "done",
    });
  });

  it("недоступный способ оплаты обнуляет шаг «Оплата»", () => {
    const wrong = order({ paymentMethod: "escrow_split_50_50" });
    expect(stepStates(wrong, accepted, null).payment).toBe("todo");
  });
});

describe("навигация по шагам", () => {
  it("первый незаполненный — это параметры без макета", () => {
    expect(firstIncompleteStep(order({ artwork: [] }), accepted)).toBe("params");
  });

  it("всё заполнено — первого незаполненного нет, можно платить", () => {
    expect(firstIncompleteStep(order(), accepted)).toBeNull();
    expect(canSubmit(order(), accepted)).toBe(true);
  });

  it("без принятой оферты платить нельзя", () => {
    expect(canSubmit(order(), notAccepted)).toBe(false);
    expect(firstIncompleteStep(order(), notAccepted)).toBe("payer");
  });

  it("оформленный заказ уже не отправляется", () => {
    expect(canSubmit(order({ status: "awaiting_payment" }), accepted)).toBe(false);
  });

  it("после шага ведёт к следующему незаполненному", () => {
    expect(nextStepAfter("params", order(), notAccepted)).toBe("payer");
    // после последнего незаполненного возвращаемся к первому оставшемуся
    expect(nextStepAfter("payer", order({ artwork: [] }), accepted)).toBe("params");
    expect(nextStepAfter("payment", order(), accepted)).toBeNull();
  });
});

describe("ошибка сервера открывает нужный шаг", () => {
  it.each([
    ["params.colors", "params"],
    ["artwork", "params"],
    ["delivery.address", "delivery"],
    ["payer.legalAddress", "payer"],
    ["paymentMethod", "payment"],
  ])("%s → %s", (field, step) => {
    expect(stepOfField(field)).toBe(step);
  });
});
