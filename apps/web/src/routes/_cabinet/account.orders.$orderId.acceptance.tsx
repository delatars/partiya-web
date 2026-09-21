import { createFileRoute } from "@tanstack/react-router";

import { OrderAcceptancePage } from "@/modules/tracking";

/* /account/orders/{id}/acceptance — приёмка партии и отзыв о фабрике. */
export const Route = createFileRoute("/_cabinet/account/orders/$orderId/acceptance")({
  component: OrderAcceptanceRoute,
});

function OrderAcceptanceRoute() {
  const { orderId } = Route.useParams();
  return <OrderAcceptancePage orderId={Number(orderId)} />;
}
