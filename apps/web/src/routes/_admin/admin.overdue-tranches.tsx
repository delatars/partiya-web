import { createFileRoute } from "@tanstack/react-router";

import { AdminOverdueTranchesPage } from "@/modules/backoffice";

export const Route = createFileRoute("/_admin/admin/overdue-tranches")({
  component: AdminOverdueTranchesPage,
});
