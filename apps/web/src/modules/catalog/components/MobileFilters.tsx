import type { Facet } from "@partiya/api-contracts";
import { Button, Drawer, DrawerClose, DrawerContent, DrawerTrigger } from "@partiya/ui";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { formatNumber } from "@/shared/lib/format";

import type { CatalogSearch } from "../lib/search-params";
import { clearFilters } from "../lib/search-params";
import { FilterPanel } from "./FilterPanel";

/* Макет: экран mobile — фильтры уезжают в нижнюю шторку, внизу кнопка «Показать N». */

export type MobileFiltersProps = {
  facets: readonly Facet[];
  search: CatalogSearch;
  total: number;
  activeCount: number;
  onChange: (next: CatalogSearch) => void;
};

export function MobileFilters({
  facets,
  search,
  total,
  activeCount,
  onChange,
}: MobileFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" className="mb-2.5 md:hidden">
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Фильтры{activeCount > 0 ? ` · ${String(activeCount)}` : ""}
        </Button>
      </DrawerTrigger>
      <DrawerContent
        side="bottom"
        title="Фильтры"
        footer={
          <DrawerClose asChild>
            <Button wide variant="cta" size="lg">
              Показать {formatNumber(total)}
            </Button>
          </DrawerClose>
        }
      >
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            className="text-action text-[12.5px]"
            onClick={() => onChange(clearFilters(search))}
          >
            Сбросить
          </button>
        </div>
        <FilterPanel
          variant="drawer"
          facets={facets}
          search={search}
          total={total}
          onChange={onChange}
        />
      </DrawerContent>
    </Drawer>
  );
}
