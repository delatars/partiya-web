import { createFileRoute } from "@tanstack/react-router";

import { SellerSamplesPage } from "@/modules/seller";

export const Route = createFileRoute("/_cabinet/seller/samples")({
  component: SellerSamplesPage,
});
