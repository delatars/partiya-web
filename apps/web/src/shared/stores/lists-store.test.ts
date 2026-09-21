import { beforeEach, describe, expect, it } from "vitest";

import type { ListEntry } from "./lists-store";
import { COMPARE_LIMIT, useListsStore } from "./lists-store";

const entry = (id: number): ListEntry => ({
  id,
  title: `Оффер ${String(id)}`,
  priceFrom: id * 100,
  moq: 500,
});

const state = () => useListsStore.getState();

describe("лоток сравнения", () => {
  beforeEach(() => {
    state().clearCompare();
    state().clearFavorites();
    localStorage.clear();
  });

  it("добавляет и убирает по второму клику", () => {
    expect(state().toggleCompare(entry(1))).toBe(true);
    expect(state().compare.map((item) => item.id)).toEqual([1]);
    expect(state().toggleCompare(entry(1))).toBe(false);
    expect(state().compare).toHaveLength(0);
  });

  it("держит не больше четырёх", () => {
    for (let id = 1; id <= COMPARE_LIMIT; id += 1)
      expect(state().toggleCompare(entry(id))).toBe(true);
    expect(state().compare).toHaveLength(COMPARE_LIMIT);

    // пятый не добавляется и не вытесняет уже отложенные
    expect(state().toggleCompare(entry(99))).toBe(false);
    expect(state().compare).toHaveLength(COMPARE_LIMIT);
    expect(state().compare.some((item) => item.id === 99)).toBe(false);
  });

  it("после достижения лимита снятие освобождает место", () => {
    for (let id = 1; id <= COMPARE_LIMIT; id += 1) state().toggleCompare(entry(id));
    state().removeFromCompare(2);
    expect(state().toggleCompare(entry(99))).toBe(true);
    expect(state().compare.map((item) => item.id)).toEqual([1, 3, 4, 99]);
  });

  it("очистка опустошает лоток", () => {
    state().toggleCompare(entry(1));
    state().clearCompare();
    expect(state().compare).toHaveLength(0);
  });
});

describe("избранное", () => {
  beforeEach(() => {
    state().clearFavorites();
    localStorage.clear();
  });

  it("переключается без ограничения по количеству", () => {
    for (let id = 1; id <= 10; id += 1) state().toggleFavorite(entry(id));
    expect(state().favorites).toHaveLength(10);
    state().toggleFavorite(entry(5));
    expect(state().favorites.some((item) => item.id === 5)).toBe(false);
  });

  it("сохраняется в localStorage под своим ключом", () => {
    state().toggleFavorite(entry(7));
    const raw = localStorage.getItem("partiya.lists");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw ?? "{}")).toMatchObject({ state: { favorites: [{ id: 7 }] } });
  });
});
