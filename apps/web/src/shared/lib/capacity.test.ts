import type { UnderloadDiscountRule } from "@partiya/api-contracts";
import { describe, expect, it } from "vitest";

import {
  capacityUnitsFor,
  completeCell,
  freePctOf,
  freeUnitsOf,
  isOverbooked,
  isUnderloaded,
  loadPctOf,
  occupiedUnits,
  totalLoadPct,
  underloadWeeksOf,
} from "./capacity";

const rule = (patch: Partial<UnderloadDiscountRule> = {}): UnderloadDiscountRule => ({
  enabled: true,
  thresholdPct: 30,
  percent: 15,
  activeWeeks: [],
  note: null,
  ...patch,
});

const cell = (patch: Partial<Parameters<typeof freeUnitsOf>[0]> = {}) => ({
  unitsTotal: 8000,
  hardUnits: 0,
  softUnits: 0,
  externalUnits: 0,
  planned: true,
  ...patch,
});

describe("свободная мощность", () => {
  it("свободно = план − жёсткие − мягкие − вне платформы (5.3)", () => {
    const week = cell({ hardUnits: 3000, softUnits: 1000, externalUnits: 800 });
    expect(occupiedUnits(week)).toBe(4800);
    expect(freeUnitsOf(week)).toBe(3200);
    expect(freePctOf(week)).toBe(40);
    expect(loadPctOf(week)).toBe(60);
  });

  it("мягкий резерв занимает мощность так же, как жёсткий", () => {
    expect(freeUnitsOf(cell({ softUnits: 2000 }))).toBe(6000);
    expect(freeUnitsOf(cell({ hardUnits: 2000 }))).toBe(6000);
  });

  it("перебор показывается признаком, а свободно не уходит в минус", () => {
    const week = cell({ unitsTotal: 1000, hardUnits: 3000 });
    expect(freeUnitsOf(week)).toBe(0);
    expect(isOverbooked(week)).toBe(true);
  });

  it("неделя без плана — это не ноль: проценты не считаются", () => {
    const week = cell({ planned: false, unitsTotal: 0 });
    expect(freePctOf(week)).toBeNull();
    expect(loadPctOf(week)).toBeNull();
    expect(isOverbooked(week)).toBe(false);
  });

  it("загрузка горизонта считается по всем заполненным ячейкам", () => {
    const cells = [
      completeCell({ lineId: "l1", weekStart: "2026-09-21", ...cell({ hardUnits: 4000 }) }, rule()),
      completeCell({ lineId: "l1", weekStart: "2026-09-28", ...cell({ hardUnits: 0 }) }, rule()),
      // без плана — в знаменатель не попадает
      completeCell(
        { lineId: "l1", weekStart: "2026-10-05", ...cell({ planned: false, unitsTotal: 0 }) },
        rule(),
      ),
    ];
    expect(totalLoadPct(cells)).toBe(25);
  });
});

describe("правило скидки на недозагруз", () => {
  it("срабатывает строго ниже порога", () => {
    // загрузка 29 % — ниже 30 %
    expect(isUnderloaded(cell({ hardUnits: 2320 }), rule())).toBe(true);
    // ровно 30 % — не срабатывает
    expect(isUnderloaded(cell({ hardUnits: 2400 }), rule())).toBe(false);
  });

  it("выключенное правило не срабатывает никогда", () => {
    expect(isUnderloaded(cell({ hardUnits: 0 }), rule({ enabled: false }))).toBe(false);
  });

  it("неделя без плана под скидку не попадает: место неизвестно", () => {
    expect(isUnderloaded(cell({ planned: false, unitsTotal: 0 }), rule())).toBe(false);
  });

  it("скидка объявляется на неделю целиком, если недозагружена хотя бы одна линия", () => {
    const cells = [
      completeCell({ lineId: "l1", weekStart: "2026-10-05", ...cell({ hardUnits: 0 }) }, rule()),
      completeCell({ lineId: "l2", weekStart: "2026-10-05", ...cell({ hardUnits: 8000 }) }, rule()),
      completeCell({ lineId: "l1", weekStart: "2026-09-28", ...cell({ hardUnits: 7000 }) }, rule()),
    ];
    expect(underloadWeeksOf(cells, rule())).toEqual(["2026-10-05"]);
    expect(underloadWeeksOf(cells, rule({ enabled: false }))).toEqual([]);
  });

  it("completeCell достраивает свободно, проценты, недозагруз и перебор", () => {
    const full = completeCell(
      {
        lineId: "line-1",
        weekStart: "2026-10-05",
        unitsTotal: 8000,
        planned: true,
        hardUnits: 1000,
        softUnits: 0,
        externalUnits: 800,
      },
      rule(),
    );
    expect(full.freeUnits).toBe(6200);
    expect(full.freePct).toBe(78);
    expect(full.underloaded).toBe(true);
    expect(full.overbooked).toBe(false);
  });
});

describe("коэффициент изделия", () => {
  it("партия худи съедает мощности больше, чем партия футболок", () => {
    expect(capacityUnitsFor(1000, 1)).toBe(1000);
    expect(capacityUnitsFor(1000, 2.4)).toBe(2400);
  });

  it("дробный остаток округляется вверх — недобрать мощность нельзя", () => {
    expect(capacityUnitsFor(333, 1.4)).toBe(467);
  });
});
