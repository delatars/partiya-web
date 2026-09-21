import type {
  MarkNotificationsReadBody,
  NotificationItem,
  NotificationList,
  NotificationQuery,
  NotificationSettings,
  UpdateNotificationSettingsBody,
  UserCounters,
} from "@partiya/api-contracts";
import { streamEvents } from "@partiya/realtime";

import type { NotificationsApi, UserStreamOptions } from "../domains/notifications";
import type { HttpClient } from "../http-client";

/* Реальный бэк: крейт `notifications`, маршруты под /api/v1. */
export function createNotificationsHttpApi(client: HttpClient, baseUrl: string): NotificationsApi {
  return {
    listNotifications(
      query: NotificationQuery = {},
      signal?: AbortSignal,
    ): Promise<NotificationList> {
      return client.get<NotificationList>("/notifications", {
        query: {
          unread: query.unread,
          topic: query.topic,
          page: query.page,
          perPage: query.perPage,
        },
        signal,
      });
    },

    markNotificationsRead(body: MarkNotificationsReadBody): Promise<NotificationList> {
      return client.post<NotificationList>("/notifications/read", { body });
    },

    getNotificationSettings(signal?: AbortSignal): Promise<NotificationSettings> {
      return client.get<NotificationSettings>("/me/notification-settings", { signal });
    },

    updateNotificationSettings(
      body: UpdateNotificationSettingsBody,
    ): Promise<NotificationSettings> {
      return client.request<NotificationSettings>("PUT", "/me/notification-settings", { body });
    },

    getUserCounters(signal?: AbortSignal): Promise<UserCounters> {
      return client.get<UserCounters>("/me/counters", { signal });
    },

    streamUserEvents(options: UserStreamOptions): () => void {
      const controller = new AbortController();
      void streamEvents({
        url: `${baseUrl}/me/stream`,
        signal: controller.signal,
        onStateChange: options.onStateChange,
        onEvent: (frame) => {
          const payload = parseJson(frame.data);
          if (!payload) return;
          if (frame.event === "notification") {
            options.onNotification?.(payload as NotificationItem);
          } else if (frame.event === "counters") {
            options.onCounters?.(payload as UserCounters);
          }
        },
      });
      return () => {
        controller.abort();
      };
    },
  };
}

function parseJson(data: string): unknown {
  try {
    const parsed: unknown = JSON.parse(data);
    return typeof parsed === "object" && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
}
