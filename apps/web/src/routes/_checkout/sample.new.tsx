import { createFileRoute } from "@tanstack/react-router";

import { parseSampleSearch, SampleOrderPage } from "@/modules/checkout";

/* /sample/new?offer=2231 — заказ образца. */
export const Route = createFileRoute("/_checkout/sample/new")({
  validateSearch: (input: Record<string, unknown>) => parseSampleSearch(input),
  component: SampleNewRoute,
});

function SampleNewRoute() {
  const { offer } = Route.useSearch();
  return <SampleOrderPage offerId={offer} />;
}
