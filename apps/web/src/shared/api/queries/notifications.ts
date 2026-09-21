import type { NotificationQuery } from "@partiya/api-contracts";
import { queryOptions } from "@tanstack/react-query";

import { getApiService } from "../service";

/* Фабрика ключей домена «Уведомления».
 *
 * Счётчики шапки лежат отдельным ключом: их патчит кадр `counters` пользовательского
 * канала, и перечитывать ради них всю ленту незачем. */
export const NOTIFICATION_KEYS = {
  all: ["notifications"] as const,
  lists: () => [...NOTIFICATION_KEYS.all, "list"] as const,
  list: (query: NotificationQuery) => [...NOTIFICATION_KEYS.lists(), query] as const,
  settings: () => [...NOTIFICATION_KEYS.all, "settings"] as const,
  counters: () => ["me", "counters"] as const,
};

export const notificationListOptions = (query: NotificationQuery = {}) =>
  queryOptions({
    queryKey: NOTIFICATION_KEYS.list(query),
    queryFn: ({ signal }) => getApiService().listNotifications(query, signal),
    staleTime: 15_000,
  });

export const notificationSettingsOptions = () =>
  queryOptions({
    queryKey: NOTIFICATION_KEYS.settings(),
    queryFn: ({ signal }) => getApiService().getNotificationSettings(signal),
    staleTime: 5 * 60_000,
  });

/** Счётчики шапки и сайдбара. Включает их вызывающий: у анонима их нет. */
export const userCountersOptions = (enabled: boolean) =>
  queryOptions({
    queryKey: NOTIFICATION_KEYS.counters(),
    queryFn: ({ signal }) => getApiService().getUserCounters(signal),
    enabled,
    staleTime: 30_000,
  });
