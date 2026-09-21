import { createFileRoute, Outlet } from "@tanstack/react-router";

import { homePathFor, isOperator } from "@/shared/lib/guards";
import { redirectTo } from "@/shared/lib/router";
import { ensureSession } from "@/shared/lib/session";
import { AdminShell } from "@/shared/ui";

/* Layout бэк-офиса: тёмный сайдбар, отдельный от сайта.
   ⚠ Признака оператора платформы в контракте бэка нет (см. отчёт, Q-A1): с настоящим `/me`
   сюда не пройдёт никто, и это правильнее, чем пускать любого вошедшего. */
export const Route = createFileRoute("/_admin")({
  beforeLoad: async ({ context, location }) => {
    const me = await ensureSession(context.queryClient);
    if (me === null) {
      throw redirectTo({ to: "/login", search: { redirect: location.href }, replace: true });
    }
    if (!isOperator(me)) throw redirectTo({ to: homePathFor(me), replace: true });
  },
  component: AdminLayoutRoute,
});

function AdminLayoutRoute() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
