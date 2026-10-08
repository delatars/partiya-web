import type { Order, Quote, QuoteLine } from "@partiya/api-contracts";
import { Alert, Button, cn, Input, Placeholder, Price, Skeleton, Spinner } from "@partiya/ui";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";

import { formatIsoDayMonth } from "@/shared/lib/dates";
import { formatNumber, formatRub, toRubles } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";

/* Макет: aside.total-box — карточка оффера, строки котировки, итог, срок, промокод,
   кнопка «Оплатить в эскроу» и плашка эскроу.

   Строки показываются те, что посчитал сервер: собственной арифметики у колонки нет.
   Пока идёт пересчёт, прежний итог остаётся на экране приглушённым — иначе цифра
   прыгает на каждое нажатие «+» (ARCHITECTURE.md, 5.5). */

export interface TotalBoxProps {
  order: Order;
  quote: Quote | undefined;
  recalculating: boolean;
  /** Промокоды включены фиче-флагом (п. 10); выключены — поля нет вовсе. */
  promoEnabled: boolean;
  /** Применённый промокод из URL; пусто — поле чистое. */
  promo: string | undefined;
  promoError: string | undefined;
  promoPending: boolean;
  onApplyPromo: (code: string) => void;
  onClearPromo: () => void;
  /** Котировка устарела — показываем предупреждение вместо кнопки оплаты. */
  expired: boolean;
  onRecalculate: () => void;
  submitLabel: string;
  submitDisabled: boolean;
  submitPending: boolean;
  onSubmit: () => void;
  /** Почему кнопка заблокирована: «Заполните шаг «Доставка»». */
  blockedReason?: string;
}

export function TotalBox({
  order,
  quote,
  recalculating,
  promoEnabled,
  promo,
  promoError,
  promoPending,
  onApplyPromo,
  onClearPromo,
  expired,
  onRecalculate,
  submitLabel,
  submitDisabled,
  submitPending,
  onSubmit,
  blockedReason,
}: TotalBoxProps) {
  const [draft, setDraft] = useState(promo ?? "");
  const shown = quote ?? order.quote;

  return (
    <aside aria-label="Сводка заказа" className="bg-surface rounded-card sticky top-3 p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <Placeholder
          tone={order.offer.tone ?? "a"}
          className="size-14 flex-none rounded-md"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <b className="block">{order.offer.title}</b>
          <span className="text-muted text-[12.5px]">
            «{order.offer.factoryName}» · {formatNumber(order.params.qty)} шт
          </span>
        </div>
      </div>

      <div
        aria-busy={recalculating}
        className={cn("transition-opacity", recalculating && "opacity-55")}
      >
        {shown.lines
          // строка доставки с нулём — это самовывоз, её в счёте показывать незачем
          .filter((line) => line.kind !== "delivery" || line.amount !== 0)
          .map((line, index) => (
            <div
              key={`${line.kind}-${String(index)}`}
              className="flex justify-between gap-3 py-[5px] text-[13.5px]"
            >
              <span className={cn(line.amount < 0 && "text-discount")}>
                {lineTitle(line, order.params.qty, shown.unitPrice)}
              </span>
              <span className={cn("num", line.amount < 0 && "text-discount")}>
                {line.amount < 0 ? `−${formatRub(-line.amount)}` : formatRub(line.amount)}
              </span>
            </div>
          ))}
      </div>

      <div className="border-border mt-2 flex items-baseline justify-between gap-2 border-t pt-3">
        <b>Итого</b>
        <span className="flex items-baseline gap-2">
          {recalculating && <Spinner size="sm" label="Пересчитываем" className="text-muted" />}
          {shown ? (
            <Price
              className={cn("text-2xl transition-opacity", recalculating && "opacity-55")}
              value={toRubles(shown.total)}
            />
          ) : (
            <Skeleton className="h-6 w-28" />
          )}
        </span>
      </div>

      <p className="text-muted mt-1 text-[12.5px]">
        {shown.leadDays === undefined
          ? null
          : `Срок ${String(shown.leadDays)} раб. ${plural(shown.leadDays, ["день", "дня", "дней"])}`}
        {formatIsoDayMonth(shown.shipDate)
          ? ` · отгрузка ~${formatIsoDayMonth(shown.shipDate)}`
          : ""}
      </p>

      {/* п. 10: поле промокода — только при включённом флаге (`shared/lib/features.ts`) */}
      {promoEnabled && (
        <div className="mt-2.5 flex gap-2">
          <Input
            value={draft}
            placeholder="Промокод"
            aria-label="Промокод"
            invalid={promoError !== undefined}
            disabled={promoPending}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onApplyPromo(draft);
              }
            }}
          />
          <Button
            disabled={promoPending || draft.trim().length === 0}
            onClick={() => {
              onApplyPromo(draft);
            }}
          >
            {promoPending ? <Spinner size="sm" label="Проверяем" /> : "OK"}
          </Button>
        </div>
      )}
      {promoEnabled && promoError !== undefined && (
        <p className="text-danger mt-1 text-xs">{promoError}</p>
      )}
      {promoEnabled && promo !== undefined && promoError === undefined && (
        <p className="text-discount mt-1 text-xs">
          Промокод {promo} применён ·{" "}
          <button
            type="button"
            className="text-action underline"
            onClick={() => {
              setDraft("");
              onClearPromo();
            }}
          >
            снять
          </button>
        </p>
      )}

      {expired ? (
        <Alert
          kind="warn"
          className="mt-3"
          title="Расчёт устарел"
          action={
            <Button size="sm" onClick={onRecalculate}>
              Пересчитать
            </Button>
          }
        >
          Цена действовала ограниченное время. Пересчитайте партию — параметры сохранятся.
        </Alert>
      ) : (
        <Button
          variant="cta"
          size="lg"
          wide
          className="mt-3"
          disabled={submitDisabled || submitPending}
          onClick={onSubmit}
        >
          {submitPending ? <Spinner size="sm" label="Оформляем" /> : submitLabel}
        </Button>
      )}

      {submitDisabled && blockedReason !== undefined && !expired && (
        <p className="text-muted mt-1.5 text-center text-xs">{blockedReason}</p>
      )}

      <div className="bg-success-soft rounded-control mt-2.5 flex items-start gap-2 px-2.5 py-2.5 text-[12.5px]">
        <ShieldCheck aria-hidden="true" className="text-success mt-px size-4 flex-none" />
        Деньги уйдут фабрике после приёмки. Спор решает платформа по спецификации и фотоотчётам.
      </div>
    </aside>
  );
}

/** Базовую строку показываем как в макете — «Партия 1 000 × 168 ₽»; остальные как есть. */
function lineTitle(line: QuoteLine, qty: number, unitPrice: number): string {
  if (line.kind !== "base") return line.title;
  return `Партия ${formatNumber(qty)} × ${formatRub(unitPrice)}`;
}
