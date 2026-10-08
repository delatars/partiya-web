import { describe, expect, it } from "vitest";

import { feeBase, feeOf, percentOf } from "./fee";

/* Сверка с partiya-api/crates/payments/src/domain/fee.rs и kernel/src/money.rs:
   те же примеры — те же копейки. */

describe("комиссия платформы (п. 2: только со стоимости товара)", () => {
  it("сквозной пример макета: 183 400 ₽, доставка 9 400 ₽ — комиссия с 174 000 ₽", () => {
    expect(feeOf(18_340_000, 940_000)).toBe(1_392_000);
  });

  it("без доставки — 8 % от всей суммы", () => {
    expect(feeOf(18_340_000)).toBe(1_467_200);
  });

  it("округление «от половины вверх», как Money::percent", () => {
    // 8 % от 99 копеек = 7,92 → 8
    expect(percentOf(99, 8)).toBe(8);
    // 8 % от 6 копеек = 0,48 → 0
    expect(percentOf(6, 8)).toBe(0);
    // 8 % от 25 копеек = 2,00 → 2; от 31 = 2,48 → 2; от 32 = 2,56 → 3
    expect(percentOf(25, 8)).toBe(2);
    expect(percentOf(31, 8)).toBe(2);
    expect(percentOf(32, 8)).toBe(3);
    // ровно половина копейки уходит вверх: 50 % от 1 копейки = 0,5 → 1
    expect(percentOf(1, 50)).toBe(1);
  });

  it("доставка больше суммы — база ноль, комиссии нет", () => {
    expect(feeBase(1_000, 5_000)).toBe(0);
    expect(feeOf(1_000, 5_000)).toBe(0);
  });

  it("отрицательная необлагаемая часть не увеличивает базу", () => {
    expect(feeBase(1_000, -500)).toBe(1_000);
  });
});
