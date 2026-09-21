import { createFileRoute } from "@tanstack/react-router";

import { SamplesPage } from "@/modules/account";

export const Route = createFileRoute("/_cabinet/samples")({ component: SamplesPage });
