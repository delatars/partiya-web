import { createFileRoute } from "@tanstack/react-router";

import { ForFactoriesPage } from "@/modules/landing";

export const Route = createFileRoute("/_public/for-factories")({ component: ForFactoriesPage });
