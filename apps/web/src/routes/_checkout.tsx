import { createFileRoute, Outlet } from "@tanstack/react-router";

import { canEnterCheckout, homePathFor } from "@/shared/lib/guards";
import { redirectTo } from "@/shared/lib/router";
import { ensureSession } from "@/shared/lib/session";
import { CheckoutShell } from "@/shared/ui";

/* Layout оформления: узкая шапка без меню и лотка — из мастера не уходят случайно.

   Проверка здесь, а не на каждой странице: оформление, счёт и образец требуют одного и
   того же — вошедшего человека с активной организацией-заказчиком. Настоящий контроль
   всё равно на бэке; guard только избавляет от экрана, который тут же ответит 401 или 403.

   Возврат после входа — по полному `href`: в адресе оформления лежат объём, опции,
   доставка и номер черновика, и потерять их значит начать партию заново. */
export const Route = createFileRoute("/_checkout")({
  beforeLoad: async ({ context, location }) => {
    const me = await ensureSession(context.queryClient);
    if (me === null) {
      throw redirectTo({ to: "/login", search: { redirect: location.href }, replace: true });
    }
    if (me.organizations.length === 0) {
      throw redirectTo({ to: "/register", replace: true });
    }
    if (!canEnterCheckout(me)) {
      // активна фабрика: переключиться человек может сам, отказом это сообщать избыточно
      throw redirectTo({ to: homePathFor(me), replace: true });
    }
  },
  component: CheckoutLayout,
});

function CheckoutLayout() {
  return (
    <CheckoutShell>
      <Outlet />
    </CheckoutShell>
  );
}
