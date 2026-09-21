import { getConfig } from "@partiya/shared";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { OrderDemoConsole } from "@/modules/checkout";
import { OrderTrackingPage } from "@/modules/tracking";
import { orderOptions } from "@/shared/api";

/* /account/orders/{id} — трекинг заказа.

   Демо-пульт собирается здесь, а не внутри страницы: он живёт в модуле, которому
   принадлежит мок-бэкенд (`checkout`), а кросс-модульные импорты правилами слоёв
   запрещены. Маршрут — единственное место, где два модуля встречаются. */
export const Route = createFileRoute("/_cabinet/account/orders/$orderId/")({
  component: OrderTrackingRoute,
});

function OrderTrackingRoute() {
  const { orderId } = Route.useParams();
  const id = Number(orderId);

  return <OrderTrackingPage orderId={id} demoPanel={<DemoPanel orderId={id} />} />;
}

/** В сборке с `useMocks: false` не рисует ничего и заказ не запрашивает. */
function DemoPanel({ orderId }: { orderId: number }) {
  const useMocks = getConfig().useMocks;
  const { data } = useQuery({ ...orderOptions(orderId), enabled: useMocks });
  if (!useMocks || !data) return null;
  return <OrderDemoConsole order={data} />;
}
