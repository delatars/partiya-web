import { redirect } from "@tanstack/react-router";

/* Мост для путей, которые известны только в рантайме.
   Link и navigate уже имеют такой мост (shared/ui/router-link.tsx); guard-ам нужен тот же:
   куда уводить человека, решает `homePathFor`, а дерево маршрутов таких строк не типизирует.
   Маршрут всё равно проверит сам роутер — несуществующий путь отдаст 404, а не тихо промолчит. */

export interface RuntimeRedirect {
  to: string;
  search?: Record<string, unknown>;
  replace?: boolean;
}

/** `redirect()` с вычисленным путём. Использовать как `throw redirectTo({ … })`. */
export function redirectTo(options: RuntimeRedirect): unknown {
  return (redirect as unknown as (opts: RuntimeRedirect) => unknown)(options);
}
