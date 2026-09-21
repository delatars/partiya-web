import type { OfferDetail } from "@partiya/api-contracts";
import { describe, expect, it } from "vitest";

import { formatNumber } from "@/shared/lib/format";

import {
  batchTotal,
  bestOfferIds,
  COMPARE_ROWS,
  rowDiffers,
  unitPriceAt,
  visibleRows,
} from "./compare";

const rub = (value: number): number => value * 100;

/** Минимальный оффер сравнения: подставляем только то, на что смотрят строки таблицы. */
function offer(patch: Partial<OfferDetail> & { id: number }): OfferDetail {
  return {
    title: `Оффер ${String(patch.id)}`,
    priceFrom: rub(135),
    moq: 500,
    leadDaysMin: 14,
    leadDaysMax: 18,
    freeCapacityPct: 38,
    sampleAvailable: true,
    badges: ["audit"],
    material: "хлопок 100 %",
    factory: { id: 17, name: "Волна", city: "Иваново", rating: 4.8, reviews: 126 },
    tiers: [
      { fromQty: 500, unitPrice: rub(182) },
      { fromQty: 1000, unitPrice: rub(168) },
      { fromQty: 3000, unitPrice: rub(135) },
    ],
    images: [],
    specs: [],
    options: [],
    delivery: [{ id: "wb", title: "Доставка до склада WB", price: rub(9_400) }],
    sample: { price: rub(1_500), days: 5 },
    ...patch,
  } as OfferDetail;
}

const row = (key: string) => {
  const found = COMPARE_ROWS.find((item) => item.key === key);
  if (!found) throw new Error(`нет строки ${key}`);
  return found;
};

describe("цены на одинаковом объёме", () => {
  it("берут ступень, а не первую цену оффера", () => {
    const a = offer({ id: 1 });
    expect(unitPriceAt(a, 500)).toBe(rub(182));
    expect(unitPriceAt(a, 1000)).toBe(rub(168));
    expect(unitPriceAt(a, 3000)).toBe(rub(135));
  });

  it("ниже MOQ цены нет — в ячейке написано, с какого объёма фабрика берётся", () => {
    const big = offer({
      id: 2,
      moq: 1000,
      tiers: [
        { fromQty: 1000, unitPrice: rub(150) },
        { fromQty: 2000, unitPrice: rub(140) },
      ],
    });
    expect(unitPriceAt(big, 500)).toBeUndefined();
    expect(row("price-500").value(big)).toBe(`MOQ от ${formatNumber(1000)} шт`);
  });
});

describe("итог партии", () => {
  it("считается зеркалом движка котировок — 1 000 × 168 + доставка 9 400", () => {
    expect(batchTotal(offer({ id: 1 }), 1000)).toBe(rub(177_400));
  });

  it("не считается, когда объём ниже MOQ", () => {
    expect(batchTotal(offer({ id: 1, moq: 2000 }), 1000)).toBeUndefined();
    expect(row("batch").value(offer({ id: 1, moq: 2000 }))).toBe("—");
  });
});

describe("лучшее значение в строке", () => {
  const cheap = offer({ id: 1, tiers: [{ fromQty: 500, unitPrice: rub(100) }] });
  const dear = offer({ id: 2, tiers: [{ fromQty: 500, unitPrice: rub(200) }] });

  it("подсвечивает минимальную цену", () => {
    expect([...bestOfferIds(row("price-500"), [cheap, dear])]).toEqual([1]);
  });

  it("для свободной мощности лучше — больше", () => {
    const idle = offer({ id: 3, freeCapacityPct: 70 });
    const busy = offer({ id: 4, freeCapacityPct: 12 });
    expect([...bestOfferIds(row("free"), [idle, busy])]).toEqual([3]);
  });

  it("для рейтинга лучше — выше", () => {
    const good = offer({
      id: 5,
      factory: { id: 1, name: "A", city: "Тула", rating: 4.9, reviews: 10 },
    });
    const worse = offer({
      id: 6,
      factory: { id: 2, name: "B", city: "Тверь", rating: 4.1, reviews: 10 },
    });
    expect([...bestOfferIds(row("rating"), [good, worse])]).toEqual([5]);
  });

  it("одинаковые значения не подсвечиваются — выбирать не из чего", () => {
    expect(bestOfferIds(row("price-500"), [cheap, offer({ id: 7, tiers: cheap.tiers })]).size).toBe(
      0,
    );
  });

  it("ничья между двумя из трёх подсвечивает обоих", () => {
    const twin = offer({ id: 8, tiers: cheap.tiers });
    expect([...bestOfferIds(row("price-500"), [cheap, twin, dear])]).toEqual([1, 8]);
  });

  it("несравнимая строка не подсвечивается", () => {
    expect(bestOfferIds(row("material"), [cheap, dear]).size).toBe(0);
    expect(bestOfferIds(row("city"), [cheap, dear]).size).toBe(0);
  });

  it("один оффер сравнивать не с чем", () => {
    expect(bestOfferIds(row("price-500"), [cheap]).size).toBe(0);
  });

  it("недоступный объём проигрывает доступному", () => {
    const small = offer({ id: 9 });
    const huge = offer({
      id: 10,
      moq: 3000,
      tiers: [{ fromQty: 3000, unitPrice: rub(50) }],
    });
    expect([...bestOfferIds(row("price-500"), [small, huge])]).toEqual([9]);
  });
});

describe("только различия", () => {
  it("прячет строки, где все значения совпали", () => {
    const a = offer({ id: 1 });
    const b = offer({ id: 2, freeCapacityPct: 70 });

    expect(visibleRows([a, b], false)).toHaveLength(COMPARE_ROWS.length);

    const shown = visibleRows([a, b], true).map((item) => item.key);
    expect(shown).toContain("free");
    expect(shown).not.toContain("moq");
    expect(shown).not.toContain("material");
  });

  it("одна колонка различий не скрывает — прятать было бы нечего", () => {
    expect(visibleRows([offer({ id: 1 })], true)).toHaveLength(COMPARE_ROWS.length);
  });

  it("rowDiffers смотрит на текст ячейки, а не на объект", () => {
    const a = offer({ id: 1 });
    const b = offer({ id: 2, leadDaysMin: 21 });
    expect(rowDiffers(row("lead"), [a, b])).toBe(true);
    expect(rowDiffers(row("lead"), [a, offer({ id: 3 })])).toBe(false);
  });
});
