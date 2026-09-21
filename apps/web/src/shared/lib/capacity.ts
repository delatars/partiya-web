import type { CapacityCell, UnderloadDiscountRule } from "@partiya/api-contracts";

/* Арифметика мощности — ARCHITECTURE.md, 5.3.

   Формула ровно одна и живёт здесь:

     свободно = план − жёсткие резервы − мягкие (не истёкшие) резервы − загрузка вне платформы

   Считает её сервер, но те же правила нужны экрану: завод правит план и внеплатформенную
   загрузку прямо в сетке, и «свободно 38 %» обязано пересчитываться под рукой, а не после
   сохранения. Отсюда чистые функции — их же проверяют тесты рядом.

   Отрицательного «свободно» не бывает: если завод уменьшил план ниже занятого, ячейка
   становится `overbooked`, а свободно — ноль. Прятать перебор нулём нельзя: завод должен
   увидеть, что продал больше, чем может. */

export interface CapacityCellInputs {
  unitsTotal: number;
  hardUnits: number;
  softUnits: number;
  externalUnits: number;
  planned: boolean;
}

/** Сколько мощности уже занято: резервы платформы плюс своя загрузка. */
export function occupiedUnits(cell: CapacityCellInputs): number {
  return (
    Math.max(0, cell.hardUnits) + Math.max(0, cell.softUnits) + Math.max(0, cell.externalUnits)
  );
}

/** Свободные единицы. Не бывает отрицательным — перебор показывается признаком. */
export function freeUnitsOf(cell: CapacityCellInputs): number {
  return Math.max(0, cell.unitsTotal - occupiedUnits(cell));
}

/** Свободно, % от плана. `null` — плана на неделю нет (ноль и «нет плана» — разное). */
export function freePctOf(cell: CapacityCellInputs): number | null {
  if (!cell.planned || cell.unitsTotal <= 0) return null;
  return Math.round((freeUnitsOf(cell) / cell.unitsTotal) * 100);
}

/** Загрузка недели, % — величина, с которой сравнивается порог правила недозагруза. */
export function loadPctOf(cell: CapacityCellInputs): number | null {
  if (!cell.planned || cell.unitsTotal <= 0) return null;
  return Math.min(100, Math.round((occupiedUnits(cell) / cell.unitsTotal) * 100));
}

/** Перебор: продано и занято больше, чем план. */
export function isOverbooked(cell: CapacityCellInputs): boolean {
  return cell.planned && occupiedUnits(cell) > cell.unitsTotal;
}

/** Срабатывает ли правило скидки на недозагруз для этой ячейки.
 *
 * Правило `underload_discount(week_range, threshold, percent)` из 5.3: неделя считается
 * недозагруженной, когда её загрузка СТРОГО ниже порога. Неделя без плана под правило не
 * попадает: платформа не знает, есть ли там место, и продавать её со скидкой нельзя. */
export function isUnderloaded(cell: CapacityCellInputs, rule: UnderloadDiscountRule): boolean {
  if (!rule.enabled || !cell.planned) return false;
  const load = loadPctOf(cell);
  return load !== null && load < rule.thresholdPct;
}

/** Достраивает ячейку до контрактной: считает свободно, недозагруз и перебор. */
export function completeCell(
  base: Omit<CapacityCell, "freeUnits" | "freePct" | "underloaded" | "overbooked">,
  rule: UnderloadDiscountRule,
): CapacityCell {
  return {
    ...base,
    freeUnits: freeUnitsOf(base),
    freePct: freePctOf(base),
    underloaded: isUnderloaded(base, rule),
    overbooked: isOverbooked(base),
  };
}

/** Недели, на которые действует скидка на недозагруз: те, где недозагружена хотя бы
    одна линия. Скидка объявляется на неделю целиком — заказчик не выбирает линию. */
export function underloadWeeksOf(
  cells: readonly CapacityCell[],
  rule: UnderloadDiscountRule,
): string[] {
  if (!rule.enabled) return [];
  const weeks = new Set<string>();
  for (const cell of cells) {
    if (isUnderloaded(cell, rule)) weeks.add(cell.weekStart);
  }
  return [...weeks].sort();
}

/** Загрузка горизонта, %: сколько из всего плана уже занято. */
export function totalLoadPct(cells: readonly CapacityCell[]): number {
  const planned = cells.filter((cell) => cell.planned);
  const total = planned.reduce((sum, cell) => sum + cell.unitsTotal, 0);
  if (total <= 0) return 0;
  const busy = planned.reduce((sum, cell) => sum + occupiedUnits(cell), 0);
  return Math.min(100, Math.round((busy / total) * 100));
}

/** Сколько условных единиц «съест» партия: объём × коэффициент изделия (5.3). */
export function capacityUnitsFor(qty: number, unitsPerItem: number): number {
  return Math.ceil(qty * unitsPerItem);
}
