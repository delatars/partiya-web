import { Button } from "@partiya/ui";
import type { QueryClient } from "@tanstack/react-query";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

import { isApiError } from "@/shared/api";
import { AppLink, ErrorPage, PublicShell } from "@/shared/ui";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: RootErrorBoundary,
});

/* Макет: экран state-errors, блок .err-page. 404 и падение рендера показываем внутри
   обычной публичной оболочки — из ошибки должно быть куда уйти. */

function NotFound() {
  return (
    <PublicShell>
      <ErrorPage
        code="404"
        title="Такой страницы нет"
        description="Возможно, фабрика сняла предложение или ссылка устарела."
        actions={
          <>
            <Button asChild variant="cta">
              <AppLink to="/catalog">В каталог</AppLink>
            </Button>
            <Button asChild>
              <AppLink to="/">На главную</AppLink>
            </Button>
          </>
        }
      />
    </PublicShell>
  );
}

function RootErrorBoundary({ error, reset }: ErrorComponentProps) {
  const correlationId = isApiError(error) ? error.correlationId : undefined;

  return (
    <PublicShell>
      <ErrorPage
        code="500"
        title="Не получилось загрузить страницу"
        description="Проблема на нашей стороне, мы уже знаем. Заказы и деньги в эскроу в безопасности."
        correlationId={correlationId}
        actions={
          <Button variant="cta" onClick={reset}>
            Обновить
          </Button>
        }
      />
    </PublicShell>
  );
}
