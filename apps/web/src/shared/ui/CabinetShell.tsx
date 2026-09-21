import { AccountCard, CabinetLayout, CabinetSideNav } from "@partiya/ui";
import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { cabinetNav, isNavItemActive } from "@/shared/lib/cabinet-nav";
import { useUserCounters } from "@/shared/lib/counters";
import { orgInitials, useLogout, useSession } from "@/shared/lib/session";
import { OrgSwitcher } from "@/shared/ui/OrgSwitcher";
import { PublicShell } from "@/shared/ui/PublicShell";
import { useAppNavigate } from "@/shared/ui/router-link";

/* Макет: cabinet(nav, body) — .cab-layout. Состав меню зависит от активной организации,
   а она приходит из `/me`: сайдбар ничего не выводит из адреса страницы. */

const KIND_TITLE = { customer: "Заказчик", factory: "Завод" } as const;

export function CabinetShell({ children }: { children?: ReactNode }) {
  const session = useSession();
  const navigate = useAppNavigate();
  const logout = useLogout();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const counters = useUserCounters();
  const items = cabinetNav(session.area).map((item) => ({
    key: item.href,
    label: item.label,
    href: item.href,
    // ноль не рисуем: пустой счётчик в меню читается как «тут что-то есть»
    count: item.counter === undefined ? undefined : (counters?.[item.counter] ?? undefined),
    active: isNavItemActive(item, pathname),
  }));

  const active = session.activeOrg;
  const meta = active
    ? `${KIND_TITLE[active.kind]} · ${active.roleTitle} · ИНН ${active.inn}`
    : "Оператор платформы";

  return (
    <PublicShell withFooter={false}>
      <CabinetLayout
        className="pt-4"
        navToggleLabel="Разделы кабинета"
        nav={
          <CabinetSideNav
            ariaLabel="Разделы кабинета"
            groups={[{ items }]}
            account={
              <AccountCard
                name={active?.name ?? session.me?.user.name ?? "Партия"}
                meta={meta}
                initials={orgInitials(active?.name ?? "Партия")}
              />
            }
            footer={
              <div className="border-border mt-1 border-t pt-1">
                {session.organizations.length > 1 && (
                  <OrgSwitcher
                    organizations={session.organizations}
                    activeOrgId={session.me?.activeOrgId ?? null}
                  />
                )}
                <button
                  type="button"
                  disabled={logout.isPending}
                  onClick={() => {
                    logout.mutate(undefined, {
                      onSuccess: () => {
                        navigate({ to: "/", replace: true });
                      },
                    });
                  }}
                  className="text-muted hover:bg-subtle rounded-control w-full px-2.5 py-1.5 text-left text-[12.5px] disabled:opacity-45"
                >
                  {logout.isPending ? "Выходим…" : "Выйти"}
                </button>
              </div>
            }
          />
        }
      >
        {children}
      </CabinetLayout>
    </PublicShell>
  );
}
