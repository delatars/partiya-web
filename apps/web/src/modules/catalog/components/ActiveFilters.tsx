import type { Facet } from "@partiya/api-contracts";
import { Chip } from "@partiya/ui";

import { formatNumber } from "@/shared/lib/format";

import type { CatalogSearch, ListFacetKey } from "../lib/search-params";
import {
  clearFilters,
  hasActiveFilters,
  LIST_FACETS,
  withFacetValue,
  withPatch,
} from "../lib/search-params";

/* Макет: .chips — выбранные фильтры пилюлями, клик снимает фильтр, последняя — «Сбросить». */

export type ActiveFiltersProps = {
  facets: readonly Facet[];
  search: CatalogSearch;
  onChange: (next: CatalogSearch) => void;
};

interface ActiveChip {
  key: string;
  label: string;
  next: CatalogSearch;
}

function buildChips(facets: readonly Facet[], search: CatalogSearch): ActiveChip[] {
  const chips: ActiveChip[] = [];

  for (const facet of facets) {
    for (const option of facet.options) {
      if (!option.selected) continue;
      // радио «любой» выбрано по умолчанию — это не фильтр
      if (facet.kind === "radio") {
        if (search.lead === undefined) continue;
        chips.push({
          key: `${facet.key}:${option.value}`,
          label: `${facet.label}: ${option.label}`,
          next: withPatch(search, { lead: undefined }),
        });
        continue;
      }
      const facetKey = LIST_FACETS.find((key) => key === facet.key) as ListFacetKey | undefined;
      if (!facetKey) continue;
      chips.push({
        key: `${facet.key}:${option.value}`,
        label: option.label,
        next: withFacetValue(search, facetKey, option.value, false),
      });
    }
  }

  if (search.priceMin !== undefined || search.priceMax !== undefined) {
    chips.push({
      key: "price",
      label: `Цена ${rangeLabel(search.priceMin, search.priceMax, "₽")}`,
      next: withPatch(search, { priceMin: undefined, priceMax: undefined }),
    });
  }
  if (search.moqMin !== undefined || search.moqMax !== undefined) {
    chips.push({
      key: "moqRange",
      label: `MOQ ${rangeLabel(search.moqMin, search.moqMax, "шт")}`,
      next: withPatch(search, { moqMin: undefined, moqMax: undefined }),
    });
  }
  if (search.q !== undefined) {
    chips.push({
      key: "q",
      label: `«${search.q}»`,
      next: withPatch(search, { q: undefined }),
    });
  }

  return chips;
}

function rangeLabel(from: number | undefined, to: number | undefined, unit: string): string {
  if (from !== undefined && to !== undefined)
    return `${formatNumber(from)}–${formatNumber(to)} ${unit}`;
  if (from !== undefined) return `от ${formatNumber(from)} ${unit}`;
  return `до ${formatNumber(to ?? 0)} ${unit}`;
}

export function ActiveFilters({ facets, search, onChange }: ActiveFiltersProps) {
  const chips = buildChips(facets, search);
  if (chips.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          on
          removeLabel={`Убрать фильтр: ${chip.label}`}
          onRemove={() => onChange(chip.next)}
        >
          {chip.label}
        </Chip>
      ))}
      {hasActiveFilters(search) ? (
        <Chip onClick={() => onChange(clearFilters(search))}>Сбросить</Chip>
      ) : null}
    </div>
  );
}
