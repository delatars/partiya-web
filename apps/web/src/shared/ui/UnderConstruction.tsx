import { Box, Button, EmptyState } from "@partiya/ui";
import type { ReactNode } from "react";

import { AppLink } from "@/shared/ui/router-link";

/* Заглушка маршрута из карты 7.3, который ещё не реализован: ссылки шапки, подвала
   и меню кабинета никуда не ведут в 404, а следующий агент заменяет компонент страницы. */
export function UnderConstruction({
  title,
  description,
  backTo = "/catalog",
  backLabel = "В каталог",
}: {
  title: ReactNode;
  description?: ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <Box className="my-3">
      <EmptyState
        title="Раздел в разработке"
        description={
          description ?? (
            <>
              «{title}» — экран из карты маршрутов, который ещё не собран. Каркас, маршрут и layout
              уже на месте.
            </>
          )
        }
        action={
          <Button asChild variant="cta">
            <AppLink to={backTo}>{backLabel}</AppLink>
          </Button>
        }
      />
    </Box>
  );
}
