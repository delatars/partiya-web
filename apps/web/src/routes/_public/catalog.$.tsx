import { createFileRoute } from "@tanstack/react-router";

import { CatalogPage, pageQuery, parseCatalogSearch, toCatalogQuery } from "@/modules/catalog";
import { catalogSearchOptions } from "@/shared/api";
import { splitCategoryPath } from "@/shared/lib/categories";

/* /catalog/$ — splat-сегмент это путь категории: /catalog/tekstil/futbolki.
   Фильтры, сортировка, режим показа и страница — типизированные search-params. */
export const Route = createFileRoute("/_public/catalog/$")({
  validateSearch: (input: Record<string, unknown>) => parseCatalogSearch(input),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps, params }) => {
    // запрос стартует вместе с навигацией; ждать его не надо — выдача умеет скелетоны
    const query = toCatalogQuery(deps, splitCategoryPath(params._splat));
    void context.queryClient.prefetchQuery(catalogSearchOptions(pageQuery(query, 1)));
  },
  component: CatalogRoute,
});

function CatalogRoute() {
  const { _splat } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <CatalogPage
      categoryPath={splitCategoryPath(_splat)}
      search={search}
      onChange={(next) => void navigate({ search: next })}
    />
  );
}
