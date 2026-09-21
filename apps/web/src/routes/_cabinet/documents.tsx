import { createFileRoute } from "@tanstack/react-router";

import { DocumentsPage } from "@/modules/account";

export const Route = createFileRoute("/_cabinet/documents")({ component: DocumentsPage });
