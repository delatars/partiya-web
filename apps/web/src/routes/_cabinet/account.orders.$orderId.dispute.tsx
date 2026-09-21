import { createFileRoute } from "@tanstack/react-router";

import { OrderDisputePage } from "@/modules/tracking";

/* /account/orders/{id}/dispute — претензия и состояние спора.
   Один маршрут на оба состояния: пока спора нет — форма, как только открыт — переписка. */
export const Route = createFileRoute("/_cabinet/account/orders/$orderId/dispute")({
  component: OrderDisputeRoute,
});

function OrderDisputeRoute() {
  const { orderId } = Route.useParams();
  return <OrderDisputePage orderId={Number(orderId)} />;
}
