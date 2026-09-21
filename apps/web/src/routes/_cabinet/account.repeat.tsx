import { createFileRoute } from "@tanstack/react-router";

import { RepeatPage } from "@/modules/account";

export const Route = createFileRoute("/_cabinet/account/repeat")({ component: RepeatPage });
