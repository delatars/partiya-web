import type { Order, OrderStatus } from "@partiya/api-contracts";
import { getConfig } from "@partiya/shared";
import { Button, Tag } from "@partiya/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ORDER_KEYS } from "@/shared/api";
import { orderStatusTitle } from "@/shared/lib/order-status";

import { demoAdvanceOrder, demoMarkOrderPaid } from "../api/mocks";

/* Демо-пульт трекинга. Существует ТОЛЬКО при `useMocks`.
 *
 * У бэка этих кнопок нет и не будет: заказ двигают webhook банка, отчёты фабрики и
 * таймеры очереди. Поэтому пульт не ходит через `ApiService` — он зовёт мок напрямую,
 * а в сборке с `useMocks: false` компонент возвращает `null` и не рисует ничего.
 *
 * Зачем он нужен: без него жизненный цикл заказа нельзя прокликать — «Принять партию»
 * появляется только в статусе `acceptance`, до которого заказ идёт неделями. */

/** Следующий шаг автомата — тот же порядок, что в диаграмме 5.2. */
const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  awaiting_payment: { to: "awaiting_confirmation", label: "Банк: деньги в эскроу" },
  awaiting_confirmation: { to: "confirmed", label: "Фабрика подтвердила" },
  confirmed: { to: "artwork_review", label: "Технолог взял макет" },
  artwork_review: { to: "materials", label: "Макет согласован" },
  materials: { to: "in_production", label: "Старт производства" },
  in_production: { to: "quality_control", label: "На контроль качества" },
  quality_control: { to: "shipped", label: "Отгрузить" },
  shipped: { to: "acceptance", label: "Доставлено → приёмка" },
};

export function OrderDemoConsole({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | undefined>(undefined);

  const advance = useMutation({
    mutationFn: (to: OrderStatus | undefined) =>
      order.status === "awaiting_payment" && to === "awaiting_confirmation"
        ? demoMarkOrderPaid(order.id)
        : demoAdvanceOrder(order.id, to),
    onSuccess: (updated) => {
      queryClient.setQueryData(ORDER_KEYS.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
      setError(undefined);
    },
    onError: (cause) => {
      setError(cause instanceof Error ? cause.message : "Шаг не выполнился");
    },
  });

  if (!getConfig().useMocks) return null;

  const next = NEXT[order.status];

  return (
    <div className="border-discount bg-discount-soft rounded-card mb-3 flex flex-wrap items-center gap-2 border border-dashed px-3 py-2 text-[12.5px]">
      <Tag tone="disc">демо-пульт</Tag>
      <span className="text-muted">
        Статус: <b className="text-text">{orderStatusTitle(order.status)}</b>. На бэке этот шаг
        делают фабрика, банк или таймер.
      </span>
      {next ? (
        <Button
          size="sm"
          variant="cta"
          disabled={advance.isPending}
          onClick={() => {
            advance.mutate(next.to);
          }}
        >
          {advance.isPending ? "Двигаем…" : `→ ${next.label}`}
        </Button>
      ) : (
        <span className="text-muted">дальше автомат ведёт приёмка или спор</span>
      )}
      {order.status !== "acceptance" && order.status !== "completed" && (
        <Button
          size="sm"
          disabled={advance.isPending}
          onClick={() => {
            advance.mutate("acceptance");
          }}
        >
          → сразу к приёмке
        </Button>
      )}
      {error !== undefined && <span className="text-danger">{error}</span>}
    </div>
  );
}
