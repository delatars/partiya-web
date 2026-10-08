import { createFileRoute } from "@tanstack/react-router";

import { AdminStuckPage } from "@/modules/backoffice";

export const Route = createFileRoute("/_admin/admin/stuck")({ component: AdminStuckPage });
