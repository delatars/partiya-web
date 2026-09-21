import { createFileRoute } from "@tanstack/react-router";

import { AdminTaxonomyPage } from "@/modules/backoffice";

export const Route = createFileRoute("/_admin/admin/taxonomy")({ component: AdminTaxonomyPage });
