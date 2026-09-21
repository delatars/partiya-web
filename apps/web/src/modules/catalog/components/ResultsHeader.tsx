import { cn } from "@partiya/ui";
import { LayoutGrid, List } from "lucide-react";

import type { CatalogSearch } from "../lib/search-params";
import { DEFAULT_SORT, withPatch } from "../lib/search-params";

/* Макет: .res-head — сортировки слева, переключатель сетка/список справа. */

const SORTS = [
  ["popular", "Популярные"],
  ["price_asc", "Дешевле"],
  ["lead_asc", "Быстрее"],
  ["rating_desc", "Рейтинг"],
  ["free_capacity_desc", "Свободнее"],
] as const;

export type ResultsHeaderProps = {
  search: CatalogSearch;
  onChange: (next: CatalogSearch) => void;
};

export function ResultsHeader({ search, onChange }: ResultsHeaderProps) {
  const sort = search.sort ?? DEFAULT_SORT;
  const view = search.view ?? "grid";

  return (
    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
      {/* на узком экране пять сортировок не помещаются — прокручиваем полосу, как меню категорий */}
      <div
        role="group"
        aria-label="Сортировка"
        className="bg-surface rounded-control flex max-w-full [scrollbar-width:none] gap-1 overflow-x-auto p-[3px] [&::-webkit-scrollbar]:hidden"
      >
        {SORTS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={sort === value}
            onClick={() =>
              // популярное — сортировка по умолчанию, в URL её не пишем
              onChange(withPatch(search, { sort: value === DEFAULT_SORT ? undefined : value }))
            }
            className={cn(
              "text-muted shrink-0 rounded px-3 py-1.5 text-[13px]",
              sort === value && "bg-subtle text-text font-medium",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="group" aria-label="Вид выдачи" className="flex gap-0.5">
        {(
          [
            ["grid", "Сеткой", LayoutGrid],
            ["list", "Списком", List],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            aria-label={label}
            onClick={() =>
              onChange(withPatch(search, { view: value === "grid" ? undefined : value }))
            }
            className={cn(
              "rounded-control border-border-strong text-muted grid size-[30px] place-items-center border",
              view === value && "bg-text border-text text-white",
            )}
          >
            <Icon aria-hidden="true" className="size-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}
