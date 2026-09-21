import { describe, expect, it } from "vitest";

import { distributeEscrow, isBalanced } from "./dispute-escrow";

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
    expect(split.fee).toBe(Math.floor(((TOTAL - refund) * 8) / 100));
    expect(isBalanced(TOTAL, split)).toBe(true);
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

  it("остаток от округления комиссии уходит фабрике, а не теряется", () => {
    // 8 % от 99 копеек = 7,92 → комиссия 7, фабрике 92
    const split = distributeEscrow(99, "rejected");
    expect(split.fee).toBe(7);
    expect(split.factoryAmount).toBe(92);
    expect(isBalanced(99, split)).toBe(true);
  });
});
