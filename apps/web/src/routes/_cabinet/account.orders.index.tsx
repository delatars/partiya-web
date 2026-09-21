import { createFileRoute } from "@tanstack/react-router";

import { CustomerOrdersPage, type OrderTab } from "@/modules/account";

const TABS: OrderTab[] = ["all", "work", "action", "done", "cancelled"];

/* Вкладка живёт в URL: со ссылкой «ждут действия» можно прийти из уведомления. */
export const Route = createFileRoute("/_cabinet/account/orders/")({
  validateSearch: (input: Record<string, unknown>) => {
    const tab = TABS.find((bucket) => bucket === input.tab);
    return tab === undefined || tab === "all" ? {} : { tab };
  },
  component: AccountOrdersRoute,
});

function AccountOrdersRoute() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <CustomerOrdersPage
      tab={tab ?? "all"}
      onTabChange={(next) => {
        void navigate({ search: next === "all" ? {} : { tab: next }, replace: true });
      }}
    />
  );
}
