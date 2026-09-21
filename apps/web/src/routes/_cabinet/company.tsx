import { createFileRoute } from "@tanstack/react-router";

import { CompanyPage, type CompanyTab } from "@/modules/account";

const TABS: CompanyTab[] = ["details", "team", "addresses", "security"];

export const Route = createFileRoute("/_cabinet/company")({
  validateSearch: (input: Record<string, unknown>) => {
    const tab = TABS.find((value) => value === input.tab);
    return tab === undefined || tab === "details" ? {} : { tab };
  },
  component: CompanyRoute,
});

function CompanyRoute() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <CompanyPage
      tab={tab ?? "details"}
      onTabChange={(next) => {
        void navigate({ search: next === "details" ? {} : { tab: next }, replace: true });
      }}
    />
  );
}
