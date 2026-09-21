import type { Order } from "@partiya/api-contracts";
import { Button } from "@partiya/ui";
import type { ReactNode } from "react";

import { isPrimaryAction, ORDER_ACTION_TITLES, orderActionsOf } from "@/shared/lib/order-actions";
import type { OrderActionKind } from "@/shared/lib/order-actions";
import { AppLink } from "@/shared/ui";

/* Блок действий в шапке трекинга. Набор кнопок считает проекция автомата
   (`shared/lib/order-actions.ts`), а не экран: иначе «Принять партию» показывалась бы
   в производстве, сервер отвечал бы 409, и о правилах человек узнавал бы из ошибки. */

export function OrderActions({
  order,
  onApproveArtwork,
  onRepeat,
  pending,
}: {
  order: Order;
  onApproveArtwork: () => void;
  onRepeat: () => void;
  pending?: OrderActionKind;
}) {
  const actions = orderActionsOf(order);
  if (actions.length === 0) return null;
  const id = String(order.id);
  const discount = order.repeatDiscountPercent;

  return (
    <div className="flex flex-col items-stretch gap-1.5 md:min-w-52">
      {actions.map((kind) => {
        const primary = isPrimaryAction(kind, actions);
        const variant = primary ? "cta" : kind === "dispute" ? "ghost" : "default";
        const title =
          kind === "repeat" && discount != null && discount > 0
            ? `${ORDER_ACTION_TITLES.repeat} −${String(discount)} %`
            : ORDER_ACTION_TITLES[kind];

        if (kind === "message") {
          return (
            <Button key={kind} asChild variant={variant}>
              <a href="#chat">{title}</a>
            </Button>
          );
        }
        const link = hrefOf(kind, id);
        if (link !== null) {
          return (
            <Button key={kind} asChild variant={variant}>
              <AppLink to={link.to} search={link.search}>
                {title}
              </AppLink>
            </Button>
          );
        }
        return (
          <Button
            key={kind}
            variant={variant}
            disabled={pending === kind}
            onClick={kind === "repeat" ? onRepeat : onApproveArtwork}
          >
            {pending === kind ? "Секунду…" : title}
          </Button>
        );
      })}
    </div>
  );
}

/** Действия-ссылки. `null` — действие выполняется мутацией на месте. */
function hrefOf(
  kind: OrderActionKind,
  id: string,
): { to: string; search?: Record<string, unknown> } | null {
  switch (kind) {
    case "continue_draft":
      return { to: "/order/new", search: { draft: Number(id) } };
    case "pay":
      return { to: `/order/${id}/pay` };
    case "accept":
      return { to: `/account/orders/${id}/acceptance` };
    case "dispute":
    case "view_dispute":
      return { to: `/account/orders/${id}/dispute` };
    default:
      return null;
  }
}

/** Заголовок блока действий, когда действий нет: заказ закрыт или отменён. */
export function ClosedOrderNote({ children }: { children: ReactNode }) {
  return <p className="text-muted max-w-[42ch] text-[12.5px]">{children}</p>;
}
