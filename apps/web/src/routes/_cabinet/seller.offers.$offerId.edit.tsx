import { createFileRoute } from "@tanstack/react-router";

import { SellerOfferEditPage } from "@/modules/seller";

/* Редактор SKU. `new` вместо номера — форма нового предложения: отдельного маршрута
   под неё нет намеренно, иначе пришлось бы дублировать всю страницу. */
export const Route = createFileRoute("/_cabinet/seller/offers/$offerId/edit")({
  component: SellerOfferEditRoute,
});

function SellerOfferEditRoute() {
  const { offerId } = Route.useParams();
  const parsed = Number(offerId);
  return <SellerOfferEditPage offerId={Number.isFinite(parsed) ? parsed : null} />;
}
