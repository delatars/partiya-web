import { describe, expect, it } from "vitest";

import { distributeEscrow, isBalanced } from "./dispute-escrow";
import { percentOf } from "./fee";

/* Инвариант один и он же главный: сумма распределения равна сумме эскроу.
   Копейка, потерянная на округлении, — это расхождение ledger с номинальным счётом. */

const TOTAL = 18_340_000; // 183 400 ₽ — сквозной пример макета

describe("распределение эскроу по решению спора", () => {
  it("отказ в претензии: всё фабрике за вычетом комиссии", () => {
    const split = distributeEscrow(TOTAL, "rejected");
    expect(split.customerAmount).toBe(0);
    expect(split.fee).toBe(1_467_200);
    expect(split.factoryAmount).toBe(16_872_800);
    expect(isBalanced(TOTAL, split)).toBe(true);
  });

  it("переделка деньги не двигает: фабрика получит после приёмки допечатки", () => {
    const split = distributeEscrow(TOTAL, "rework");
    expect(split.customerAmount).toBe(0);
    expect(split.factoryAmount).toBe(16_872_800);
    expect(isBalanced(TOTAL, split)).toBe(true);
  });

  it("полный возврат: комиссия не берётся вовсе", () => {
    const split = distributeEscrow(TOTAL, "full_refund");
    expect(split.customerAmount).toBe(TOTAL);
    expect(split.factoryAmount).toBe(0);
    expect(split.fee).toBe(0);
    expect(isBalanced(TOTAL, split)).toBe(true);
  });

  it("частичный возврат: комиссия только с доли фабрики (Q-194)", () => {
    const refund = 2_016_000; // 120 шт × 168 ₽
    const split = distributeEscrow(TOTAL, "partial_refund", refund);
    expect(split.customerAmount).toBe(refund);
    expect(split.fee).toBe(percentOf(TOTAL - refund, 8));
    expect(isBalanced(TOTAL, split)).toBe(true);
  });

  it("доставка без комиссии и вычитается из доли фабрики первой (п. 2, Q-341)", () => {
    const delivery = 940_000; // 9 400 ₽
    expect(distributeEscrow(TOTAL, "rejected", null, delivery).fee).toBe(1_392_000);
    const refund = 2_016_000;
    const split = distributeEscrow(TOTAL, "partial_refund", refund, delivery);
    expect(split.fee).toBe(percentOf(TOTAL - refund - delivery, 8));
    expect(isBalanced(TOTAL, split)).toBe(true);
    // возврат почти всего: доля фабрики меньше доставки — комиссии нет
    const most = distributeEscrow(TOTAL, "partial_refund", TOTAL - 500_000, delivery);
    expect(most.fee).toBe(0);
    expect(most.factoryAmount).toBe(500_000);
  });

  it("возврат больше суммы эскроу урезается до неё", () => {
    const split = distributeEscrow(TOTAL, "partial_refund", TOTAL * 2);
    expect(split.customerAmount).toBe(TOTAL);
    expect(split.factoryAmount).toBe(0);
    expect(isBalanced(TOTAL, split)).toBe(true);
  });

  it("сумма сходится на любых числах — включая неделящиеся на 100", () => {
    for (const total of [1, 7, 99, 12_345, 1_000_001, 18_340_001]) {
      for (const refund of [0, 1, Math.floor(total / 3), total]) {
        const split = distributeEscrow(total, "partial_refund", refund);
        expect(isBalanced(total, split)).toBe(true);
        expect(split.customerAmount).toBeGreaterThanOrEqual(0);
        expect(split.factoryAmount).toBeGreaterThanOrEqual(0);
        expect(split.fee).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("округление комиссии — как Money::percent, остаток уходит фабрике", () => {
    // 8 % от 99 копеек = 7,92 → комиссия 8 («от половины вверх»), фабрике 91
    const split = distributeEscrow(99, "rejected");
    expect(split.fee).toBe(8);
    expect(split.factoryAmount).toBe(91);
    expect(isBalanced(99, split)).toBe(true);
  });
});
