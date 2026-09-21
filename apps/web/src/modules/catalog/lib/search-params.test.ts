import { describe, expect, it } from "vitest";

import {
  activeFilterCount,
  clearFilters,
  facetValues,
  parseCatalogSearch,
  PER_PAGE,
  toCatalogQuery,
  withFacetValue,
  withPatch,
} from "./search-params";

/* Роутер отдаёт уже разобранный объект: «14» приходит числом, «cfo,pfo» — строкой. */

describe("parseCatalogSearch", () => {
  it("пустой URL даёт пустое состояние — дефолты не хранятся", () => {
    expect(parseCatalogSearch({})).toEqual({});
  });

  it("читает фасеты, диапазоны и режим показа", () => {
    expect(
      parseCatalogSearch({
        region: "cfo,pfo",
        trust: "audit",
        lead: 14,
        view: "list",
        sort: "price_asc",
        page: 3,
        priceMin: 90,
        priceMax: 700,
      }),
    ).toEqual({
      region: "cfo,pfo",
      trust: "audit",
      lead: 14,
      view: "list",
      sort: "price_asc",
      page: 3,
      priceMin: 90,
      priceMax: 700,
    });
  });

  it("мусор в URL не роняет страницу, а отбрасывается", () => {
    const search = parseCatalogSearch({
      sort: "by_vibes",
      view: "carousel",
      page: 0,
      lead: -3,
      priceMin: "дорого",
    });
    expect(search.sort).toBeUndefined();
    expect(search.view).toBeUndefined();
    expect(search.lead).toBeUndefined();
    expect(search.priceMin).toBeUndefined();
  });

  it("первая страница и пустой запрос в состоянии не остаются", () => {
    expect(parseCatalogSearch({ page: 1, q: "" }).page).toBeUndefined();
    expect(parseCatalogSearch({ page: 1, q: "" }).q).toBeUndefined();
  });

  it("числовой запрос из URL остаётся строкой", () => {
    expect(parseCatalogSearch({ q: 1000 }).q).toBe("1000");
  });
});

describe("сериализация фасетов", () => {
  it("значения копятся через запятую", () => {
    const one = withFacetValue({}, "region", "cfo", true);
    const two = withFacetValue(one, "region", "pfo", true);
    expect(two.region).toBe("cfo,pfo");
    expect(facetValues(two, "region")).toEqual(["cfo", "pfo"]);
  });

  it("снятие последнего значения убирает параметр из URL", () => {
    const one = withFacetValue({}, "trust", "audit", true);
    expect(withFacetValue(one, "trust", "audit", false).trust).toBeUndefined();
  });

  it("повторное включение не дублирует значение", () => {
    const one = withFacetValue({}, "region", "cfo", true);
    expect(withFacetValue(one, "region", "cfo", true).region).toBe("cfo");
  });

  it("смена фильтра возвращает на первую страницу", () => {
    expect(withFacetValue({ page: 4 }, "region", "cfo", true).page).toBeUndefined();
    expect(withPatch({ page: 4 }, { sort: "price_asc" }).page).toBeUndefined();
  });

  it("сброс оставляет запрос, сортировку и режим показа", () => {
    expect(
      clearFilters({ q: "худи", sort: "price_asc", view: "list", region: "cfo", lead: 14 }),
    ).toEqual({ q: "худи", sort: "price_asc", view: "list" });
  });

  it("счётчик активных фильтров считает диапазон одним фильтром", () => {
    expect(activeFilterCount({})).toBe(0);
    expect(activeFilterCount({ region: "cfo,pfo", trust: "audit" })).toBe(3);
    expect(activeFilterCount({ priceMin: 90, priceMax: 700 })).toBe(1);
    expect(activeFilterCount({ lead: 21, moqMax: 1000 })).toBe(2);
  });
});

describe("toCatalogQuery", () => {
  it("подставляет дефолты и склеивает путь категории", () => {
    expect(toCatalogQuery({}, ["tekstil", "futbolki"])).toEqual({
      category: "tekstil/futbolki",
      q: undefined,
      sort: "popular",
      page: 1,
      perPage: PER_PAGE,
      filters: undefined,
      priceMin: undefined,
      priceMax: undefined,
      moqMin: undefined,
      moqMax: undefined,
    });
  });

  it("переводит рубли из URL в копейки контракта", () => {
    const query = toCatalogQuery({ priceMin: 90, priceMax: 700 }, []);
    expect(query.priceMin).toBe(9000);
    expect(query.priceMax).toBe(70_000);
    expect(query.category).toBeUndefined();
  });

  it("складывает фасеты в filters, включая радио «Срок»", () => {
    expect(toCatalogQuery({ region: "cfo,pfo", trust: "audit", lead: 14 }, []).filters).toEqual({
      region: ["cfo", "pfo"],
      trust: ["audit"],
      lead: ["14"],
    });
  });
});
