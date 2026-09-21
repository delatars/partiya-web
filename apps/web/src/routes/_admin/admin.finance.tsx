import { createFileRoute } from "@tanstack/react-router";

import { AdminFinancePage } from "@/modules/backoffice";

export const Route = createFileRoute("/_admin/admin/finance")({ component: AdminFinancePage });
