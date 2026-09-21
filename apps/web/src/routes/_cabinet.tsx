import { createFileRoute, Outlet } from "@tanstack/react-router";

import { canEnterCabinet, homePathFor } from "@/shared/lib/guards";
import { redirectTo } from "@/shared/lib/router";
import { ensureSession } from "@/shared/lib/session";
import { CabinetShell } from "@/shared/ui";

/* Layout кабинетов: шапка сайта + боковое меню по активной организации.
   Проверка здесь, а не на каждой странице: разделов много, забыть легко, и забытая
   проверка выглядела бы как работающая страница. Настоящий контроль всё равно на бэке —
   guard только избавляет от экрана, который тут же ответит 401 или 403. */
export const Route = createFileRoute("/_cabinet")({
  beforeLoad: async ({ context, location }) => {
    const me = await ensureSession(context.queryClient);
    if (me === null) {
      // href, а не pathname: вернуть надо и фильтры страницы
      throw redirectTo({ to: "/login", search: { redirect: location.href }, replace: true });
    }
    if (me.organizations.length === 0) {
      throw redirectTo({ to: "/register", replace: true });
    }
    if (!canEnterCabinet(me, location.pathname)) {
      // организация не того вида: уводим в его собственный кабинет, а не в отказ —
      // переключиться он может сам, и сообщать об этом ошибкой страницы избыточно
      throw redirectTo({ to: homePathFor(me), replace: true });
    }
  },
  component: CabinetLayoutRoute,
});

function CabinetLayoutRoute() {
  return (
    <CabinetShell>
      <Outlet />
    </CabinetShell>
  );
}
