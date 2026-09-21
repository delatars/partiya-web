import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { INITIAL_VERSION, parseInitialData, seedQueryCache } from "./initial-data";

/* Засев кэша из SEO-слепка. Главное здесь — мягкость разбора: `__INITIAL__` приезжает
   из разметки, и приложение обязано подняться при любом её состоянии. */

const OFFER = {
  id: 2231,
  title: "Футболки 180 г/м² под СТМ",
  priceFrom: 13_500,
};

function payload(queries: unknown[], version = INITIAL_VERSION): unknown {
  return { version, queries };
}

/** Заглушка `window` — теста ради, чтобы не трогать глобальный объект jsdom. */
function scopeWith(value: unknown): Window {
  return { __INITIAL__: value } as unknown as Window;
}

describe("разбор __INITIAL__", () => {
  it("читает записи и отдаёт их в том же виде", () => {
    const entries = parseInitialData(
      payload([{ queryKey: ["offers", "detail", 2231], data: OFFER }]),
    );

    expect(entries).toEqual([{ queryKey: ["offers", "detail", 2231], data: OFFER }]);
  });

  it("игнорирует чужую версию схемы целиком", () => {
    const entries = parseInitialData(
      payload([{ queryKey: ["offers", "detail", 2231], data: OFFER }], INITIAL_VERSION + 1),
    );

    expect(entries).toEqual([]);
  });

  it.each([
    ["ничего", undefined],
    ["строку", "<script>"],
    ["массив вместо объекта", [1, 2, 3]],
    ["объект без queries", { version: INITIAL_VERSION }],
    ["версию строкой", { version: "1", queries: [] }],
  ])("не падает на %s", (_name, source) => {
    expect(parseInitialData(source)).toEqual([]);
  });

  it("выбрасывает битые записи, но оставляет годные", () => {
    const entries = parseInitialData(
      payload([
        null,
        { queryKey: [], data: OFFER },
        { queryKey: ["offers", "detail", 2231] },
        { data: OFFER },
        { queryKey: ["offers", "detail", 2231], data: OFFER },
      ]),
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]?.queryKey).toEqual(["offers", "detail", 2231]);
  });

  it("пропускает значение null: это данные, а не их отсутствие", () => {
    const entries = parseInitialData(payload([{ queryKey: ["catalog", "search"], data: null }]));

    expect(entries).toEqual([{ queryKey: ["catalog", "search"], data: null }]);
  });
});

describe("засев кэша", () => {
  it("кладёт данные ровно под тот ключ, который читает страница", () => {
    const queryClient = new QueryClient();
    const scope = scopeWith(
      payload([
        { queryKey: ["offers", "detail", 2231], data: OFFER },
        {
          queryKey: [
            "catalog",
            "search",
            { category: "tekstil/futbolki", sort: "popular", page: 1, perPage: 12 },
          ],
          data: { items: [OFFER], total: 1 },
        },
      ]),
    );

    expect(seedQueryCache(queryClient, scope)).toBe(2);
    expect(queryClient.getQueryData(["offers", "detail", 2231])).toEqual(OFFER);
    // Порядок полей в ключе значения не имеет: TanStack Query хеширует их отсортированно.
    expect(
      queryClient.getQueryData([
        "catalog",
        "search",
        { perPage: 12, page: 1, sort: "popular", category: "tekstil/futbolki" },
      ]),
    ).toEqual({ items: [OFFER], total: 1 });
  });

  it("убирает глобал даже когда засевать нечего", () => {
    const queryClient = new QueryClient();
    const scope = scopeWith("мусор");

    expect(seedQueryCache(queryClient, scope)).toBe(0);
    expect(scope.__INITIAL__).toBeUndefined();
  });

  it("не оставляет данные страницы висеть на window", () => {
    const queryClient = new QueryClient();
    const scope = scopeWith(payload([{ queryKey: ["offers", "detail", 2231], data: OFFER }]));

    seedQueryCache(queryClient, scope);
    expect(scope.__INITIAL__).toBeUndefined();
    // Повторный вызов уже ничего не находит — второй раз кэш не засевается.
    expect(seedQueryCache(queryClient, scope)).toBe(0);
  });

  it("засеянная запись считается свежей: повторного запроса в пределах staleTime не будет", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });
    const scope = scopeWith(payload([{ queryKey: ["offers", "detail", 2231], data: OFFER }]));
    seedQueryCache(queryClient, scope);

    let calls = 0;
    const data = await queryClient.fetchQuery({
      queryKey: ["offers", "detail", 2231],
      queryFn: () => {
        calls += 1;
        return Promise.resolve({ ...OFFER, title: "из сети" });
      },
      staleTime: 60_000,
    });

    expect(calls).toBe(0);
    expect(data).toEqual(OFFER);
  });
});
