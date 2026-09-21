import { createFileRoute } from "@tanstack/react-router";

import { AdminModerationPage, type ModerationSelection } from "@/modules/backoffice";

/* Очередь и выбранная заявка живут в URL: оператор пересылает коллеге ссылку на
   конкретную заявку, а перезагрузка страницы не сбрасывает разбор на первую строку
   (баг e2e № 4 — «Опубликовать» публиковал не то, что выбрано). */
export const Route = createFileRoute("/_admin/admin/moderation")({
  validateSearch: (input: Record<string, unknown>): ModerationSelection => {
    const queue = input.queue === "factories" ? "factories" : "offers";
    const selected =
      typeof input.selected === "string" && input.selected.length > 0 ? input.selected : undefined;
    return selected === undefined ? { queue } : { queue, selected };
  },
  component: AdminModerationRoute,
});

function AdminModerationRoute() {
  const selection = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <AdminModerationPage
      selection={selection}
      onSelectionChange={(next) => {
        void navigate({ search: next, replace: true });
      }}
    />
  );
}
