import type { OrderEvent } from "@partiya/api-contracts";
import { parseBlock, streamEvents } from "@partiya/realtime";
import { describe, expect, it, vi } from "vitest";

import { HttpClient } from "../http-client";
import { createTrackingHttpApi } from "./tracking";

/* SSE-клиент канала заказа. Проверяется на фейковом fetch: настоящего стрима в jsdom нет,
   а восстановление после обрыва — ровно то, ради чего клиент написан вручную вместо
   `EventSource` (ARCHITECTURE.md, 8.3). */

/** Поток из заранее заданных кусков текста. Каждый кусок — как один сетевой пакет. */
function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function sse(seq: number, title: string): string {
  const event: OrderEvent = {
    seq,
    orderId: 4812,
    occurredAt: "2026-09-21T16:10:00Z",
    actor: { kind: "factory", name: "Технолог «Волна»", orgId: null },
    title,
    type: "note",
    topic: null,
  };
  return `event: order_event\nid: ${String(seq)}\ndata: ${JSON.stringify(event)}\n\n`;
}

describe("разбор кадра", () => {
  it("читает id, event и data", () => {
    expect(parseBlock("event: ping\nid: 7\ndata: {}")).toEqual({
      id: "7",
      event: "ping",
      data: "{}",
    });
  });

  it("склеивает многострочный data и пропускает комментарии", () => {
    expect(parseBlock(": keep-alive\ndata: раз\ndata: два")).toEqual({
      id: undefined,
      event: "message",
      data: "раз\nдва",
    });
  });

  it("кадр без data событием не считается", () => {
    expect(parseBlock("event: ping")).toBeUndefined();
  });
});

describe("канал заказа", () => {
  it("разбирает кадры и отдаёт события журнала", async () => {
    const fetchImpl = vi.fn(
      () =>
        Promise.resolve(
          new Response(streamOf([sse(41, "Отшито 650 / 1 000"), sse(42, "Фотоотчёт")]), {
            status: 200,
          }),
        ) as unknown as Promise<Response>,
    );

    const seen: number[] = [];
    const controller = new AbortController();
    const done = streamEvents({
      url: "/api/v1/orders/4812/stream",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      signal: controller.signal,
      sleep: () => {
        controller.abort();
        return Promise.resolve();
      },
      onEvent: (frame) => {
        seen.push(Number(frame.id));
      },
    });
    await done;

    expect(seen).toEqual([41, 42]);
  });

  it("после обрыва переподключается с Last-Event-ID последнего события", async () => {
    const headers: (string | null)[] = [];
    let call = 0;
    const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
      const requestHeaders = (init?.headers ?? {}) as Record<string, string>;
      headers.push(requestHeaders["Last-Event-ID"] ?? null);
      call += 1;
      const body = call === 1 ? streamOf([sse(41, "раз")]) : streamOf([sse(42, "два")]);
      return Promise.resolve(new Response(body, { status: 200 }));
    });

    const seen: number[] = [];
    const controller = new AbortController();
    await streamEvents({
      url: "/api/v1/orders/4812/stream",
      lastEventId: "40",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      signal: controller.signal,
      // пауза между попытками — момент, когда тест решает, продолжать ли
      sleep: () => {
        if (call >= 2) controller.abort();
        return Promise.resolve();
      },
      onEvent: (frame) => {
        seen.push(Number(frame.id));
      },
    });

    expect(seen).toEqual([41, 42]);
    // первый заход — с курсором экрана, второй — с последним полученным событием
    expect(headers).toEqual(["40", "41"]);
  });

  it("401 канал не переподключает: повтор того же запроса не вылечит прав", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(new Response("", { status: 401 })));
    const states: string[] = [];

    await streamEvents({
      url: "/api/v1/orders/4812/stream",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      onEvent: () => undefined,
      onStateChange: (state) => states.push(state),
      sleep: () => Promise.reject(new Error("переподключения быть не должно")),
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(states).toEqual(["connecting", "closed"]);
  });

  it("доменный клиент отдаёт наверх разобранное событие журнала", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(new Response(streamOf([sse(7, "Сырьё закуплено")]), { status: 200 })),
    );
    vi.stubGlobal("fetch", fetchImpl);

    const api = createTrackingHttpApi(new HttpClient("/api/v1"), "/api/v1");
    const seen: OrderEvent[] = [];
    const unsubscribe = api.streamOrderEvents(4812, {
      lastSeq: 6,
      onEvent: (event) => seen.push(event),
    });

    // событие приходит асинхронно — ждём один оборот очереди
    await new Promise((resolve) => setTimeout(resolve, 20));
    unsubscribe();

    expect(seen.map((event) => event.seq)).toEqual([7]);
    expect(seen[0]?.title).toBe("Сырьё закуплено");
  });
});
