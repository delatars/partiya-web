import { createFileRoute } from "@tanstack/react-router";

import { SellerCapacityPage } from "@/modules/seller";

export const Route = createFileRoute("/_cabinet/capacity")({ component: SellerCapacityPage });
