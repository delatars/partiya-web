import type { OfferOption, PriceTier, Quote } from "@partiya/api-contracts";
import { describe, expect, it } from "vitest";

import {
  calculateQuote,
  isQuoteCalcError,
  MAX_TOTAL_DISCOUNT_PERCENT,
  nextTierHint,
  percentOf,
  type QuoteCalcInput,
  tierFor,
} from "./quote";

/* Те же векторы, что в partiya-api/crates/pricing/tests/quote.rs: если фронт и бэк
   разойдутся хоть на копейку, разойдутся именно здесь. */

const rub = (value: number): number => value * 100;

/* Массивы здесь изменяемые: часть тестов портит оффер, чтобы проверить его валидацию.
   `QuotePricing` объявляет их readonly — и правильно делает, движку менять их незачем. */
interface MutablePricing {
  moq: number;
  tiers: PriceTier[];
  options: OfferOption[];
}

/** Оффер 2231 «Футболки 180 г/м² под СТМ», фабрика «Волна» — как в mockups/lenta/data.js. */
function tshirtOffer(): MutablePricing {
  return {
    moq: 500,
    tiers: [
      { fromQty: 500, unitPrice: rub(182) },
      { fromQty: 1000, unitPrice: rub(168) },
      { fromQty: 3000, unitPrice: rub(135) },
    ],
    options: [
      {
        id: "extra-print-color",
        title: "Доп. цвет принта",
        unit: "per_batch",
        price: rub(6_000),
      },
      { id: "own-pantone", title: "Свой Pantone ткани", unit: "per_batch", price: rub(18_000) },
      { id: "embroidery", title: "Вышивка вместо принта", unit: "per_item", price: rub(22) },
    ],
  };
}

const input = (qty: number): QuoteCalcInput => ({ offer: tshirtOffer(), qty });

const sum = (quote: Quote): number => quote.lines.reduce((acc, line) => acc + line.amount, 0);

/** Код ошибки котировки — или `undefined`, если она посчиталась. */
function errorCode(run: () => unknown): string | undefined {
  try {
    run();
    return undefined;
  } catch (error) {
    return isQuoteCalcError(error) ? error.code : `не QuoteCalcError: ${String(error)}`;
  }
}

describe("calculateQuote — золотой вектор макета", () => {
  it("1 000 × 168 ₽ + доп. цвет 6 000 ₽ + доставка 9 400 ₽ = 183 400 ₽", () => {
    const quote = calculateQuote({
      ...input(1000),
      optionIds: ["extra-print-color"],
      delivery: { amount: rub(9_400) },
    });

    expect(quote.unitPrice).toBe(rub(168));
    expect(quote.subtotal).toBe(rub(174_000));
    expect(quote.discountTotal).toBe(0);
    expect(quote.delivery).toBe(rub(9_400));
    expect(quote.total).toBe(rub(183_400));

    expect(quote.lines).toEqual([
      { kind: "base", title: "Партия 1000 шт", amount: rub(168_000) },
      { kind: "option", title: "Доп. цвет принта", amount: rub(6_000) },
      { kind: "delivery", title: "Доставка", amount: rub(9_400) },
    ]);
    expect(sum(quote)).toBe(quote.total);
  });

  it("заголовок строки доставки берётся из выбранного варианта", () => {
    const quote = calculateQuote({
      ...input(1000),
      delivery: { title: "Доставка до склада WB", amount: rub(9_400) },
    });
    expect(quote.lines.at(-1)).toEqual({
      kind: "delivery",
      title: "Доставка до склада WB",
      amount: rub(9_400),
    });
  });
});

describe("ступени", () => {
  it("границы ступеней: 500→182, 1 000→168, 3 000→135", () => {
    for (const [qty, expected] of [
      [500, 182],
      [999, 182],
      [1000, 168],
      [2999, 168],
      [3000, 135],
      [10_000, 135],
    ] as const) {
      const quote = calculateQuote(input(qty));
      expect(quote.unitPrice, `qty = ${String(qty)}`).toBe(rub(expected));
      expect(quote.total, `qty = ${String(qty)}`).toBe(rub(expected * qty));
    }
  });

  it("tierFor ниже первой ступени не находит ничего", () => {
    expect(tierFor(tshirtOffer().tiers, 100)).toBeUndefined();
  });

  it("подсказка следующей ступени считает недостающий объём", () => {
    expect(nextTierHint(tshirtOffer().tiers, 700)).toEqual({
      qtyLeft: 300,
      fromQty: 1000,
      unitPrice: rub(168),
    });
    expect(nextTierHint(tshirtOffer().tiers, 1000)).toEqual({
      qtyLeft: 2000,
      fromQty: 3000,
      unitPrice: rub(135),
    });
  });

  it("на верхней ступени подсказки нет", () => {
    expect(nextTierHint(tshirtOffer().tiers, 3000)).toBeUndefined();
    expect(nextTierHint(tshirtOffer().tiers, 5000)).toBeUndefined();
  });

  it("ступень без выигрыша в цене подсказкой не считается", () => {
    const flat = [
      { fromQty: 500, unitPrice: rub(100) },
      { fromQty: 1000, unitPrice: rub(100) },
    ];
    expect(nextTierHint(flat, 600)).toBeUndefined();
  });
});

describe("опции", () => {
  it("опция за штуку умножается на объём", () => {
    const quote = calculateQuote({ ...input(1000), optionIds: ["embroidery"] });
    // 1 000 × 168 + 1 000 × 22 = 190 000 ₽
    expect(quote.subtotal).toBe(rub(190_000));
    expect(quote.total).toBe(rub(190_000));
  });

  it("опции сохраняют порядок выбора", () => {
    const quote = calculateQuote({
      ...input(1000),
      optionIds: ["embroidery", "own-pantone"],
    });
    expect(quote.lines.filter((line) => line.kind === "option").map((line) => line.title)).toEqual([
      "Вышивка вместо принта",
      "Свой Pantone ткани",
    ]);
  });
});

describe("скидки", () => {
  it("считаются от товара и не трогают доставку", () => {
    const quote = calculateQuote({
      ...input(1000),
      optionIds: ["extra-print-color"],
      repeatDiscountPercent: 9, // «Повторить партию −9 %» из макета
      delivery: { amount: rub(9_400) },
    });

    // 9 % от 174 000 ₽ = 15 660 ₽ — доставка в базу скидки не входит
    expect(quote.discountTotal).toBe(rub(15_660));
    expect(quote.total).toBe(rub(174_000 - 15_660 + 9_400));

    const discount = quote.lines.find((line) => line.kind === "repeat_discount");
    expect(discount).toEqual({
      kind: "repeat_discount",
      title: "Скидка за повтор −9 %",
      amount: rub(-15_660),
    });
    expect(sum(quote)).toBe(quote.total);
  });

  it("складываются в порядке конвейера", () => {
    const quote = calculateQuote({
      ...input(1000),
      repeatDiscountPercent: 9,
      underloadDiscountPercent: 6,
    });
    // 15 % от 168 000 ₽ = 25 200 ₽, из них 9 % = 15 120 ₽ и 6 % = 10 080 ₽
    expect(quote.discountTotal).toBe(rub(25_200));
    expect(quote.total).toBe(rub(142_800));
    expect(sum(quote)).toBe(quote.total);
  });

  it("превышение потолка урезается, а не отвергается", () => {
    const quote = calculateQuote({
      ...input(1000),
      repeatDiscountPercent: 25,
      underloadDiscountPercent: 20,
    });
    expect(
      quote.lines
        .filter((line) => line.kind === "repeat_discount" || line.kind === "underload_discount")
        .map((line) => line.title),
    ).toEqual(["Скидка за повтор −25 %", "Скидка на недозагруз −5 %"]);
    expect(quote.discountTotal).toBe((rub(168_000) * MAX_TOTAL_DISCOUNT_PERCENT) / 100);
    expect(quote.total).toBe(rub(117_600));
  });

  it("правило, съеденное потолком, строки не добавляет", () => {
    const quote = calculateQuote({
      ...input(1000),
      repeatDiscountPercent: 30,
      underloadDiscountPercent: 10,
    });
    expect(quote.lines.some((line) => line.kind === "underload_discount")).toBe(false);
  });

  it("ноль и отсутствие процента строки не дают", () => {
    const quote = calculateQuote({ ...input(1000), repeatDiscountPercent: 0 });
    expect(quote.lines).toHaveLength(2); // база + доставка
    expect(quote.discountTotal).toBe(0);
  });

  it("процент округляется от половины вверх", () => {
    expect(percentOf(1005, 50)).toBe(503);
    expect(percentOf(rub(183_400), 8)).toBe(rub(14_672));
  });
});

describe("ошибки входа", () => {
  it("объём ниже MOQ", () => {
    expect(errorCode(() => calculateQuote(input(499)))).toBe("below_moq");
  });

  it("неизвестная опция", () => {
    expect(errorCode(() => calculateQuote({ ...input(1000), optionIds: ["gold-plating"] }))).toBe(
      "unknown_option",
    );
  });

  it("опция указана дважды", () => {
    expect(
      errorCode(() => calculateQuote({ ...input(1000), optionIds: ["embroidery", "embroidery"] })),
    ).toBe("duplicate_option");
  });

  it("битый оффер: MOQ 0, нет ступеней, ступени не по возрастанию, растущая цена", () => {
    expect(
      errorCode(() => calculateQuote({ ...input(1000), offer: { ...tshirtOffer(), moq: 0 } })),
    ).toBe("zero_moq");

    expect(
      errorCode(() => calculateQuote({ ...input(1000), offer: { ...tshirtOffer(), tiers: [] } })),
    ).toBe("empty_tiers");

    const swapped = tshirtOffer();
    // меняем местами вторую и третью ступени: первая остаётся на уровне MOQ
    [swapped.tiers[1], swapped.tiers[2]] = [swapped.tiers[2]!, swapped.tiers[1]!];
    expect(errorCode(() => calculateQuote({ ...input(1000), offer: swapped }))).toBe(
      "unsorted_tiers",
    );

    const rising = tshirtOffer();
    rising.tiers[1] = { fromQty: 1000, unitPrice: rub(200) };
    expect(errorCode(() => calculateQuote({ ...input(1000), offer: rising }))).toBe(
      "increasing_tier_price",
    );

    expect(
      errorCode(() => calculateQuote({ ...input(1000), offer: { ...tshirtOffer(), moq: 100 } })),
    ).toBe("first_tier_above_moq");
  });

  it("отрицательные суммы", () => {
    expect(errorCode(() => calculateQuote({ ...input(1000), delivery: { amount: -1 } }))).toBe(
      "negative_amount",
    );

    const negativeTier = tshirtOffer();
    negativeTier.tiers[2] = { fromQty: 3000, unitPrice: -100 };
    expect(errorCode(() => calculateQuote({ ...input(1000), offer: negativeTier }))).toBe(
      "negative_amount",
    );

    const negativeOption = tshirtOffer();
    negativeOption.options[0] = {
      id: "extra-print-color",
      title: "Доп. цвет принта",
      unit: "per_batch",
      price: -5,
    };
    expect(errorCode(() => calculateQuote({ ...input(1000), offer: negativeOption }))).toBe(
      "negative_amount",
    );
  });

  it("процент вне диапазона", () => {
    expect(errorCode(() => calculateQuote({ ...input(1000), repeatDiscountPercent: 101 }))).toBe(
      "percent_out_of_range",
    );
    expect(errorCode(() => calculateQuote({ ...input(1000), underloadDiscountPercent: 140 }))).toBe(
      "percent_out_of_range",
    );
  });
});
