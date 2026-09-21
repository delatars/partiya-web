import { AdminLayout, AdminSideNav, Logo, ShellLinkProvider } from "@partiya/ui";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { adminOverviewOptions } from "@/shared/api";
import { useLogout, useSession } from "@/shared/lib/session";
import { RouterLink, useAppNavigate } from "@/shared/ui/router-link";

/* Макет: .adm — бэк-офис оператора: тёмный сайдбар во всю высоту, без шапки сайта.

   Счётчики берутся из `GET /admin/overview` — той же выборки, что рисует плитки обзора.
   Константы в меню («7») врали бы на второй день работы. */

const GROUPS = [
  {
    title: "Работа",
    items: [
      { label: "Сводка", href: "/admin", queue: null },
      { label: "Модерация", href: "/admin/moderation", queue: "offers" },
      { label: "Споры", href: "/admin/disputes", queue: "disputes" },
      { label: "Финансы и сверка", href: "/admin/finance", queue: "payments" },
    ],
  },
  {
    title: "Справочники",
    items: [
      { label: "Категории и атрибуты", href: "/admin/taxonomy", queue: null },
      { label: "Ранжирование и промо", href: "/admin/ranking", queue: null },
    ],
  },
] as const;

export function AdminShell({ children }: { children?: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const session = useSession();
  const navigate = useAppNavigate();
  const logout = useLogout();
  const { data: overview } = useQuery({
    ...adminOverviewOptions(),
    enabled: session.isOperator,
  });

  const countOf = (key: string | null): number | undefined => {
    if (key === null) return undefined;
    const count = overview?.queues.find((queue) => queue.key === key)?.count;
    return count === undefined || count === 0 ? undefined : count;
  };

  return (
    <ShellLinkProvider component={RouterLink}>
      <AdminLayout
        nav={
          <AdminSideNav
            ariaLabel="Разделы бэк-офиса"
            logo={<Logo label="Партия" href="/admin" size="sm" />}
            groups={GROUPS.map((group) => ({
              ...group,
              items: group.items.map((item) => ({
                key: item.href,
                label: item.label,
                href: item.href,
                count: countOf(item.queue),
                active: pathname === item.href,
              })),
            }))}
            footer={
              <div>
                <div>Оператор · {session.me?.user.name ?? "—"}</div>
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
                  className="mt-1 text-white/60 hover:text-white disabled:opacity-45"
                >
                  {logout.isPending ? "Выходим…" : "Выйти"}
                </button>
              </div>
            }
          />
        }
      >
        {children}
      </AdminLayout>
    </ShellLinkProvider>
  );
}
