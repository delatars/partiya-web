import type { UserCounters } from "@partiya/api-contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { getApiService, NOTIFICATION_KEYS, userCountersOptions } from "@/shared/api";

import { useSession } from "./session";

/* Счётчики шапки и сайдбара: `GET /me/counters` плюс пользовательский канал `/me/stream`.
 *
 * Одним объектом, а не пятью запросами: цифры считает одна выборка, и разъехаться между
 * собой они не должны. Канал патчит тот же ключ кэша, что читают компоненты, — поэтому
 * колокольчик и сайдбар обновляются одновременно и одинаково (ARCHITECTURE.md, 7.6).
 *
 * У анонима счётчиков нет: запрос выключен, подписка не поднимается. */

export function useUserCounters(): UserCounters | undefined {
  const session = useSession();
  const queryClient = useQueryClient();
  const enabled = session.isAuthenticated;
  const { data } = useQuery(userCountersOptions(enabled));

  useEffect(() => {
    if (!enabled) return;
    const unsubscribe = getApiService().streamUserEvents({
      onCounters: (counters) => {
        queryClient.setQueryData(NOTIFICATION_KEYS.counters(), counters);
      },
      onNotification: () => {
        void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.lists() });
      },
    });
    return unsubscribe;
  }, [enabled, queryClient]);

  return data;
}
