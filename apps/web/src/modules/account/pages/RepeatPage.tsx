import type { OrderListItem } from "@partiya/api-contracts";
import { Alert, Box, Button, EmptyState, Input, KpiTile, Placeholder, Skeleton } from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getApiService, isApiError, ORDER_KEYS, orderListOptions } from "@/shared/api";
import { formatIsoDayMonth } from "@/shared/lib/dates";
import { formatNumber, formatRub, toRubles } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";
import { QUOTE_TTL_DAYS } from "@/shared/lib/quote-id";
import { AppLink, useAppNavigate } from "@/shared/ui";

/* Макет: экран `repeat` — «Повторные партии».
 *
 * Повтор — это не «положить в корзину то же самое», а новый заказ по сохранённой
 * спецификации со скидкой. Скидку и цену считает сервер (`POST /orders/{id}/repeat`),
 * браузер показывает предварительную цену и отправляет только объём. */

export function RepeatPage() {
  const queryClient = useQueryClient();
  const navigate = useAppNavigate();
  const query = useQuery(orderListOptions({ bucket: "done" }));
  const [qty, setQty] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | undefined>(undefined);
  const [pendingId, setPendingId] = useState<number | undefined>(undefined);

  const repeat = useMutation({
    mutationFn: (orderId: number) =>
      getApiService().repeatOrder(orderId, `repeat:${String(orderId)}:${String(Date.now())}`),
    onSuccess: (result) => {
      queryClient.setQueryData(ORDER_KEYS.detail(result.order.id), result.order);
      void queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
      navigate({ to: "/order/new", search: { draft: result.order.id } });
    },
    onError: (cause) => {
      setError(isApiError(cause) ? cause.message : "Не получилось повторить партию");
    },
    onSettled: () => {
      setPendingId(undefined);
    },
  });

  const rows = query.data?.items ?? [];
  const summary = query.data?.summary;

  return (
    <>
      <header className="mt-1 mb-3.5">
        <h1 className="font-heading text-2xl font-bold">Повторные партии</h1>
        <p className="text-muted mt-1 max-w-[80ch]">
          Сохранённые спецификации. Повтор у той же фабрики — со скидкой, цена фиксируется на{" "}
          {QUOTE_TTL_DAYS} дней.
        </p>
      </header>

      <div className="mb-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Сохранено спецификаций" value={query.isPending ? "—" : rows.length} />
        <KpiTile
          label="Экономия за повторы"
          value={summary ? formatRub(summary.savedOnRepeats) : "—"}
          delta={
            summary && summary.repeatOrders > 0
              ? `на ${String(summary.repeatOrders)} ${plural(summary.repeatOrders, ["партии", "партиях", "партиях"])}`
              : undefined
          }
          deltaTone="up"
        />
        <KpiTile
          label="Скидка за повтор"
          value={
            rows[0]?.repeatDiscountPercent ? `−${String(rows[0].repeatDiscountPercent)} %` : "—"
          }
        />
        <KpiTile
          label="Цена зафиксирована"
          value={`${String(QUOTE_TTL_DAYS)} дней`}
          delta="с момента повтора"
        />
      </div>

      {error !== undefined && (
        <Alert kind="danger" className="mb-3" title="Повтор не вышел">
          {error}
        </Alert>
      )}

      {query.isPending ? (
        <Skeleton className="h-40 w-full rounded-[10px]" />
      ) : rows.length === 0 ? (
        <Box>
          <EmptyState
            title="Повторять пока нечего"
            description="Спецификация сохраняется после приёмки партии — тогда повтор занимает один клик."
            action={
              <Button asChild variant="cta">
                <AppLink to="/catalog">Перейти в каталог</AppLink>
              </Button>
            }
          />
        </Box>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <RepeatRow
              key={row.id}
              row={row}
              qty={qty[row.id] ?? String(row.qty ?? "")}
              onQtyChange={(value) => {
                setQty((current) => ({ ...current, [row.id]: value }));
              }}
              pending={pendingId === row.id}
              onRepeat={() => {
                setPendingId(row.id);
                repeat.mutate(row.id);
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}

function RepeatRow({
  row,
  qty,
  onQtyChange,
  onRepeat,
  pending,
}: {
  row: OrderListItem;
  qty: string;
  onQtyChange: (value: string) => void;
  onRepeat: () => void;
  pending: boolean;
}) {
  const discount = row.repeatDiscountPercent ?? 0;
  const was = row.unitPrice ?? 0;
  const now = Math.round((was * (100 - discount)) / 100);

  return (
    <div className="bg-surface rounded-card grid items-center gap-4 p-3 md:grid-cols-[72px_1.6fr_200px_190px]">
      <Placeholder tone="a" className="rounded-control size-18" label="фото" />
      <div className="min-w-0">
        <AppLink
          to={`/account/orders/${String(row.id)}`}
          className="block font-medium hover:underline"
        >
          {row.title}
        </AppLink>
        <div className="text-muted text-[12.5px]">{row.spec}</div>
        <div className="mt-1 text-[12.5px]">
          <b>{row.factory}</b>
          {row.repeatCount != null && row.repeatCount > 0 && (
            <>
              {" "}
              · заказано {row.repeatCount} {plural(row.repeatCount, ["раз", "раза", "раз"])}
            </>
          )}
          {row.shipDate !== null && <> · последняя {formatIsoDayMonth(row.shipDate)}</>}
        </div>
      </div>
      <div className="text-[12.5px]">
        <div>
          Было <b className="num">{formatNumber(toRubles(was))} ₽</b>/шт
        </div>
        <div className="text-discount">
          Сейчас <b className="num">{formatNumber(toRubles(now))} ₽</b>/шт
        </div>
        {row.freeCapacityPct != null && (
          <div className="text-muted">свободно {row.freeCapacityPct} %</div>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <Input
            size="sm"
            className="num w-24"
            inputMode="numeric"
            value={qty}
            onChange={(event) => {
              onQtyChange(event.target.value);
            }}
            aria-label={`Объём повтора заказа № ${String(row.id)}`}
          />
          <span className="text-muted text-[12.5px]">шт</span>
        </div>
        <Button variant="cta" disabled={pending} onClick={onRepeat}>
          {pending ? "Готовим…" : `Повторить −${String(discount)} %`}
        </Button>
      </div>
    </div>
  );
}
