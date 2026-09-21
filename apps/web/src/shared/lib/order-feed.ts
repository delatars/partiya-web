import type { OrderEvent, OrderEventType } from "@partiya/api-contracts";

import { dayKey, formatDayGroup } from "@/shared/lib/dates";

/* Лента заказа: слияние страниц журнала с событиями канала и группировка по дням.
 *
 * Лента собирается из двух источников — постраничного `GET /orders/{id}/events` и живого
 * SSE. Источники пересекаются: после переподключения сервер досылает то, что уже могло
 * приехать страницей. Поэтому слияние идёт по `seq`, а не по порядку прихода:
 *
 *   * дубль по `seq` — это одно и то же событие, и второй раз его рисовать нельзя;
 *   * пропуск в `seq` означает, что часть журнала потерялась, и дочитать её надо
 *     курсором, а не ждать следующего кадра, — иначе в ленте останется дыра, о которой
 *     никто не узнает.
 *
 * Функции чистые: на них стоит вся достоверность экрана, и проверяются они без React. */

/** Слить события, отсортировать по `seq` и убрать дубли. Побеждает НОВАЯ версия события:
    сервер мог переслать то же `seq` с уточнённым телом (например, дозагруженным фото). */
export function mergeEvents(
  current: readonly OrderEvent[],
  incoming: readonly OrderEvent[],
): OrderEvent[] {
  if (incoming.length === 0) return [...current];
  const bySeq = new Map<number, OrderEvent>();
  for (const event of current) bySeq.set(event.seq, event);
  for (const event of incoming) bySeq.set(event.seq, event);
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
}

/** Последний известный `seq` — курсор дочитывания и `Last-Event-ID` канала. */
export function lastSeqOf(events: readonly OrderEvent[]): number {
  return events.at(-1)?.seq ?? 0;
}

/** Пришло событие с разрывом: между лентой и ним потерялась часть журнала.
 *
 * Пустая лента разрывом не считается: первое событие канала может быть каким угодно,
 * а начальную страницу экран запрашивает отдельно. */
export function hasGapBefore(events: readonly OrderEvent[], incoming: OrderEvent): boolean {
  const last = lastSeqOf(events);
  return last > 0 && incoming.seq > last + 1;
}

/* ─────────────────────────────── фильтр ─────────────────────────────── */

/** Вкладки фильтра ленты — из макета: всё, производство, фото, сообщения, деньги. */
export type FeedFilter = "all" | "production" | "photo" | "messages" | "money" | "documents";

const FILTER_TYPES: Record<Exclude<FeedFilter, "all">, OrderEventType[]> = {
  production: ["status_changed", "progress", "note"],
  photo: ["photo_report"],
  messages: ["message"],
  money: ["money"],
  documents: ["document"],
};

export const FEED_FILTERS: { key: FeedFilter; label: string }[] = [
  { key: "all", label: "Всё" },
  { key: "production", label: "Производство" },
  { key: "photo", label: "Фотоотчёты" },
  { key: "messages", label: "Сообщения" },
  { key: "documents", label: "Документы" },
  { key: "money", label: "Деньги" },
];

export function matchesFilter(event: OrderEvent, filter: FeedFilter): boolean {
  if (filter === "all") return true;
  return FILTER_TYPES[filter].includes(event.type);
}

export function filterEvents(events: readonly OrderEvent[], filter: FeedFilter): OrderEvent[] {
  return filter === "all" ? [...events] : events.filter((event) => matchesFilter(event, filter));
}

/* ─────────────────────────────── группировка по дням ─────────────────────────────── */

export interface FeedDay {
  /** ISO-день `2026-09-21` — ключ списка и признак «сегодня». */
  key: string;
  /** Заголовок группы: «Сегодня, 21 сентября». */
  title: string;
  /** События дня — новые сверху, как в макете. */
  events: OrderEvent[];
}

/** Группировка ленты по дням, новые дни сверху и новые события внутри дня сверху.
    «Сегодня» считается от переданного момента — тесты не зависят от часов машины. */
export function groupByDay(events: readonly OrderEvent[], now: Date = new Date()): FeedDay[] {
  const groups = new Map<string, OrderEvent[]>();
  for (const event of events) {
    const key = dayKey(event.occurredAt);
    const bucket = groups.get(key);
    if (bucket) bucket.push(event);
    else groups.set(key, [event]);
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
    .map(([key, items]) => ({
      key,
      title: formatDayGroup(key, now),
      events: [...items].sort((a, b) => b.seq - a.seq),
    }));
}
