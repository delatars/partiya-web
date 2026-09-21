import type { OfferDetail, Quote, QuoteLine } from "@partiya/api-contracts";
import {
  Alert,
  Button,
  Checkbox,
  cn,
  Field,
  Input,
  Price,
  Select,
  SelectItem,
  Skeleton,
  Spinner,
} from "@partiya/ui";
import { Minus, Plus, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { isApiError } from "@/shared/api";
import { formatIsoDayMonth } from "@/shared/lib/dates";
import { formatNumber, formatRub, toRubles } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";
import { nextTierHint, percentOf, tierFor } from "@/shared/lib/quote";
import { AppLink } from "@/shared/ui";

import type { OfferSearch } from "../lib/search-params";
import {
  checkoutSearch,
  effectiveDeliveryId,
  effectiveQty,
  isOptionAvailable,
  qtyStep,
  selectedOptionIds,
  withOption,
  withPatch,
} from "../lib/search-params";

/* Макет: .buy — калькулятор партии. Цена за штуку, объём, опции, доставка, строки
   котировки, итог, два CTA, эскроу и карточка продавца.

   Считает сервер (`POST /quotes`), а не этот компонент: ввод уходит в URL, URL — в ключ
   запроса, запрос — в котировку. Поэтому калькулятор не хранит состояния: обновление
   страницы и ссылка, отправленная коллеге, дают тот же расчёт.

   Пока идёт пересчёт, на экране остаётся предыдущий итог — приглушённый и с индикатором
   (ARCHITECTURE.md, 5.5), иначе цифра прыгает на каждое нажатие «+». */

/** Пауза перед запросом: человек успевает дописать «1 000», а сервер считает один раз. */
const QTY_DEBOUNCE_MS = 200;

export type BuyBoxProps = {
  offer: OfferDetail;
  search: OfferSearch;
  onChange: (next: OfferSearch) => void;
  quote: Quote | undefined;
  /** Первый расчёт — показывать нечего, рисуем скелетон. */
  pending: boolean;
  /** Идёт пересчёт, прежний итог ещё на экране. */
  recalculating: boolean;
  error: unknown;
  onRetry: () => void;
};

export function BuyBox({
  offer,
  search,
  onChange,
  quote,
  pending,
  recalculating,
  error,
  onRetry,
}: BuyBoxProps) {
  const qty = effectiveQty(search, offer.moq);
  const step = qtyStep(offer.moq);
  const chosenOptions = selectedOptionIds(search);
  const deliveryId = effectiveDeliveryId(search, offer);
  const unitPrice = quote?.unitPrice ?? tierFor(offer.tiers, qty)?.unitPrice ?? offer.priceFrom;
  const hint = nextTierHint(offer.tiers, qty);
  const repeatPercent = offer.repeatDiscountPercent;

  const setQty = (next: number) => onChange(withPatch(search, { qty: next }));

  return (
    <aside className="bg-surface border-border rounded-card sticky top-3 border p-4">
      <div className="flex items-baseline gap-2">
        <Price className="text-[28px]" value={toRubles(unitPrice)} />
        <span className="text-muted text-[12.5px]">/шт при {formatNumber(qty)}</span>
      </div>

      {repeatPercent === undefined ? null : (
        <button
          type="button"
          aria-pressed={search.repeat === true}
          onClick={() =>
            onChange(withPatch(search, { repeat: search.repeat === true ? undefined : true }))
          }
          className={cn(
            "mt-0.5 block text-left text-[12.5px]",
            search.repeat === true ? "text-discount font-medium" : "text-muted",
          )}
        >
          {search.repeat === true ? "Считаем как повтор партии" : "При повторе партии"} −
          {repeatPercent} % ·{" "}
          <span className="text-discount font-medium">
            {formatRub(unitPrice - percentOf(unitPrice, repeatPercent))}
          </span>
        </button>
      )}

      <div className="mt-3 grid gap-2">
        <QtyField
          qty={qty}
          moq={offer.moq}
          step={step}
          onCommit={setQty}
          hint={
            hint ? (
              <>
                до следующей ступени {formatNumber(hint.qtyLeft)} шт — цена упадёт до{" "}
                {formatRub(hint.unitPrice)}
              </>
            ) : undefined
          }
        />

        {offer.options.length === 0 ? null : (
          <fieldset className="border-0 p-0">
            <legend className="text-muted mb-1 text-xs">Опции</legend>
            {offer.options.map((option) => {
              const available = isOptionAvailable(option, qty);
              return (
                <Checkbox
                  key={option.id}
                  checked={chosenOptions.includes(option.id)}
                  disabled={!available}
                  onCheckedChange={(next) => onChange(withOption(search, option.id, next === true))}
                  rowClassName="py-0.5"
                  labelClassName={cn(!available && "text-muted")}
                  label={option.title}
                  hint={
                    <span className={cn("num", !available && "opacity-60")}>
                      {formatRub(option.price)}
                      {option.unit === "per_item" ? "/шт" : ""}
                    </span>
                  }
                />
              );
            })}
            {offer.options.some((option) => !isOptionAvailable(option, qty)) ? (
              <p className="text-muted mt-0.5 text-xs">
                Часть опций фабрика включает от большего объёма.
              </p>
            ) : null}
          </fieldset>
        )}

        {offer.delivery.length === 0 ? null : (
          <Field label="Доставка">
            <Select
              value={deliveryId}
              onValueChange={(next) => onChange(withPatch(search, { delivery: next }))}
              aria-label="Вариант доставки"
            >
              {offer.delivery.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.title} · {formatRub(option.price)}
                </SelectItem>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <div className="mt-3">
        {error ? (
          <Alert
            kind="danger"
            title="Не удалось посчитать партию"
            action={
              <Button size="sm" variant="ghost" onClick={onRetry}>
                Повторить
              </Button>
            }
          >
            {quoteErrorText(error)}
          </Alert>
        ) : pending ? (
          <QuoteLinesSkeleton />
        ) : quote ? (
          <QuoteLines quote={quote} qty={qty} dimmed={recalculating} />
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <b>Итого</b>
        <span className="flex items-baseline gap-2">
          {recalculating ? (
            <Spinner size="sm" label="Пересчитываем" className="text-muted" />
          ) : null}
          {quote ? (
            <Price
              className={cn("text-[22px] transition-opacity", recalculating && "opacity-55")}
              value={toRubles(quote.total)}
            />
          ) : (
            <Skeleton className="h-6 w-28" />
          )}
        </span>
      </div>

      <p className="text-muted mt-1 mb-3 text-[12.5px]">
        {quote?.leadDays === undefined
          ? `Срок ${String(offer.leadDaysMin)}–${String(offer.leadDaysMax)} раб. дней`
          : `Срок ${String(quote.leadDays)} раб. ${plural(quote.leadDays, ["день", "дня", "дней"])}`}
        {formatIsoDayMonth(quote?.shipDate)
          ? ` · отгрузка ~${String(formatIsoDayMonth(quote?.shipDate))}`
          : ""}
      </p>

      <Button asChild variant="cta" size="lg" wide>
        <AppLink to="/order/new" search={checkoutSearch(offer, search)}>
          Оформить партию
        </AppLink>
      </Button>

      {offer.sample ? (
        <Button asChild wide className="mt-1.5">
          <AppLink to="/sample/new" search={{ offer: offer.id }}>
            Заказать образец · {formatRub(offer.sample.price)}
          </AppLink>
        </Button>
      ) : null}

      <div className="bg-success-soft rounded-control mt-2.5 flex items-start gap-2 px-2.5 py-2.5 text-[12.5px]">
        <ShieldCheck aria-hidden="true" className="text-success mt-px size-4 flex-none" />
        Эскроу платформы: фабрика получит деньги после вашей приёмки.
      </div>

      <div className="border-border mt-3 flex items-center gap-2.5 border-t pt-3 text-[13px]">
        <span
          aria-hidden="true"
          className="bg-header font-heading grid size-9 flex-none place-items-center rounded-full text-sm font-bold text-white"
        >
          {offer.factory.name.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <b className="font-medium">«{offer.factory.name}»</b>, {offer.factory.city}
          <div className="text-muted text-[12.5px]">
            {offer.factory.completedOrders === undefined
              ? null
              : `${formatNumber(offer.factory.completedOrders)} ${plural(offer.factory.completedOrders, ["заказ", "заказа", "заказов"])} · `}
            <AppLink to={`/factory/${String(offer.factory.id)}`} className="text-action">
              все предложения ({offer.factoryOffersCount ?? 1})
            </AppLink>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ объём */

function QtyField({
  qty,
  moq,
  step,
  onCommit,
  hint,
}: {
  qty: number;
  moq: number;
  step: number;
  onCommit: (next: number) => void;
  hint?: ReactNode;
}) {
  // Черновик ввода живёт локально, пока человек печатает: иначе «1» из «1 000»
  // тут же подтянулось бы к MOQ и допечатать было бы нечего.
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (raw: string) => {
    clearTimeout(timer.current);
    setDraft(null);
    const parsed = Number.parseInt(raw.replace(/\D/gu, ""), 10);
    onCommit(Number.isFinite(parsed) && parsed > 0 ? parsed : moq);
  };

  const handleType = (value: string) => {
    setDraft(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(value), QTY_DEBOUNCE_MS);
  };

  const shown = draft ?? formatNumber(qty);
  const typedBelowMoq = draft !== null && Number.parseInt(draft.replace(/\D/gu, ""), 10) < moq;

  return (
    <Field
      label="Объём, шт"
      hint={typedBelowMoq ? undefined : hint}
      error={typedBelowMoq ? `Минимальная партия — ${formatNumber(moq)} шт` : undefined}
    >
      <div className="flex gap-1.5">
        <Button
          variant="ghost"
          aria-label={`Убавить на ${formatNumber(step)}`}
          disabled={qty <= moq}
          onClick={() => commit(String(Math.max(moq, qty - step)))}
          className="px-2.5"
        >
          <Minus aria-hidden="true" className="size-4" />
        </Button>
        <Input
          numeric
          inputMode="numeric"
          value={shown}
          onChange={(event) => handleType(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          className="text-center"
        />
        <Button
          variant="ghost"
          aria-label={`Добавить ${formatNumber(step)}`}
          onClick={() => commit(String(qty + step))}
          className="px-2.5"
        >
          <Plus aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </Field>
  );
}

/* ------------------------------------------------------------------ строки котировки */

/** Базовую строку показываем как в макете — «Партия 1 000 × 168 ₽»; остальные как есть. */
function lineTitle(line: QuoteLine, qty: number, unitPrice: number): string {
  if (line.kind !== "base") return line.title;
  return `Партия ${formatNumber(qty)} × ${formatRub(unitPrice)}`;
}

function QuoteLines({ quote, qty, dimmed }: { quote: Quote; qty: number; dimmed: boolean }) {
  return (
    <div aria-busy={dimmed} className={cn("transition-opacity", dimmed && "opacity-55")}>
      {quote.lines
        // строка доставки с нулём — это самовывоз, её в счёте показывать незачем
        .filter((line) => line.kind !== "delivery" || line.amount !== 0)
        .map((line, index) => (
          <div
            key={`${line.kind}-${String(index)}`}
            className="border-border flex justify-between gap-3 border-b border-dashed py-1.5 text-[13px]"
          >
            <span className={cn(line.amount < 0 && "text-discount")}>
              {lineTitle(line, qty, quote.unitPrice)}
            </span>
            <span className={cn("num", line.amount < 0 && "text-discount")}>
              {line.amount < 0 ? `−${formatRub(-line.amount)}` : formatRub(line.amount)}
            </span>
          </div>
        ))}
    </div>
  );
}

function QuoteLinesSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  );
}

/** Понятный текст вместо кода ошибки: 422 приходит с detail от движка котировок. */
function quoteErrorText(error: unknown): string {
  if (isApiError(error)) {
    if (error.isNetwork) return "Нет связи с сервером. Проверьте интернет и повторите расчёт.";
    return error.problem?.detail ?? error.message;
  }
  return "Расчёт не удался. Попробуйте ещё раз — параметры сохранятся.";
}
