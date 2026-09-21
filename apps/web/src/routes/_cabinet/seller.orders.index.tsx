import { createFileRoute } from "@tanstack/react-router";

import { SellerOrdersPage } from "@/modules/seller";

export const Route = createFileRoute("/_cabinet/seller/orders/")({ component: SellerOrdersPage });
