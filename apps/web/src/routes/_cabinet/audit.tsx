import { createFileRoute } from "@tanstack/react-router";

import { SellerAuditPage } from "@/modules/seller";

export const Route = createFileRoute("/_cabinet/audit")({ component: SellerAuditPage });
