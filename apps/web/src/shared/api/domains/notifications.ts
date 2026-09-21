import type {
  MarkNotificationsReadBody,
  NotificationItem,
  NotificationList,
  NotificationQuery,
  NotificationSettings,
  UpdateNotificationSettingsBody,
  UserCounters,
} from "@partiya/api-contracts";

import type { StreamState } from "./tracking";

/** Домен «Уведомления» — модуль-крейт `notifications` (ARCHITECTURE.md, 7.6, 8.4).
 *
 * Пользовательский канал `/me/stream` отдаёт две разные вещи — новые уведомления и
 * счётчики шапки, — поэтому у подписки два обработчика, а не один «onEvent» с разбором
 * типа на месте вызова. */
export interface UserStreamOptions {
  onNotification?: (item: NotificationItem) => void;
  onCounters?: (counters: UserCounters) => void;
  onStateChange?: (state: StreamState) => void;
}

export interface NotificationsApi {
  /** `GET /notifications?unread=&topic=` → 200. */
  listNotifications(query?: NotificationQuery, signal?: AbortSignal): Promise<NotificationList>;

  /** `POST /notifications/read` → 200 с обновлённой лентой. */
  markNotificationsRead(body: MarkNotificationsReadBody): Promise<NotificationList>;

  /** `GET /me/notification-settings` → 200. */
  getNotificationSettings(signal?: AbortSignal): Promise<NotificationSettings>;

  /** `PUT /me/notification-settings` → 200. */
  updateNotificationSettings(body: UpdateNotificationSettingsBody): Promise<NotificationSettings>;

  /** `GET /me/counters` → 200. Счётчики шапки и сайдбара. */
  getUserCounters(signal?: AbortSignal): Promise<UserCounters>;

  /** `GET /me/stream` (SSE). Возвращает функцию отписки. */
  streamUserEvents(options: UserStreamOptions): () => void;
}
