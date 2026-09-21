import { createFileRoute } from "@tanstack/react-router";

import { SellerFinancePage } from "@/modules/seller";

export const Route = createFileRoute("/_cabinet/finance")({ component: SellerFinancePage });
