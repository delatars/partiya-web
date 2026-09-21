import { createFileRoute } from "@tanstack/react-router";

import { LoginPage } from "@/modules/auth";

export const Route = createFileRoute("/_auth/login")({ component: LoginRoute });

function LoginRoute() {
  const { redirect } = Route.useSearch();
  return <LoginPage redirect={redirect} />;
}
