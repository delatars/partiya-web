import { createFileRoute } from "@tanstack/react-router";

import { AdminRankingPage } from "@/modules/backoffice";

export const Route = createFileRoute("/_admin/admin/ranking")({ component: AdminRankingPage });
