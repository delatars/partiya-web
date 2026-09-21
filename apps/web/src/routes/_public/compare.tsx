import { createFileRoute } from "@tanstack/react-router";

import { ComparePage, parseCompareSearch } from "@/modules/compare";

/* /compare — таблица сравнения. Набор позиций приходит из лотка сравнения,
   поэтому loader-у здесь нечего греть: id известны только в браузере. */
export const Route = createFileRoute("/_public/compare")({
  validateSearch: (input: Record<string, unknown>) => parseCompareSearch(input),
  component: CompareRoute,
});

function CompareRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return <ComparePage search={search} onChange={(next) => void navigate({ search: next })} />;
}
