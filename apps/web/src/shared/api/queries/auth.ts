import type { Me } from "@partiya/api-contracts";
import { queryOptions } from "@tanstack/react-query";

import { isApiError } from "../api-error";
import { getApiService } from "../service";

/* Фабрика ключей домена «Вход». Живёт в слое API, а не в модуле auth: сессию спрашивают
   и guard-ы маршрутов, и шапка, и сайдбар кабинета — модулю её владеть нельзя.
   Инвалидация: всё — AUTH_KEYS.all, только «кто я» — AUTH_KEYS.session(). */
export const AUTH_KEYS = {
  all: ["auth"] as const,
  session: () => [...AUTH_KEYS.all, "session"] as const,
  sessions: () => [...AUTH_KEYS.all, "sessions"] as const,
  requisites: (orgId: string) => [...AUTH_KEYS.all, "requisites", orgId] as const,
};

/** Реквизиты организации (п. 24) — вкладка «Реквизиты» на /company. 403 у ролей без права. */
export const orgRequisitesOptions = (orgId: string) =>
  queryOptions({
    queryKey: AUTH_KEYS.requisites(orgId),
    queryFn: ({ signal }) => getApiService().getOrgRequisites(orgId, signal),
    staleTime: 60_000,
    retry: false,
  });

/** «Кто я» поверх `GET /me`.
 *
 * 401 — это не сбой, а ответ «аноним», поэтому он превращается в `null` здесь, один раз:
 * иначе каждый guard и каждый компонент разбирали бы статус сам, а ErrorBoundary ловил бы
 * обычный выход из системы как ошибку страницы. Остальные статусы (503 без БД, 500)
 * пробрасываются — их видно, и это правильно. */
export const sessionQueryOptions = () =>
  queryOptions({
    queryKey: AUTH_KEYS.session(),
    queryFn: async ({ signal }): Promise<Me | null> => {
      try {
        return await getApiService().getMe(signal);
      } catch (error) {
        if (isApiError(error) && error.status === 401) return null;
        throw error;
      }
    },
    // сессия меняется только нашими же мутациями — они инвалидируют ключ сами
    staleTime: 5 * 60_000,
    retry: false,
  });

/** Живые сеансы пользователя — вкладка «Безопасность» на /company. */
export const authSessionsOptions = () =>
  queryOptions({
    queryKey: AUTH_KEYS.sessions(),
    queryFn: ({ signal }) => getApiService().listAuthSessions(signal),
    staleTime: 30_000,
  });
