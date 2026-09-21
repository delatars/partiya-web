import type { Me, Organization, OrgRole } from "@partiya/api-contracts";
import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AUTH_KEYS, getApiService, sessionQueryOptions } from "@/shared/api";
import { activeOrgOf, areaOf, isOperator, type SessionArea } from "@/shared/lib/guards";

/* Сессия приложения поверх `GET /me`.
 *
 * Куки сессии фронт не видит (HttpOnly), поэтому «вошли или нет» — это состояние одного
 * запроса, а не своё хранилище. Отсюда два следствия, на которых держится всё остальное:
 *
 *  * единственный источник правды — кэш react-query по ключу AUTH_KEYS.session();
 *  * guard-ы в beforeLoad и компоненты смотрят в один и тот же кэш, поэтому не расходятся.
 *
 * Мутации (вход, выход, смена организации) обновляют кэш ответом сервера и добивают
 * инвалидацией — второе на случай, если у сервера есть что сказать сверх тела ответа. */

export type { SessionArea };

export interface SessionState {
  /** `null` — аноним; во время первой загрузки тоже `null`, смотрите isPending. */
  me: Me | null;
  isPending: boolean;
  isAuthenticated: boolean;
  activeOrg: Organization | null;
  organizations: Organization[];
  role: OrgRole | null;
  isOperator: boolean;
  area: SessionArea | null;
}

export function useSession(): SessionState {
  const { data, isPending } = useQuery(sessionQueryOptions());
  const me = data ?? null;

  return {
    me,
    isPending,
    isAuthenticated: me !== null,
    activeOrg: activeOrgOf(me),
    organizations: me?.organizations ?? [],
    role: me?.activeRole ?? null,
    isOperator: isOperator(me),
    area: areaOf(me),
  };
}

/** Сессия для beforeLoad: ждёт ответа и кладёт его в тот же кэш, что читают компоненты. */
export function ensureSession(queryClient: QueryClient): Promise<Me | null> {
  return queryClient.ensureQueryData(sessionQueryOptions());
}

/** Положить свежий `/me` в кэш — им отвечают и verify, и смена организации. */
export function putSession(queryClient: QueryClient, me: Me | null): void {
  queryClient.setQueryData(sessionQueryOptions().queryKey, me);
}

/** Выход. После него сбрасываем весь кэш: в нём лежат данные предыдущего пользователя. */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => getApiService().logout(),
    onSuccess: async () => {
      putSession(queryClient, null);
      await queryClient.resetQueries();
    },
  });
}

/** Смена активной организации («плательщика»). Членство проверяет бэк, не сайдбар. */
export function useSwitchOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orgId: string) => getApiService().switchActiveOrg(orgId),
    onSuccess: async (me) => {
      putSession(queryClient, me);
      // выдачи кабинета зависят от организации — перечитываем их все
      await queryClient.invalidateQueries();
    },
  });
}

/** Завершить свой сеанс на другом устройстве — вкладка «Безопасность». */
export function useRevokeAuthSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => getApiService().revokeAuthSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUTH_KEYS.sessions() }),
  });
}

/** Инициал для кружка в сайдбаре: первая буква названия без кавычек-ёлочек. */
export function orgInitials(name: string): string {
  const cleaned = name.replace(/^(ООО|АО|ПАО|ЗАО|ИП)\s+/u, "").replace(/[«»"']/gu, "");
  return (cleaned.trim()[0] ?? "?").toUpperCase();
}
