/* Домен «Уведомления» — крейт `notifications` (ARCHITECTURE.md, 8.4 и 7.6):

     GET  /notifications?unread=&topic=
     POST /notifications/read
     GET  /me/notification-settings
     PUT  /me/notification-settings
     GET  /me/counters
     GET  /me/stream                       → SSE: счётчики шапки и новые уведомления

   Уведомление — это доставленная копия события, а не само событие. Журнал заказа
   хранится вечно и виден обеим сторонам; уведомление адресное, прочитывается и
   настраивается по каналам. Поэтому у них разные таблицы и разные API.

   Счётчики шапки приходят одним объектом (`UserCounters`), а не пятью запросами:
   их считает одна выборка, и разъехаться между собой они не должны. */

/** Тема уведомления. Она же строка таблицы «Куда присылать». */
export type NotificationTopic =
  /** Статусы заказа. */
  | "order_status"
  /** Фотоотчёты. */
  | "photo_report"
  /** Документы на подпись. */
  | "documents"
  /** Сообщения технолога. */
  | "messages"
  /** Споры и возвраты. */
  | "disputes"
  /** Новые предложения по сохранённому поиску. */
  | "offers";

/** Куда доставлять. Внутри платформы уведомление есть всегда — это лента, её не отключить. */
export type NotificationChannel = "email" | "telegram" | "sms";

export interface NotificationItem {
  id: string;
  topic: NotificationTopic;
  /** «Фотоотчёт по заказу № 4812». */
  title: string;
  /** Вторая строка: «Готовые изделия, чёрные · 4 фото». */
  text?: string | null;
  createdAt: string;
  /** `null` — не прочитано (строка подсвечивается). */
  readAt: string | null;
  /** Куда ведёт клик — относительный путь приложения; `null` — некуда. */
  href: string | null;
  /** Заказ, к которому относится уведомление. */
  orderId?: number | null;
}

export interface NotificationList {
  /** По убыванию `createdAt`: лента читается сверху. */
  items: NotificationItem[];
  total: number;
  unread: number;
}

export interface NotificationQuery {
  /** Только непрочитанные. */
  unread?: boolean;
  topic?: NotificationTopic;
  page?: number;
  perPage?: number;
}

/** `POST /notifications/read`. Либо перечисленные, либо все — `all` и `ids` вместе
    не передаются. */
export interface MarkNotificationsReadBody {
  ids?: string[];
  all?: boolean;
}

/** Строка настроек: тема и включённые каналы. */
export interface NotificationPreference {
  topic: NotificationTopic;
  /** «Статусы заказа» — подпись пишет сервер, справочник тем у него. */
  title: string;
  channels: Record<NotificationChannel, boolean>;
  /** Тему нельзя отключить целиком (споры, документы): переключатели заблокированы. */
  required?: boolean;
}

export interface NotificationSettings {
  preferences: NotificationPreference[];
  /** Подключён ли Telegram-бот: без него переключатель канала бесполезен. */
  telegramConnected: boolean;
  /** Ссылка на бота с одноразовым кодом привязки. */
  telegramConnectUrl?: string | null;
  /** Куда уходит почта — адрес пользователя из `/me`. */
  email?: string | null;
  /** Телефон для SMS. */
  phone?: string | null;
}

/** `PUT /me/notification-settings`. Присылаются только изменённые темы и только
    изменённые каналы: полный документ затирал бы настройки, добавленные на сервере. */
export interface UpdateNotificationSettingsBody {
  preferences: {
    topic: NotificationTopic;
    channels: Partial<Record<NotificationChannel, boolean>>;
  }[];
}

/** `GET /me/counters` — счётчики шапки и сайдбара.
 *
 * Они же приходят кадром `counters` в `/me/stream`, поэтому тип один: браузер кладёт
 * тело кадра прямо в кэш запроса, не переводя из одного представления в другое. */
export interface UserCounters {
  /** Непрочитанных уведомлений — цифра на колокольчике. */
  unreadNotifications: number;
  /** Непрочитанных сообщений во всех заказах. */
  unreadMessages: number;
  /** Заказов во вкладке «Ждут действия». */
  ordersAwaitingAction: number;
  /** Документов, ждущих подписи заказчика. */
  documentsAwaitingSignature: number;
  /** Заказов в окне приёмки — по ним таймер идёт прямо сейчас. */
  ordersInAcceptance: number;
  /** Открытых споров. */
  openDisputes: number;
}

/** Тело кадра `notification` пользовательского канала `/me/stream`. */
export type UserStreamNotificationFrame = NotificationItem;

/** Тело кадра `counters` пользовательского канала `/me/stream`. */
export type UserStreamCountersFrame = UserCounters;

/** Коды problem+json домена «Уведомления». */
export type NotificationProblemType =
  /** 422 · в теле `/notifications/read` нет ни `ids`, ни `all`. */
  | "https://partiya.ru/problems/notifications/nothing-to-read"
  /** 409 · канал не настроен: Telegram не привязан, телефон не подтверждён. */
  | "https://partiya.ru/problems/notifications/channel-unavailable";
