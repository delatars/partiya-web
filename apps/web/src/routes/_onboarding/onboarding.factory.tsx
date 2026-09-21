import { createFileRoute } from "@tanstack/react-router";

import { FactoryOnboardingPage } from "@/modules/auth";

export const Route = createFileRoute("/_onboarding/onboarding/factory")({
  component: FactoryOnboardingPage,
});
