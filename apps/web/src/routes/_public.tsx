import { createFileRoute, Outlet } from "@tanstack/react-router";

import { CompareTrayBar, PublicShell } from "@/shared/ui";

/* Публичный layout: шапка с поиском, меню категорий, подвал и лоток сравнения. */
export const Route = createFileRoute("/_public")({ component: PublicLayout });

function PublicLayout() {
  return (
    <PublicShell tray={<CompareTrayBar />}>
      <Outlet />
    </PublicShell>
  );
}
