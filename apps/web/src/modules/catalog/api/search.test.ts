import type { CatalogQuery, Facet } from "@partiya/api-contracts";
import { describe, expect, it } from "vitest";

import { OFFERS } from "@/shared/mocks";

import { searchOffers } from "./search";

const search = (query: CatalogQuery) => searchOffers(OFFERS, query);
const facet = (facets: readonly Facet[], key: string): Facet => {
  const found = facets.find((item) => item.key === key);
  if (!found) throw new Error(`нет фасета ${key}`);
  return found;
};
const optionCount = (facets: readonly Facet[], key: string, value: string): number =>
  facet(facets, key).options.find((option) => option.value === value)?.count ?? -1;

describe("категории и текст", () => {
  it("без категории отдаёт весь каталог", () => {
    expect(search({}).total).toBe(OFFERS.length);
    expect(OFFERS.length).toBeGreaterThanOrEqual(24);
  });

  it("путь категории фильтрует по префиксу", () => {
    const parent = search({ category: "tekstil" }).total;
    const child = search({ category: "tekstil/futbolki" }).total;
    expect(child).toBeGreaterThan(0);
    expect(parent).toBeGreaterThan(child);
    expect(search({ category: "svechi" }).total).toBe(2);
  });

  it("поиск идёт по названию, фабрике и материалу", () => {
    expect(search({ q: "худи" }).total).toBeGreaterThan(0);
    expect(search({ q: "Волна" }).items.every((o) => o.factory.name === "Волна")).toBe(true);
    expect(search({ q: "кашемир" }).total).toBe(0);
  });
});

describe("фильтры", () => {
  it("значения внутри фасета складываются по «или»", () => {
    const cfo = search({ filters: { region: ["cfo"] } }).total;
    const pfo = search({ filters: { region: ["pfo"] } }).total;
    expect(search({ filters: { region: ["cfo", "pfo"] } }).total).toBe(cfo + pfo);
  });

  it("разные фасеты складываются по «и»", () => {
    const both = search({ filters: { region: ["cfo"], trust: ["sample"] } });
    expect(both.total).toBeGreaterThan(0);
    expect(both.items.every((o) => o.factory.region === "cfo" && o.sampleAvailable)).toBe(true);
    expect(both.total).toBeLessThanOrEqual(search({ filters: { region: ["cfo"] } }).total);
  });

  it("радио «Срок» ограничивает, а «любой» — нет", () => {
    const fast = search({ filters: { lead: ["14"] } });
    expect(fast.items.every((o) => o.leadDaysMin <= 14)).toBe(true);
    expect(search({ filters: { lead: ["any"] } }).total).toBe(OFFERS.length);
  });

  it("диапазоны цены и партии считаются в копейках и штуках", () => {
    const cheap = search({ priceMax: 20_000 });
    expect(cheap.items.every((o) => o.priceFrom <= 20_000)).toBe(true);
    const small = search({ moqMin: 200, moqMax: 300 });
    expect(small.items.every((o) => o.moq >= 200 && o.moq <= 300)).toBe(true);
  });

  it("несовместимые условия дают пустую выдачу", () => {
    expect(search({ priceMin: 90_000, priceMax: 95_000, moqMax: 100 }).total).toBe(0);
  });
});

describe("счётчики фасетов", () => {
  it("считаются без учёта собственного фасета", () => {
    const plain = search({ category: "tekstil/futbolki" });
    const filtered = search({ category: "tekstil/futbolki", filters: { region: ["cfo"] } });
    // выбор ЦФО не обнуляет соседние регионы — иначе фильтр было бы не расширить
    expect(optionCount(filtered.facets, "region", "pfo")).toBe(
      optionCount(plain.facets, "region", "pfo"),
    );
    expect(optionCount(filtered.facets, "region", "pfo")).toBeGreaterThan(0);
  });

  it("чужой фасет сужается выбранным", () => {
    const plain = search({ category: "tekstil/futbolki" });
    const filtered = search({ category: "tekstil/futbolki", filters: { region: ["cfo"] } });
    expect(optionCount(filtered.facets, "trust", "audit")).toBeLessThan(
      optionCount(plain.facets, "trust", "audit"),
    );
  });

  it("выбранные значения помечены, у радио по умолчанию — «любой»", () => {
    const result = search({ filters: { trust: ["audit"] } });
    expect(facet(result.facets, "trust").options.find((o) => o.value === "audit")?.selected).toBe(
      true,
    );
    expect(facet(result.facets, "lead").options.find((o) => o.value === "any")?.selected).toBe(
      true,
    );
  });
});

describe("сортировки", () => {
  const prices = (query: CatalogQuery) => search(query).items.map((o) => o.priceFrom);

  it("дешевле — по возрастанию цены", () => {
    const list = prices({ sort: "price_asc", perPage: 100 });
    expect([...list].sort((a, b) => a - b)).toEqual(list);
  });

  it("быстрее, рейтинг и свободнее упорядочены своим полем", () => {
    const lead = search({ sort: "lead_asc", perPage: 100 }).items.map((o) => o.leadDaysMin);
    expect([...lead].sort((a, b) => a - b)).toEqual(lead);

    const rating = search({ sort: "rating_desc", perPage: 100 }).items.map((o) => o.factory.rating);
    expect([...rating].sort((a, b) => b - a)).toEqual(rating);

    const free = search({ sort: "free_capacity_desc", perPage: 100 }).items.map(
      (o) => o.freeCapacityPct,
    );
    expect([...free].sort((a, b) => b - a)).toEqual(free);
  });

  it("популярное сохраняет порядок фикстур", () => {
    expect(search({ sort: "popular", perPage: 100 }).items.map((o) => o.id)).toEqual(
      OFFERS.map((o) => o.id),
    );
  });
});

describe("пагинация", () => {
  it("режет по perPage и считает страницы", () => {
    const result = search({ perPage: 10 });
    expect(result.items).toHaveLength(10);
    expect(result.pageCount).toBe(Math.ceil(OFFERS.length / 10));
    expect(result.page).toBe(1);
  });

  it("страницы не пересекаются и покрывают выдачу", () => {
    const first = search({ perPage: 10, page: 1 }).items.map((o) => o.id);
    const second = search({ perPage: 10, page: 2 }).items.map((o) => o.id);
    expect(new Set([...first, ...second]).size).toBe(first.length + second.length);
  });

  it("страница за пределами выдачи прижимается к последней", () => {
    const result = search({ perPage: 10, page: 99 });
    expect(result.page).toBe(result.pageCount);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("total считает всю выдачу, а не страницу", () => {
    const result = search({ category: "tekstil/futbolki", perPage: 5 });
    expect(result.total).toBeGreaterThan(result.items.length);
    expect(result.category?.title).toBe("Футболки и худи");
  });
});
