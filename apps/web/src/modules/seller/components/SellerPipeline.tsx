import type { SellerStage } from "@partiya/api-contracts";
import { cn } from "@partiya/ui";

import { SELLER_STAGE_ORDER, SELLER_STAGE_TITLE } from "../lib/view";

/* Макет: `.pipe` в шапке заказа — но со ступенями ЗАВОДА, а не заказчика.
   Лента у сторон разная: заказчику важны «Сырьё» и «Контроль качества», заводу —
   «Новый → В производстве → КК → Отгружен → Выплачено» (Q-01). */

export function SellerPipeline({
  stage,
  className,
}: {
  stage: SellerStage | null;
  className?: string;
}) {
  const current = stage === null ? -1 : SELLER_STAGE_ORDER.indexOf(stage);

  return (
    <ol className={cn("flex flex-wrap gap-1.5", className)} aria-label="Ступени заказа">
      {SELLER_STAGE_ORDER.map((value, index) => {
        const state = index < current ? "done" : index === current ? "active" : "todo";
        return (
          <li
            key={value}
            aria-current={state === "active" ? "step" : undefined}
            className={cn(
              "rounded-control flex items-center gap-1.5 px-2.5 py-1 text-[12.5px] font-medium",
              state === "done" && "bg-success-soft text-success",
              state === "active" && "bg-action-soft text-action",
              state === "todo" && "bg-subtle text-muted",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                state === "done" && "bg-success",
                state === "active" && "bg-action",
                state === "todo" && "bg-border-strong",
              )}
            />
            {SELLER_STAGE_TITLE[value]}
          </li>
        );
      })}
    </ol>
  );
}
