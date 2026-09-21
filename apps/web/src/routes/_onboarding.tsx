import { createFileRoute, Outlet } from "@tanstack/react-router";

import { activeOrgOf, homePathFor } from "@/shared/lib/guards";
import { redirectTo } from "@/shared/lib/router";
import { ensureSession } from "@/shared/lib/session";
import { OnboardingShell } from "@/shared/ui";

/* Layout мастера подключения: узкая колонка, шапка с «Сохранить и выйти».
   Мастер заводской, поэтому активная организация обязана быть заводом — иначе шаги
   про мощность и коэффициенты изделий просто не о чем. */
export const Route = createFileRoute("/_onboarding")({
  beforeLoad: async ({ context, location }) => {
    const me = await ensureSession(context.queryClient);
    if (me === null) {
      throw redirectTo({ to: "/login", search: { redirect: location.href }, replace: true });
    }
    if (activeOrgOf(me)?.kind !== "factory") {
      throw redirectTo({ to: homePathFor(me), replace: true });
    }
  },
  component: OnboardingLayoutRoute,
});

function OnboardingLayoutRoute() {
  return (
    <OnboardingShell>
      <Outlet />
    </OnboardingShell>
  );
}
