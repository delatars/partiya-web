import type { PriceTier } from "@partiya/api-contracts";
import { cn } from "@partiya/ui";

import { formatNumber, formatRub } from "@/shared/lib/format";
import { tierFor } from "@/shared/lib/quote";

/* Макет: .tiers / .tier / .tier.on — лестница ступеней с подсветкой активной.
   Активна та ступень, по которой сейчас считается партия: она же выбрана движком
   котировок (последняя, чей объём не выше введённого). */

export type TierLadderProps = {
  tiers: readonly PriceTier[];
  /** Введённый объём — по нему подсвечивается ступень. */
  qty: number;
  /** Клик по ступени выставляет её объём в калькуляторе. */
  onPick?: (fromQty: number) => void;
};

export function TierLadder({ tiers, qty, onPick }: TierLadderProps) {
  const active = tierFor(tiers, qty);

  return (
    <div className="my-3 grid grid-cols-3 gap-1.5">
      {tiers.map((tier) => {
        const on = active?.fromQty === tier.fromQty;
        return (
          <button
            key={tier.fromQty}
            type="button"
            disabled={onPick === undefined}
            aria-pressed={on}
            onClick={() => onPick?.(tier.fromQty)}
            className={cn(
              "rounded-control border-border-strong text-muted border px-2.5 py-2 text-left text-xs transition-colors",
              onPick && "hover:border-action",
              on && "border-action bg-action-soft",
            )}
          >
            <b className="font-heading text-text block text-base font-extrabold">
              {formatRub(tier.unitPrice)}
            </b>
            от {formatNumber(tier.fromQty)} шт
          </button>
        );
      })}
    </div>
  );
}
