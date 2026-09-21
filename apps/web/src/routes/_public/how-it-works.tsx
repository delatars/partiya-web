import { createFileRoute } from "@tanstack/react-router";

import { HowItWorksPage } from "@/modules/landing";

export const Route = createFileRoute("/_public/how-it-works")({ component: HowItWorksPage });
