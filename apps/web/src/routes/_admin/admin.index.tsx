import { createFileRoute } from "@tanstack/react-router";

import { AdminHomePage } from "@/modules/backoffice";

export const Route = createFileRoute("/_admin/admin/")({ component: AdminHomePage });
