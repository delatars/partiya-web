import { type CategoryNode, categoryHref } from "@/shared/lib/categories";
import { formatNumber, formatRub } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";

import { categoryIcon } from "./category-icon";
import { AppLink } from "./router-link";

/* Сетка корневых категорий — главная и корень каталога (п. 28). Вид — как на референсах
   cat1–3.jpg (карточка: название сверху, иллюстрация под ним), язык — макета «Лента»:
   белая плитка .cat-tile на сером фоне, радиус карточки, тень при наведении, приглушённая
   подпись. Колонки 4 → 2 → 1 (≥ 1024 / ≥ 640 / телефон); на телефоне плитка — строка
   «иконка слева, текст справа», чтобы 28 категорий не растянулись на десять экранов. */

export type CategoryGridProps = {
  categories: readonly CategoryNode[];
  /** Заголовок секции для скринридера: сетка — список ссылок. */
  label?: string;
};

function categoryNote(category: CategoryNode): string {
  if (category.offers === 0) return "Заводы скоро появятся";
  const count = `${formatNumber(category.offers)} ${plural(category.offers, ["предложение", "предложения", "предложений"])}`;
  return category.priceFrom === null ? count : `${count} · от ${formatRub(category.priceFrom)}`;
}

export function CategoryGrid({ categories, label = "Категории" }: CategoryGridProps) {
  return (
    <ul aria-label={label} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category) => {
        const Icon = categoryIcon(category.slug);
        const empty = category.offers === 0;
        return (
          <li key={category.slug} className="min-w-0">
            <AppLink
              to={categoryHref([category.slug])}
              data-empty={empty ? "" : undefined}
              className="group rounded-card bg-surface hover:shadow-card-hover focus-visible:outline-action flex h-full items-center gap-3 p-3 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-h-[200px] sm:flex-col sm:items-stretch sm:gap-2 sm:p-4"
            >
              <span
                aria-hidden="true"
                className="bg-subtle rounded-control grid size-14 shrink-0 place-items-center sm:order-2 sm:size-auto sm:flex-1 sm:bg-transparent"
              >
                <Icon
                  strokeWidth={1.25}
                  className="text-text group-hover:text-action size-7 transition-colors sm:size-[72px]"
                />
              </span>
              <span className="min-w-0 sm:order-1">
                <b className="block text-[15px] leading-snug font-bold [overflow-wrap:anywhere] sm:min-h-[2.75em]">
                  {category.title}
                </b>
                <span className="text-muted block text-[12.5px]">{categoryNote(category)}</span>
              </span>
            </AppLink>
          </li>
        );
      })}
    </ul>
  );
}
