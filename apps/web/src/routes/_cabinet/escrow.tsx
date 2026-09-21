import { createFileRoute } from "@tanstack/react-router";

import { EscrowPage } from "@/modules/account";

export const Route = createFileRoute("/_cabinet/escrow")({ component: EscrowPage });
