import { createFileRoute, Outlet } from "@tanstack/react-router";

import { postLoginPath, safeRedirect } from "@/shared/lib/guards";
import { redirectTo } from "@/shared/lib/router";
import { ensureSession } from "@/shared/lib/session";
import { AuthShell } from "@/shared/ui";

/* Layout входа и регистрации: карточка по центру и колонка-пояснение справа.
   Вошедшему на этих экранах делать нечего — уводим его домой. Исключение одно и важное:
   человек вошёл, но компании у него нет, и /register для него — следующий шаг, а не тупик. */
export const Route = createFileRoute("/_auth")({
  validateSearch: (input: Record<string, unknown>) => ({
    redirect: safeRedirect(input.redirect),
  }),
  beforeLoad: async ({ context, location, search }) => {
    const me = await ensureSession(context.queryClient);
    if (me === null) return;
    // без организаций регистрация — единственное осмысленное место
    if (me.organizations.length === 0 && location.pathname === "/register") return;
    throw redirectTo({ to: postLoginPath(me, search.redirect), replace: true });
  },
  component: AuthLayoutRoute,
});

function AuthLayoutRoute() {
  return (
    <AuthShell>
      <Outlet />
    </AuthShell>
  );
}
