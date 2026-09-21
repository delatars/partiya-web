import { createFileRoute } from "@tanstack/react-router";

import { CheckoutPage, parseCheckoutSearch } from "@/modules/checkout";

/* /order/new — оформление партии.

   Расчёт (объём, опции, доставка, промокод) и номер черновика живут в типизированных
   search-params: ссылкой можно поделиться, перезагрузка её не теряет, а возврат на
   адрес с `?draft=` продолжает начатое оформление. */
export const Route = createFileRoute("/_checkout/order/new")({
  validateSearch: (input: Record<string, unknown>) => parseCheckoutSearch(input),
  component: OrderNewRoute,
});

function OrderNewRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <CheckoutPage
      search={search}
      // replace: крутилка объёма и автосохранение не должны забивать историю браузера
      onSearchChange={(next) => void navigate({ search: next, replace: true })}
    />
  );
}
