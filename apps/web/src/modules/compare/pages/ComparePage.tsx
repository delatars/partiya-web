import type { OfferDetail } from "@partiya/api-contracts";
import {
  Box,
  BreadcrumbLink,
  BreadcrumbPage,
  Breadcrumbs,
  Button,
  Checkbox,
  cn,
  EmptyState,
  MiniBar,
  Placeholder,
  Rating,
  Skeleton,
  Tag,
} from "@partiya/ui";
import { useQueries } from "@tanstack/react-query";
import { X } from "lucide-react";

import { offerDetailOptions } from "@/shared/api";
import { formatNumber } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";
import { COMPARE_LIMIT, useListsStore } from "@/shared/stores/lists-store";
import { AppLink } from "@/shared/ui";

import type { CompareRow } from "../lib/compare";
import { bestOfferIds, visibleRows } from "../lib/compare";
import type { CompareSearch } from "../lib/search-params";
import { withCompareOnly } from "../lib/search-params";

/* Макет: экран compare — таблица сравнения до четырёх предложений.

   Что сравнивать, помнит лоток (`lists-store`), а не URL: позиции туда кладут из
   каталога и с карточки, и таблица обязана меняться вместе с лотком. В URL живёт только
   режим показа — «только различия». */

export type ComparePageProps = {
  search: CompareSearch;
  onChange: (next: CompareSearch) => void;
};

export function ComparePage({ search, onChange }: ComparePageProps) {
  const entries = useListsStore((state) => state.compare);
  const remove = useListsStore((state) => state.removeFromCompare);
  const clear = useListsStore((state) => state.clearCompare);
  const onlyDifferences = search.only === true;

  const results = useQueries({
    queries: entries.map((entry) => offerDetailOptions(entry.id)),
  });

  const offers = results
    .map((result) => result.data)
    .filter((offer): offer is OfferDetail => offer !== undefined);
  const loading = results.some((result) => result.isPending);

  return (
    <>
      <Breadcrumbs>
        <BreadcrumbLink asChild>
          <AppLink to="/">Главная</AppLink>
        </BreadcrumbLink>
        <BreadcrumbLink asChild>
          <AppLink to="/catalog">Каталог</AppLink>
        </BreadcrumbLink>
        <BreadcrumbPage>Сравнение</BreadcrumbPage>
      </Breadcrumbs>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl leading-[1.2] font-bold">Сравнение предложений</h1>
          <p className="text-muted text-[12.5px]">
            {entries.length} из {COMPARE_LIMIT} · лучшее значение в строке подсвечено
          </p>
        </div>

        {entries.length === 0 ? null : (
          <div className="flex items-center gap-3">
            <Checkbox
              checked={onlyDifferences}
              onCheckedChange={(next) => onChange(withCompareOnly(search, next === true))}
              label="Только различия"
              rowClassName="py-0"
            />
            <Button variant="ghost" onClick={clear}>
              Очистить
            </Button>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <Box>
          <EmptyState
            title="Сравнивать пока нечего"
            description="Отметьте «⇄» на карточках в каталоге — до четырёх предложений. Сравним цены по объёму, сроки, свободную мощность и аудит."
            action={
              <Button asChild variant="cta">
                <AppLink to="/catalog">Подобрать предложения</AppLink>
              </Button>
            }
          />
        </Box>
      ) : loading && offers.length === 0 ? (
        <Box aria-busy="true" aria-label="Загружаем сравнение">
          <Skeleton className="h-[420px] w-full" />
        </Box>
      ) : (
        <CompareTable offers={offers} onlyDifferences={onlyDifferences} onRemove={remove} />
      )}

      <p className="text-muted mt-2.5 text-[12.5px]">
        Цены — за штуку без НДС на указанном объёме. Итог партии посчитан с доставкой, которую
        фабрика предлагает по умолчанию, без дополнительных опций.
      </p>
    </>
  );
}

function CompareTable({
  offers,
  onlyDifferences,
  onRemove,
}: {
  offers: readonly OfferDetail[];
  onlyDifferences: boolean;
  onRemove: (id: number) => void;
}) {
  const rows = visibleRows(offers, onlyDifferences);

  return (
    <Box padding="none" className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-[13.5px]">
        <caption className="sr-only">Сравнение выбранных предложений</caption>
        <thead>
          <tr>
            {/* первая колонка закреплена: на мобильном таблица едет вбок, названия строк остаются */}
            <th className="bg-surface border-border sticky left-0 z-10 w-[12%] border-b p-3.5 text-left font-normal" />
            {offers.map((offer) => (
              <th
                key={offer.id}
                scope="col"
                className="border-border w-[22%] border-b p-3.5 text-left align-top font-normal"
              >
                <AppLink to={`/offer/${String(offer.id)}`} aria-label={offer.title}>
                  <Placeholder
                    tone={offer.tone ?? "a"}
                    radius="control"
                    label="фото"
                    className="mb-2 aspect-[4/3] max-w-[220px]"
                  />
                </AppLink>
                <AppLink to={`/offer/${String(offer.id)}`} className="mb-0.5 block font-medium">
                  {offer.title}
                </AppLink>
                <div className="text-muted text-[12.5px]">
                  <AppLink to={`/factory/${String(offer.factory.id)}`} className="hover:text-text">
                    «{offer.factory.name}»
                  </AppLink>
                  , {offer.factory.city}
                </div>
                <Button asChild variant="cta" size="sm" wide className="my-2">
                  <AppLink to={`/offer/${String(offer.id)}`}>Рассчитать партию</AppLink>
                </Button>
                <button
                  type="button"
                  onClick={() => onRemove(offer.id)}
                  className="text-muted hover:text-danger inline-flex items-center gap-1 text-xs"
                >
                  убрать <X aria-hidden="true" className="size-3" />
                </button>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <CompareTableRow key={row.key} row={row} offers={offers} />
          ))}
        </tbody>
      </table>
    </Box>
  );
}

function CompareTableRow({ row, offers }: { row: CompareRow; offers: readonly OfferDetail[] }) {
  const best = bestOfferIds(row, offers);

  return (
    <tr className="group">
      <th
        scope="row"
        className="bg-surface border-border text-muted sticky left-0 z-10 border-b px-3.5 py-2.5 text-left font-normal"
      >
        {row.label}
      </th>
      {offers.map((offer) => (
        <td
          key={offer.id}
          className={cn(
            "border-border border-b px-3.5 py-2.5",
            best.has(offer.id) ? "bg-success-soft" : "group-hover:bg-row-hover",
          )}
        >
          <CompareCell rowKey={row.key} offer={offer} text={row.value(offer)} />
        </td>
      ))}
    </tr>
  );
}

/** Большинство ячеек — просто текст; трём строкам макет добавляет свой значок. */
function CompareCell({
  rowKey,
  offer,
  text,
}: {
  rowKey: string;
  offer: OfferDetail;
  text: string;
}) {
  if (rowKey === "audit") {
    return offer.badges.includes("audit") ? (
      <Tag tone="ok">пройден</Tag>
    ) : (
      <Tag tone="done">нет</Tag>
    );
  }

  if (rowKey === "free") {
    return (
      <span className="whitespace-nowrap">
        {text} <MiniBar value={offer.freeCapacityPct} className="w-14" />
      </span>
    );
  }

  if (rowKey === "rating") {
    return (
      <Rating
        value={offer.factory.rating}
        meta={`· ${formatNumber(offer.factory.reviews)} ${plural(offer.factory.reviews, ["отзыв", "отзыва", "отзывов"])}`}
      />
    );
  }

  return (
    <span
      className={cn(
        rowKey.startsWith("price") || rowKey === "batch" ? "num font-medium" : undefined,
      )}
    >
      {text}
    </span>
  );
}
