import { createFileRoute } from "@tanstack/react-router";

import { AdminDisputesPage } from "@/modules/backoffice";

export const Route = createFileRoute("/_admin/admin/disputes")({ component: AdminDisputesPage });
