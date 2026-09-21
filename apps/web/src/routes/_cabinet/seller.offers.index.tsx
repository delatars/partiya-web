import { createFileRoute } from "@tanstack/react-router";

import { SellerOffersPage } from "@/modules/seller";

export const Route = createFileRoute("/_cabinet/seller/offers/")({ component: SellerOffersPage });
