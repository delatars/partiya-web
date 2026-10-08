import { createFileRoute } from "@tanstack/react-router";

import { AdminDeliveryPage } from "@/modules/backoffice";

export const Route = createFileRoute("/_admin/admin/delivery")({ component: AdminDeliveryPage });
