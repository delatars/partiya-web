import type { Facet } from "@partiya/api-contracts";
import { Button, Toggle } from "@partiya/ui";

import { formatNumber } from "@/shared/lib/format";

import type { CatalogSearch, ListFacetKey } from "../lib/search-params";
import { facetValues, withFacetValue, withPatch } from "../lib/search-params";
import { FacetGroup } from "./FacetGroup";
import { RangeFilter } from "./RangeFilter";

/* Макет: aside.filters. Состав одинаков на десктопе и в мобильной шторке; в шторке
   «Аудит платформы» и «Есть образец» — переключатели, как на экране mobile макета. */

export type FilterPanelProps = {
  facets: readonly Facet[];
  search: CatalogSearch;
  total: number;
  onChange: (next: CatalogSearch) => void;
  variant?: "sidebar" | "drawer";
};

const TOGGLE_TRUST = new Set(["audit", "sample"]);

export function FilterPanel({
  facets,
  search,
  total,
  onChange,
  variant = "sidebar",
}: FilterPanelProps) {
  const find = (key: string): Facet | undefined => facets.find((facet) => facet.key === key);
  const moq = find("moq");
  const region = find("region");
  const lead = find("lead");
  const trust = find("trust");
  const material = find("material");

  const toggleFacet = (key: ListFacetKey) => (value: string, on: boolean) =>
    onChange(withFacetValue(search, key, value, on));

  const drawerToggles = variant === "drawer" && trust !== undefined;

  return (
    <div className="text-[13.5px]">
      <fieldset>
        <legend className="font-heading mb-2 text-[13px] font-bold">Минимальная партия</legend>
        <RangeFilter
          label="Минимальная партия"
          from={search.moqMin}
          to={search.moqMax}
          onCommit={(from, to) => onChange(withPatch(search, { moqMin: from, moqMax: to }))}
          fromPlaceholder="100"
          toPlaceholder="1 000"
        />
      </fieldset>
      {moq ? <FacetGroup facet={moq} withLegend={false} onToggle={toggleFacet("moq")} /> : null}

      <fieldset className="mt-4">
        <legend className="font-heading mb-2 text-[13px] font-bold">Цена за шт, ₽</legend>
        <RangeFilter
          label="Цена за штуку"
          from={search.priceMin}
          to={search.priceMax}
          onCommit={(from, to) => onChange(withPatch(search, { priceMin: from, priceMax: to }))}
          fromPlaceholder="90"
          toPlaceholder="700"
        />
      </fieldset>

      {region ? <FacetGroup facet={region} onToggle={toggleFacet("region")} /> : null}

      {lead ? (
        <FacetGroup
          facet={lead}
          onToggle={(value) =>
            onChange(withPatch(search, { lead: value === "any" ? undefined : Number(value) }))
          }
        />
      ) : null}

      {trust ? (
        <>
          {drawerToggles ? (
            <fieldset className="mt-4">
              <legend className="font-heading mb-2 text-[13px] font-bold">{trust.label}</legend>
              <div className="grid gap-2.5">
                {trust.options
                  .filter((option) => TOGGLE_TRUST.has(option.value))
                  .map((option) => (
                    <Toggle
                      key={option.value}
                      checked={facetValues(search, "trust").includes(option.value)}
                      onCheckedChange={(on) =>
                        onChange(withFacetValue(search, "trust", option.value, on))
                      }
                      label={option.label}
                      rowClassName="flex-row-reverse justify-between"
                    />
                  ))}
              </div>
            </fieldset>
          ) : null}
          <FacetGroup
            facet={trust}
            withLegend={!drawerToggles}
            options={
              drawerToggles
                ? trust.options.filter((option) => !TOGGLE_TRUST.has(option.value))
                : undefined
            }
            onToggle={toggleFacet("trust")}
          />
        </>
      ) : null}

      {material ? <FacetGroup facet={material} onToggle={toggleFacet("material")} /> : null}

      {variant === "sidebar" ? (
        <Button
          wide
          className="mt-3.5"
          onClick={() =>
            document.getElementById("catalog-results")?.scrollIntoView({ behavior: "smooth" })
          }
        >
          Показать {formatNumber(total)}
        </Button>
      ) : null}
    </div>
  );
}
