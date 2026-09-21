import { createFileRoute, notFound } from "@tanstack/react-router";

import { OrderPaymentPage } from "@/modules/checkout";

/* /order/$orderId/pay — счёт и ожидание поступления денег в эскроу.

   Маршрут лежит под layout-ом оформления, а не кабинета: человек ещё в сделке, и
   шапка с меню категорий уводила бы его из неё. */
export const Route = createFileRoute("/_checkout/order/$orderId/pay")({
  component: OrderPayRoute,
});

function OrderPayRoute() {
  const { orderId } = Route.useParams();
  const id = Number.parseInt(orderId, 10);
  // «/order/счёт/pay» — это не 404 от сервера, а битый адрес: до сети идти незачем
  if (!Number.isInteger(id) || id <= 0) throw notFound();

  return <OrderPaymentPage orderId={id} />;
}
