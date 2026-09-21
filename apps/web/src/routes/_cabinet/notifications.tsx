import { createFileRoute } from "@tanstack/react-router";

import { NotificationsPage } from "@/modules/account";

export const Route = createFileRoute("/_cabinet/notifications")({ component: NotificationsPage });
