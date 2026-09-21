import type { DisputeResolution, Kopecks } from "@partiya/api-contracts";

/* Распределение эскроу по решению оператора — ARCHITECTURE.md, раздел 9:
   «Решение — распределение суммы эскроу (100/0, 0/100, частично) → проводки в ledger».

   Единственный инвариант, ради которого функция вынесена отдельно и проверяется тестом:

     customerAmount + factoryAmount + fee === total

   Ни одна копейка не исчезает и не появляется. Комиссия берётся ТОЛЬКО с доли, которая
   осталась заводу (Q-194): при полном возврате платформа не зарабатывает.

   Округление — вниз в пользу завода, как и у обычной выплаты (`platformFeeOf`): остаток
   от деления уходит заводу, а не теряется. */

export interface EscrowDistribution {
  /** Сколько вернётся заказчику. */
  customerAmount: Kopecks;
  /** Сколько получит завод после удержания комиссии. */
  factoryAmount: Kopecks;
  /** Комиссия платформы. */
  fee: Kopecks;
}

/** Ставка комиссии платформы, % (ARCHITECTURE.md, 5.4). */
export const DISPUTE_FEE_PERCENT = 8;

/**
 * @param total сумма в эскроу, копейки
 * @param resolution исход спора
 * @param refundAmount сумма частичного возврата; у остальных исходов игнорируется
 */
export function distributeEscrow(
  total: Kopecks,
  resolution: DisputeResolution,
  refundAmount: Kopecks | null = null,
  feePercent: number = DISPUTE_FEE_PERCENT,
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
  const fee = Math.floor((factoryShare * feePercent) / 100);
  return { customerAmount: refund, factoryAmount: factoryShare - fee, fee };
}

/** Проверка инварианта — её же зовёт мок перед тем, как записать проводки. */
export function isBalanced(total: Kopecks, distribution: EscrowDistribution): boolean {
  return (
    distribution.customerAmount + distribution.factoryAmount + distribution.fee ===
    Math.max(0, Math.round(total))
  );
}
