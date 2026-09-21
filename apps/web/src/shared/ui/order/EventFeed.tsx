import type { OrderEvent } from "@partiya/api-contracts";
import { Chip, cn } from "@partiya/ui";

import { formatTime } from "@/shared/lib/dates";
import { formatRub } from "@/shared/lib/format";

import { FEED_FILTERS, filterEvents, groupByDay, type FeedFilter } from "@/shared/lib/order-feed";
import { PhotoStrip } from "./PhotoStrip";

/* Макет: .feed / .day / .ev — журнал заказа с группировкой по дням.
 *
 * Лента показывает ровно то, что записано в журнал: заголовок и подпись пишет сервер.
 * Браузер решает только две вещи — как сгруппировать по дням и что показать сверх текста
 * (полосу фотографий, сумму, автора). Складывать тексты событий на фронте нельзя: тогда
 * лента заказчика и журнал оператора начнут рассказывать разные истории. */

export function EventFeed({
  events,
  filter,
  onFilterChange,
  onOpenPhoto,
  now,
}: {
  events: OrderEvent[];
  filter: FeedFilter;
  onFilterChange: (filter: FeedFilter) => void;
  onOpenPhoto: (photoId: string) => void;
  now?: Date;
}) {
  const days = groupByDay(filterEvents(events, filter), now);

  return (
    <>
      <div className="mt-2 mb-1 flex flex-wrap gap-1.5">
        {FEED_FILTERS.map((item) => {
          const count = item.key === "all" ? events.length : filterEvents(events, item.key).length;
          return (
            <Chip
              key={item.key}
              on={item.key === filter}
              disabled={count === 0 && item.key !== "all"}
              onClick={() => {
                onFilterChange(item.key);
              }}
            >
              {item.label}
              {count > 0 && <span className="num text-muted">{count}</span>}
            </Chip>
          );
        })}
      </div>

      {days.length === 0 ? (
        <p className="text-muted py-4 text-[13px]">
          {events.length === 0
            ? "Журнал заказа пуст: события появятся после оплаты."
            : "В этом разделе ленты событий пока нет."}
        </p>
      ) : (
        days.map((day) => (
          <section key={day.key}>
            <h3 className="font-heading text-muted mt-3.5 mb-1.5 text-xs font-bold tracking-[0.05em] uppercase first:mt-0">
              {day.title}
            </h3>
            {day.events.map((event) => (
              <EventRow key={event.seq} event={event} onOpenPhoto={onOpenPhoto} />
            ))}
          </section>
        ))
      )}
    </>
  );
}

function EventRow({
  event,
  onOpenPhoto,
}: {
  event: OrderEvent;
  onOpenPhoto: (photoId: string) => void;
}) {
  return (
    <article className="border-border grid grid-cols-[46px_1fr] gap-3 border-b py-2.5 text-[13.5px] last:border-0 sm:grid-cols-[52px_1fr]">
      <span className="text-muted pt-0.5 text-xs">{formatTime(event.occurredAt)}</span>
      <div className="min-w-0">
        <b className={cn("block", event.type === "money" && "text-discount")}>{title(event)}</b>
        {detail(event) !== null && (
          <div className="text-muted mt-0.5 text-[12.5px]">{detail(event)}</div>
        )}
        {event.type === "photo_report" && <PhotoStrip photos={event.photos} onOpen={onOpenPhoto} />}
      </div>
    </article>
  );
}

/** Заголовок строки. Деньги дополняются суммой: её формат — дело браузера. */
function title(event: OrderEvent): string {
  if (event.type === "money") return `${event.title} · ${formatRub(event.amount)}`;
  if (event.type === "message") return `${event.actor.name}: сообщение`;
  return event.title;
}

function detail(event: OrderEvent): string | null {
  if (event.type === "message") return event.message.text;
  if (event.type === "photo_report") {
    return event.detail ?? `${String(event.photos.length)} фото · ${event.actor.name}`;
  }
  return event.detail ?? null;
}
