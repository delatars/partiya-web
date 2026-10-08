import type { DisputeResolution, Kopecks } from "@partiya/api-contracts";

import { feeOf, PLATFORM_FEE_PERCENT } from "./fee";

/* Распределение эскроу по решению оператора — ARCHITECTURE.md, раздел 9:
   «Решение — распределение суммы эскроу (100/0, 0/100, частично) → проводки в ledger».

   Единственный инвариант, ради которого функция вынесена отдельно и проверяется тестом:

     customerAmount + factoryAmount + fee === total

   Ни одна копейка не исчезает и не появляется. Комиссия берётся ТОЛЬКО с доли, которая
   осталась заводу (Q-194): при полном возврате платформа не зарабатывает.

   Комиссия — только со стоимости товара (DECISIONS.md, п. 2): доставка остаётся заводу
   целиком и вычитается из его доли первой — `fee = 8 % × max(доля завода − доставка, 0)`
   (`payments::dispute_split`, Q-341). Округление — `Money::percent` («от половины вверх»,
   `shared/lib/fee.ts`); заводу уходит остаток вычитанием, поэтому сумма сходится всегда. */

export interface EscrowDistribution {
  /** Сколько вернётся заказчику. */
  customerAmount: Kopecks;
  /** Сколько получит завод после удержания комиссии. */
  factoryAmount: Kopecks;
  /** Комиссия платформы. */
  fee: Kopecks;
}

/** Ставка комиссии платформы, % (ARCHITECTURE.md, 5.4) — та же, что у выплаты. */
export const DISPUTE_FEE_PERCENT = PLATFORM_FEE_PERCENT;

/**
 * @param total сумма в эскроу, копейки
 * @param resolution исход спора
 * @param refundAmount сумма частичного возврата; у остальных исходов игнорируется
 * @param exempt необлагаемая часть — стоимость доставки из котировки
 */
export function distributeEscrow(
  total: Kopecks,
  resolution: DisputeResolution,
  refundAmount: Kopecks | null = null,
  exempt: Kopecks = 0,
): EscrowDistribution {
  const safeTotal = Math.max(0, Math.round(total));

  if (resolution === "full_refund") {
    // партия возвращается заводу целиком — платформа комиссию не берёт
    return { customerAmount: safeTotal, factoryAmount: 0, fee: 0 };
  }

  const refund =
    resolution === "partial_refund"
      ? Math.min(safeTotal, Math.max(0, Math.round(refundAmount ?? 0)))
      : 0;

  const factoryShare = safeTotal - refund;
  const fee = feeOf(factoryShare, exempt, DISPUTE_FEE_PERCENT);
  return { customerAmount: refund, factoryAmount: factoryShare - fee, fee };
}

/** Проверка инварианта — её же зовёт мок перед тем, как записать проводки. */
export function isBalanced(total: Kopecks, distribution: EscrowDistribution): boolean {
  return (
    distribution.customerAmount + distribution.factoryAmount + distribution.fee ===
    Math.max(0, Math.round(total))
  );
}
