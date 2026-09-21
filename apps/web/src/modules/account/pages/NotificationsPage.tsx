import type { NotificationChannel, NotificationItem } from "@partiya/api-contracts";
import { Alert, Box, Button, EmptyState, Skeleton, Toggle } from "@partiya/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getApiService,
  isApiError,
  NOTIFICATION_KEYS,
  notificationListOptions,
  notificationSettingsOptions,
} from "@/shared/api";
import { dayKey, formatDayGroup, formatTime } from "@/shared/lib/dates";
import { AppLink } from "@/shared/ui";

/* Макет: экран `notifications` — лента уведомлений и таблица каналов.
 *
 * Уведомление — доставленная копия события заказа, а не само событие: журнал виден обеим
 * сторонам и живёт вечно, уведомление адресное и прочитывается. Поэтому лента ведёт в
 * заказ, а прочитанность двигается отдельным запросом. */

const CHANNELS: { key: NotificationChannel; label: string }[] = [
  { key: "email", label: "Почта" },
  { key: "telegram", label: "Telegram" },
  { key: "sms", label: "SMS" },
];

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const query = useQuery(notificationListOptions());
  const settingsQuery = useQuery(notificationSettingsOptions());

  const markRead = useMutation({
    mutationFn: (ids: string[] | "all") =>
      getApiService().markNotificationsRead(ids === "all" ? { all: true } : { ids }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.counters() });
    },
  });

  const updateSettings = useMutation({
    mutationFn: (
      body: Parameters<ReturnType<typeof getApiService>["updateNotificationSettings"]>[0],
    ) => getApiService().updateNotificationSettings(body),
    onSuccess: (settings) => {
      queryClient.setQueryData(NOTIFICATION_KEYS.settings(), settings);
    },
  });

  const items = query.data?.items ?? [];
  const unread = query.data?.unread ?? 0;
  const days = groupNotifications(items);

  return (
    <>
      <header className="mt-1 mb-3.5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Уведомления</h1>
          <p className="text-muted mt-1">
            {unread === 0 ? "Все прочитаны" : `${String(unread)} непрочитанных`}
          </p>
        </div>
        <Button
          disabled={unread === 0 || markRead.isPending}
          onClick={() => {
            markRead.mutate("all");
          }}
        >
          Прочитать все
        </Button>
      </header>

      {query.isError && (
        <Alert kind="danger" className="mb-3" title="Не удалось загрузить уведомления">
          {isApiError(query.error) ? query.error.message : "Попробуйте обновить страницу."}
        </Alert>
      )}

      <div className="grid items-start gap-3 lg:grid-cols-[1fr_320px]">
        <Box>
          {query.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : items.length === 0 ? (
            <EmptyState
              title="Уведомлений пока нет"
              description="Здесь появятся фотоотчёты, смены статуса, документы на подпись и сообщения технолога."
            />
          ) : (
            days.map((day) => (
              <section key={day.key}>
                <h3 className="font-heading text-muted mt-3.5 mb-1.5 text-xs font-bold tracking-[0.05em] uppercase first:mt-0">
                  {day.title}
                </h3>
                {day.items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onRead={() => {
                      if (item.readAt === null) markRead.mutate([item.id]);
                    }}
                  />
                ))}
              </section>
            ))
          )}
        </Box>

        <Box>
          <h3 className="font-heading text-base font-bold">Куда присылать</h3>
          {settingsQuery.isPending ? (
            <Skeleton className="mt-2 h-40 w-full" />
          ) : (
            <table className="mt-2 w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-muted border-border border-b text-left text-[12px]">
                  <th className="py-1.5 pr-2 font-medium" />
                  {CHANNELS.map((channel) => (
                    <th key={channel.key} className="py-1.5 pr-2 font-medium">
                      {channel.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(settingsQuery.data?.preferences ?? []).map((preference) => (
                  <tr key={preference.topic} className="border-border border-b last:border-0">
                    <td className="py-1.5 pr-2">{preference.title}</td>
                    {CHANNELS.map((channel) => (
                      <td key={channel.key} className="py-1.5 pr-2">
                        <Toggle
                          checked={preference.channels[channel.key]}
                          disabled={preference.required === true && channel.key === "email"}
                          aria-label={`${preference.title}: ${channel.label}`}
                          onCheckedChange={(checked) => {
                            updateSettings.mutate({
                              preferences: [
                                { topic: preference.topic, channels: { [channel.key]: checked } },
                              ],
                            });
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {settingsQuery.data?.telegramConnected === false && (
            <Button asChild className="mt-2.5 w-full">
              <a
                href={settingsQuery.data.telegramConnectUrl ?? "#"}
                target="_blank"
                rel="noreferrer"
              >
                Подключить Telegram-бота
              </a>
            </Button>
          )}
        </Box>
      </div>
    </>
  );
}

function NotificationRow({ item, onRead }: { item: NotificationItem; onRead: () => void }) {
  const content = (
    <>
      <span className="text-muted pt-0.5 text-xs">{formatTime(item.createdAt)}</span>
      <span className="min-w-0">
        <b className="block">
          {item.readAt === null && (
            <span
              aria-hidden="true"
              className="bg-action mr-1.5 inline-block size-[7px] rounded-full align-middle"
            />
          )}
          {item.title}
        </b>
        {item.text != null && item.text !== "" && (
          <span className="text-muted mt-0.5 block text-[12.5px]">{item.text}</span>
        )}
      </span>
    </>
  );

  const className = `grid grid-cols-[46px_1fr] gap-3 border-b border-border py-2.5 text-[13.5px] last:border-0 ${
    item.readAt === null ? "bg-action-soft -mx-4 px-4" : ""
  }`;

  if (item.href === null) {
    return (
      <div className={className} onClick={onRead}>
        {content}
      </div>
    );
  }
  return (
    <AppLink to={item.href} className={className} onClick={onRead}>
      {content}
    </AppLink>
  );
}

interface NotificationDay {
  key: string;
  title: string;
  items: NotificationItem[];
}

function groupNotifications(items: NotificationItem[]): NotificationDay[] {
  const groups = new Map<string, NotificationItem[]>();
  for (const item of items) {
    const key = dayKey(item.createdAt);
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, group]) => ({ key, title: formatDayGroup(key), items: group }));
}
