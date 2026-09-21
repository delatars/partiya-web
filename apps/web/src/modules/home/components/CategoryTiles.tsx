import { Placeholder } from "@partiya/ui";

import { CATEGORIES, categoryHref } from "@/shared/lib/categories";
import { formatNumber, formatRub } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";
import { AppLink } from "@/shared/ui";

/* Макет: .cat-tiles / .cat-tile — плитка категории: заглушка фото, название, счётчик и цена. */
export function CategoryTiles() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {CATEGORIES.map((category) => (
        <AppLink
          key={category.slug}
          to={categoryHref([category.slug])}
          className="rounded-card bg-surface hover:shadow-card-hover flex items-center gap-3 p-2.5 transition-shadow"
        >
          <Placeholder tone={category.tone} radius="control" className="size-16 shrink-0" />
          <span>
            <b className="block">{category.title}</b>
            <span className="text-muted text-[12.5px]">
              {formatNumber(category.offers)}{" "}
              {plural(category.offers, ["предложение", "предложения", "предложений"])} · от{" "}
              {formatRub(category.priceFrom)}
            </span>
          </span>
        </AppLink>
      ))}
    </div>
  );
}
