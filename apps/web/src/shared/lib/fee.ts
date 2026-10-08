import type { Kopecks } from "@partiya/api-contracts";

/* Комиссия платформы — зеркало `payments::fee_of` (partiya-api/crates/payments/src/domain/fee.rs).

   DECISIONS.md, п. 2: комиссия берётся **только со стоимости товара**, доставка — без
   комиссии. База — `max(сумма − доставка, 0)`, процент округляется до копейки «от половины
   вверх» (`kernel::Money::percent`: `(база × % + 50) div 100`). Заводу уходит остаток
   вычитанием, а не второй процент, — иначе доли разойдутся с суммой сделки на копейку.

   Экран считает своё только там, где бэк числа не прислал (моки, предпросмотр), и обязан
   сходиться с ledger до копейки — отсюда точная копия округления, а не `Math.round`. */

/** Ставка комиссии платформы, % (ARCHITECTURE.md, 5.4). */
export const PLATFORM_FEE_PERCENT = 8;

/** База комиссии: сумма без необлагаемой части (доставки), не ниже нуля — `fee_base`. */
export function feeBase(amount: Kopecks, exempt: Kopecks = 0): Kopecks {
  return Math.max(0, amount - Math.max(0, exempt));
}

/** Процент от суммы в копейках с округлением «от половины вверх» — `Money::percent`. */
export function percentOf(amount: Kopecks, percent: number): Kopecks {
  // Rust: (amount × percent + 50).div_euclid(100); для неотрицательных — обычный floor
  return Math.floor((amount * percent + 50) / 100);
}

/** Комиссия с суммы сделки: `fee_of(amount, FeeTerms { percent, exempt })`. */
export function feeOf(
  amount: Kopecks,
  exempt: Kopecks = 0,
  percent: number = PLATFORM_FEE_PERCENT,
): Kopecks {
  return percentOf(feeBase(amount, exempt), percent);
}
