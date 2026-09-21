import { createFileRoute } from "@tanstack/react-router";

import { FactoriesPage, parseFactoriesSearch, toFactoryQuery } from "@/modules/factories";
import { factoryListOptions } from "@/shared/api";

/* /factories — список заводов. Фильтры (город, специализация, аудит, поиск) — в URL. */
export const Route = createFileRoute("/_public/factories")({
  validateSearch: (input: Record<string, unknown>) => parseFactoriesSearch(input),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(factoryListOptions(toFactoryQuery(deps)));
  },
  component: FactoriesRoute,
});

function FactoriesRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return <FactoriesPage search={search} onChange={(next) => void navigate({ search: next })} />;
}
