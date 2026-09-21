import { createFileRoute } from "@tanstack/react-router";

import { SellerHomePage } from "@/modules/seller";

export const Route = createFileRoute("/_cabinet/seller/")({ component: SellerHomePage });
