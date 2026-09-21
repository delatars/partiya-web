import type { OrderEvent } from "@partiya/api-contracts";
import { describe, expect, it } from "vitest";

import {
  filterEvents,
  groupByDay,
  hasGapBefore,
  lastSeqOf,
  matchesFilter,
  mergeEvents,
} from "./order-feed";

/* Лента заказа — единственное место, где страница журнала склеивается с потоком SSE.
   Ошибка здесь не падает, а тихо показывает неправду: дубль события или дыру в истории.
   Поэтому слияние проверяется отдельно от React. */

const SYSTEM = { kind: "system" as const, name: "Система", orgId: null };

function note(seq: number, occurredAt: string, title = `событие ${String(seq)}`): OrderEvent {
  return {
    seq,
    orderId: 4812,
    occurredAt,
    actor: SYSTEM,
    title,
    detail: null,
    type: "note",
    topic: null,
  };
}

describe("слияние ленты", () => {
  it("склеивает страницу и поток по возрастанию seq", () => {
    const page = [note(1, "2026-09-20T09:00:00Z"), note(2, "2026-09-20T10:00:00Z")];
    const live = [note(3, "2026-09-21T09:00:00Z")];

    expect(mergeEvents(page, live).map((event) => event.seq)).toEqual([1, 2, 3]);
  });

  it("не плодит дублей: то же seq приходит и страницей, и каналом", () => {
    const page = [note(1, "2026-09-20T09:00:00Z"), note(2, "2026-09-20T10:00:00Z")];
    const repeated = [note(2, "2026-09-20T10:00:00Z"), note(3, "2026-09-21T09:00:00Z")];

    const merged = mergeEvents(page, repeated);
    expect(merged.map((event) => event.seq)).toEqual([1, 2, 3]);
  });

  it("уточнённая версия события побеждает прежнюю", () => {
    const merged = mergeEvents(
      [note(2, "2026-09-20T10:00:00Z", "старый текст")],
      [note(2, "2026-09-20T10:00:00Z", "новый текст")],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe("новый текст");
  });

  it("порядок прихода не влияет на порядок ленты", () => {
    const merged = mergeEvents(
      [note(5, "2026-09-21T09:00:00Z")],
      [note(3, "2026-09-20T09:00:00Z")],
    );
    expect(merged.map((event) => event.seq)).toEqual([3, 5]);
  });

  it("пустой поток оставляет ленту как есть", () => {
    const page = [note(1, "2026-09-20T09:00:00Z")];
    expect(mergeEvents(page, [])).toEqual(page);
  });

  it("lastSeqOf отдаёт курсор дочитывания", () => {
    expect(lastSeqOf([])).toBe(0);
    expect(lastSeqOf([note(1, "2026-09-20T09:00:00Z"), note(7, "2026-09-21T09:00:00Z")])).toBe(7);
  });
});

describe("разрывы журнала", () => {
  const page = [note(1, "2026-09-20T09:00:00Z"), note(2, "2026-09-20T10:00:00Z")];

  it("событие сразу за последним разрывом не считается", () => {
    expect(hasGapBefore(page, note(3, "2026-09-21T09:00:00Z"))).toBe(false);
  });

  it("пропуск seq — это дыра: её надо дочитать курсором", () => {
    expect(hasGapBefore(page, note(5, "2026-09-21T09:00:00Z"))).toBe(true);
  });

  it("на пустой ленте разрыва нет: начальную страницу экран грузит отдельно", () => {
    expect(hasGapBefore([], note(42, "2026-09-21T09:00:00Z"))).toBe(false);
  });

  it("опоздавшее событие не считается разрывом", () => {
    expect(hasGapBefore(page, note(2, "2026-09-20T10:00:00Z"))).toBe(false);
  });
});

describe("фильтр ленты", () => {
  const events: OrderEvent[] = [
    note(1, "2026-09-20T09:00:00Z"),
    {
      seq: 2,
      orderId: 4812,
      occurredAt: "2026-09-20T10:00:00Z",
      actor: SYSTEM,
      title: "Фотоотчёт",
      type: "photo_report",
      photos: [],
    },
    {
      seq: 3,
      orderId: 4812,
      occurredAt: "2026-09-20T11:00:00Z",
      actor: SYSTEM,
      title: "Резерв",
      type: "money",
      operation: "hold",
      amount: 100,
    },
  ];

  it("«всё» пропускает любое событие", () => {
    expect(filterEvents(events, "all")).toHaveLength(3);
  });

  it("фото отбираются по виду события", () => {
    expect(filterEvents(events, "photo").map((event) => event.seq)).toEqual([2]);
  });

  it("деньги отбираются по виду события", () => {
    expect(matchesFilter(events[2] as OrderEvent, "money")).toBe(true);
    expect(matchesFilter(events[2] as OrderEvent, "photo")).toBe(false);
  });
});

describe("группировка по дням", () => {
  const now = new Date("2026-09-21T18:00:00");

  it("новые дни сверху, внутри дня — новые события сверху", () => {
    const groups = groupByDay(
      [
        note(1, "2026-09-19T12:30:00"),
        note(2, "2026-09-21T09:15:00"),
        note(3, "2026-09-21T16:10:00"),
      ],
      now,
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.events.map((event) => event.seq)).toEqual([3, 2]);
    expect(groups[1]?.events.map((event) => event.seq)).toEqual([1]);
  });

  it("сегодня и вчера называются по-человечески", () => {
    const groups = groupByDay(
      [
        note(1, "2026-09-19T12:30:00"),
        note(2, "2026-09-20T10:00:00"),
        note(3, "2026-09-21T09:15:00"),
      ],
      now,
    );

    expect(groups.map((group) => group.title)).toEqual([
      "Сегодня, 21 сентября",
      "Вчера, 20 сентября",
      "19 сентября",
    ]);
  });

  it("пустая лента даёт пустой список групп", () => {
    expect(groupByDay([], now)).toEqual([]);
  });
});
