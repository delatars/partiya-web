import type { Order, PaymentMethod, UpdateOrderDraftBody } from "@partiya/api-contracts";
import { cn } from "@partiya/ui";

import { formatRub } from "@/shared/lib/format";

import { SaveBadge, type SaveState } from "./SaveBadge";

/* Макет: шаг «Оплата» — .pay с двумя схемами эскроу.

   Условия и доступность схем пишет сервер (`paymentOptions`), а не браузер: «для фабрик
   с рейтингом 4,7+» — это правило платформы, и менять его релизом фронта нельзя. */

export interface PaymentStepProps {
  order: Order;
  saveState: SaveState;
  onPatch: (body: UpdateOrderDraftBody) => void;
}

export function PaymentStep({ order, saveState, onPatch }: PaymentStepProps) {
  const choose = (method: PaymentMethod) => {
    if (method === order.paymentMethod) return;
    onPatch({ paymentMethod: method });
  };

  return (
    <div>
      <div role="radiogroup" aria-label="Способ оплаты" className="flex flex-col gap-2">
        {order.paymentOptions.map((option) => {
          const active = option.method === order.paymentMethod;
          return (
            <label
              key={option.method}
              className={cn(
                "rounded-control flex items-start gap-2.5 border px-3 py-2.5 text-[13.5px]",
                active ? "border-action bg-action-soft" : "border-border",
                option.available ? "cursor-pointer" : "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name="payment-method"
                className="accent-action mt-0.5 size-4 flex-none"
                checked={active}
                disabled={!option.available}
                onChange={() => {
                  choose(option.method);
                }}
              />
              <span className="min-w-0">
                <b className="font-medium">{option.title}</b>
                <span className="text-muted block text-[12.5px]">{option.description}</span>
                {option.available ? (
                  <span className="text-muted block text-[12.5px]">
                    К оплате сейчас: <span className="num">{formatRub(option.amountDue)}</span>
                  </span>
                ) : (
                  <span className="text-danger block text-[12.5px]">
                    Недоступно: {option.unavailableReason}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      <div className="bg-subtle rounded-control mt-3 px-3 py-2.5 text-[13px]">
        <b className="font-medium">Оплата — платёжным поручением по счёту</b>
        <p className="text-muted mt-0.5">
          После оформления мы выставим счёт на юрлицо. Деньги поступают на номинальный счёт
          платформы и резервируются в эскроу; поступление занимает от нескольких часов до одного
          рабочего дня.
        </p>
      </div>

      <div className="mt-4">
        <SaveBadge state={saveState} />
      </div>
    </div>
  );
}
