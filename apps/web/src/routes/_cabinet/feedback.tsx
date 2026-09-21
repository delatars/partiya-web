import { createFileRoute } from "@tanstack/react-router";

import { SellerFeedbackPage } from "@/modules/seller";

export const Route = createFileRoute("/_cabinet/feedback")({ component: SellerFeedbackPage });
