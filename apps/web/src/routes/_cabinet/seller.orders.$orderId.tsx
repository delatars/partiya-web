import { createFileRoute } from "@tanstack/react-router";

import { SellerOrderPage } from "@/modules/seller";

/* /seller/orders/{id} — заказ глазами завода. Тот же заказ, что у заказчика на
   /account/orders/{id}: один журнал, одно хранилище, разные срезы. */
export const Route = createFileRoute("/_cabinet/seller/orders/$orderId")({
  component: SellerOrderRoute,
});

function SellerOrderRoute() {
  const { orderId } = Route.useParams();
  return <SellerOrderPage orderId={Number(orderId)} />;
}
