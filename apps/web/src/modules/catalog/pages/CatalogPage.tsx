import type { OfferSummary } from "@partiya/api-contracts";
import { BreadcrumbLink, BreadcrumbPage, Breadcrumbs, Box, Button, EmptyState } from "@partiya/ui";
import { useQueries } from "@tanstack/react-query";

import { categoryHref, resolveCategoryPath } from "@/shared/lib/categories";
import { formatNumber } from "@/shared/lib/format";
import { plural } from "@/shared/lib/plural";
import { catalogSearchOptions } from "@/shared/api";
import { AppLink, OfferCard, OfferRow } from "@/shared/ui";

import { ActiveFilters } from "../components/ActiveFilters";
import { FiltersSkeleton, OfferGridSkeleton } from "../components/CatalogSkeleton";
import { FilterPanel } from "../components/FilterPanel";
import { MobileFilters } from "../components/MobileFilters";
import { ResultsHeader } from "../components/ResultsHeader";
import type { CatalogSearch } from "../lib/search-params";
import {
  activeFilterCount,
  clearFilters,
  hasActiveFilters,
  pageQuery,
  PER_PAGE,
  toCatalogQuery,
} from "../lib/search-params";

/* Макет: экраны catalog (сетка) и catalog-list (список). Фильтры, сортировка, режим показа
   и страница целиком лежат в URL — страница ничего не хранит у себя. */

export type CatalogPageProps = {
  categoryPath: string[];
  search: CatalogSearch;
  onChange: (next: CatalogSearch) => void;
};

export function CatalogPage({ categoryPath, search, onChange }: CatalogPageProps) {
  const query = toCatalogQuery(search, categoryPath);
  const page = search.page ?? 1;

  // «Показать ещё» не заменяет выдачу, а дочитывает следующие страницы поверх загруженных
  const pages = useQueries({
    queries: Array.from({ length: page }, (_, index) =>
      catalogSearchOptions(pageQuery(query, index + 1)),
    ),
  });

  const first = pages[0];
  const head = first?.data;
  const items: OfferSummary[] = pages.flatMap((result) => result.data?.items ?? []);
  const failed = pages.find((result) => result.isError);
  const loadingMore = page > 1 && pages[page - 1]?.isFetching === true;

  const chain = resolveCategoryPath(categoryPath);
  const title = chain.at(-1)?.title ?? "Каталог";
  const total = head?.total ?? 0;
  const pageCount = head?.pageCount ?? 1;
  const facets = head?.facets ?? [];

  return (
    <>
      <Breadcrumbs>
        <BreadcrumbLink asChild>
          <AppLink to="/">Главная</AppLink>
        </BreadcrumbLink>
        <BreadcrumbLink asChild>
          <AppLink to="/catalog">Каталог</AppLink>
        </BreadcrumbLink>
        {chain.map((node, index) =>
          index === chain.length - 1 ? (
            <BreadcrumbPage key={node.slug}>{node.title}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink key={node.slug} asChild>
              <AppLink to={categoryHref(categoryPath.slice(0, index + 1))}>{node.title}</AppLink>
            </BreadcrumbLink>
          ),
        )}
      </Breadcrumbs>

      <div className="grid items-start gap-4 md:grid-cols-[232px_1fr]">
        <aside className="bg-surface rounded-card hidden px-4 py-3.5 md:sticky md:top-3 md:block">
          {head ? (
            <FilterPanel facets={facets} search={search} total={total} onChange={onChange} />
          ) : (
            <FiltersSkeleton />
          )}
        </aside>

        {/* min-w-0: иначе колонка грида растягивается по самой широкой строке — полосе сортировок */}
        <section className="min-w-0">
          <h1 className="font-heading mb-1.5 text-2xl leading-[1.2] font-bold">
            {title}{" "}
            <span className="text-muted font-sans text-sm font-normal">
              {formatNumber(total)} {plural(total, ["предложение", "предложения", "предложений"])}
            </span>
          </h1>

          <ActiveFilters facets={facets} search={search} onChange={onChange} />

          {head ? (
            <MobileFilters
              facets={facets}
              search={search}
              total={total}
              activeCount={activeFilterCount(search)}
              onChange={onChange}
            />
          ) : null}

          <ResultsHeader search={search} onChange={onChange} />

          <div id="catalog-results">
            {failed ? (
              <Box className="py-8 text-center">
                <EmptyState
                  title="Не получилось загрузить выдачу"
                  description="Проблема на нашей стороне, мы уже знаем. Попробуйте ещё раз — фильтры сохранятся."
                  action={
                    <Button
                      variant="cta"
                      onClick={() => void Promise.all(pages.map((result) => result.refetch()))}
                    >
                      Повторить
                    </Button>
                  }
                />
              </Box>
            ) : first?.isPending ? (
              <OfferGridSkeleton />
            ) : items.length === 0 ? (
              <Box>
                <EmptyState
                  title="Под такие условия предложений нет"
                  description="Чаще всего мешает минимальная партия: у 94 % фабрик MOQ на худи — от 200 штук. Снимите часть условий."
                  action={
                    <>
                      {hasActiveFilters(search) ? (
                        <Button variant="cta" onClick={() => onChange(clearFilters(search))}>
                          Сбросить все фильтры
                        </Button>
                      ) : null}
                      <Button asChild variant="ghost">
                        <AppLink to="/catalog">Весь каталог</AppLink>
                      </Button>
                    </>
                  }
                />
              </Box>
            ) : (search.view ?? "grid") === "list" ? (
              <div className="flex flex-col gap-2">
                {items.map((offer) => (
                  <OfferRow key={offer.id} offer={offer} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {items.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && !failed ? (
            <div className="py-5.5 text-center">
              {page < pageCount ? (
                <Button
                  variant="ghost"
                  disabled={loadingMore}
                  onClick={() => onChange({ ...search, page: page + 1 })}
                >
                  {loadingMore
                    ? "Загружаем…"
                    : `Показать ещё ${formatNumber(Math.min(PER_PAGE, total - items.length))}`}
                </Button>
              ) : null}
              <span className="text-muted ml-3 text-[12.5px]">
                Страница {page} из {pageCount}
              </span>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
