import type { OfferDetail } from "@partiya/api-contracts";
import { describe, expect, it } from "vitest";

import {
  checkoutSearch,
  effectiveDeliveryId,
  effectiveQty,
  isOptionAvailable,
  normalizeQty,
  parseOfferSearch,
  qtyStep,
  selectedOptionIds,
  toQuoteRequest,
  withOption,
  withPatch,
} from "./search-params";

/* Роутер отдаёт уже разобранный объект: «1000» приходит числом, опции — строкой. */

const offer = {
  id: 2231,
  moq: 500,
  options: [
    { id: "extra-print-color", title: "Доп. цвет принта", unit: "per_batch", price: 600_000 },
    {
      id: "own-pantone",
      title: "Свой Pantone ткани",
      unit: "per_batch",
      price: 1_800_000,
      minQty: 1000,
    },
    { id: "embroidery", title: "Вышивка вместо принта", unit: "per_item", price: 2_200 },
  ],
  delivery: [
    { id: "wb", title: "Доставка до склада WB", price: 940_000 },
    { id: "pickup", title: "Самовывоз с фабрики", price: 0 },
  ],
} as unknown as OfferDetail;

describe("parseOfferSearch", () => {
  it("пустой URL даёт пустое состояние — дефолты не хранятся", () => {
    expect(parseOfferSearch({})).toEqual({});
  });

  it("читает объём, опции, доставку, повтор и вкладку", () => {
    expect(
      parseOfferSearch({
        qty: 1000,
        options: "extra-print-color,embroidery",
        delivery: "wb",
        repeat: "1",
        tab: "reviews",
      }),
    ).toEqual({
      qty: 1000,
      options: "extra-print-color,embroidery",
      delivery: "wb",
      repeat: true,
      tab: "reviews",
    });
  });

  it("мусор в URL не роняет страницу, а отбрасывается", () => {
    const search = parseOfferSearch({ qty: "дорого", tab: "видео", delivery: "", repeat: "ага" });
    expect(search.qty).toBeUndefined();
    expect(search.tab).toBeUndefined();
    expect(search.delivery).toBeUndefined();
    expect(search.repeat).toBeUndefined();
  });

  it("нулевой и отрицательный объём в состоянии не остаются", () => {
    expect(parseOfferSearch({ qty: 0 }).qty).toBeUndefined();
    expect(parseOfferSearch({ qty: -100 }).qty).toBeUndefined();
  });
});

describe("объём", () => {
  it("по умолчанию равен MOQ и никогда не опускается ниже него", () => {
    expect(effectiveQty({}, 500)).toBe(500);
    expect(normalizeQty(100, 500)).toBe(500);
    expect(normalizeQty(1200, 500)).toBe(1200);
    expect(normalizeQty(1200.7, 500)).toBe(1200);
  });

  it("шаг кнопок растёт вместе с минимальной партией", () => {
    expect(qtyStep(200)).toBe(50);
    expect(qtyStep(300)).toBe(100);
    expect(qtyStep(1000)).toBe(500);
  });
});

describe("опции", () => {
  it("порядок выбора сохраняется, повтор не дублируется", () => {
    let search = withOption({}, "embroidery", true);
    search = withOption(search, "extra-print-color", true);
    search = withOption(search, "embroidery", true);
    expect(selectedOptionIds(search)).toEqual(["embroidery", "extra-print-color"]);
  });

  it("снятая последней опция убирает параметр из URL", () => {
    const search = withOption(withOption({}, "embroidery", true), "embroidery", false);
    expect(search.options).toBeUndefined();
  });

  it("опция с минимальным объёмом недоступна ниже него", () => {
    expect(isOptionAvailable({ minQty: 1000 }, 500)).toBe(false);
    expect(isOptionAvailable({ minQty: 1000 }, 1000)).toBe(true);
    expect(isOptionAvailable({}, 1)).toBe(true);
  });
});

describe("доставка", () => {
  it("пусто в URL — первый вариант оффера", () => {
    expect(effectiveDeliveryId({}, offer)).toBe("wb");
  });

  it("неизвестный код доставки откатывается к первому варианту", () => {
    expect(effectiveDeliveryId({ delivery: "телепортация" }, offer)).toBe("wb");
    expect(effectiveDeliveryId({ delivery: "pickup" }, offer)).toBe("pickup");
  });
});

describe("toQuoteRequest", () => {
  it("собирает тело POST /quotes из URL", () => {
    const search = parseOfferSearch({ qty: 1000, options: "extra-print-color", delivery: "wb" });
    expect(toQuoteRequest(offer, search)).toEqual({
      offerId: 2231,
      qty: 1000,
      optionIds: ["extra-print-color"],
      deliveryId: "wb",
      repeat: undefined,
    });
  });

  it("недоступная на этом объёме опция на сервер не уходит", () => {
    const search = parseOfferSearch({ qty: 500, options: "own-pantone,embroidery" });
    expect(toQuoteRequest(offer, search).optionIds).toEqual(["embroidery"]);
  });

  it("неизвестная опция отсеивается — ссылка от старой версии оффера не ломает расчёт", () => {
    const search = parseOfferSearch({ qty: 1000, options: "gold-plating" });
    expect(toQuoteRequest(offer, search).optionIds).toEqual([]);
  });

  it("объём ниже MOQ подтягивается к MOQ", () => {
    expect(toQuoteRequest(offer, parseOfferSearch({ qty: 10 })).qty).toBe(500);
  });

  it("повтор уходит только когда он включён", () => {
    expect(toQuoteRequest(offer, parseOfferSearch({ repeat: "1" })).repeat).toBe(true);
    expect(toQuoteRequest(offer, {}).repeat).toBeUndefined();
  });
});

describe("checkoutSearch", () => {
  it("переносит расчёт в ссылку оформления", () => {
    const search = parseOfferSearch({ qty: 1000, options: "extra-print-color", delivery: "wb" });
    expect(checkoutSearch(offer, search)).toEqual({
      offer: 2231,
      qty: 1000,
      options: "extra-print-color",
      delivery: "wb",
    });
  });

  it("без опций параметр не пишется", () => {
    expect(checkoutSearch(offer, {}).options).toBeUndefined();
  });
});

describe("withPatch", () => {
  it("меняет только переданные поля", () => {
    expect(withPatch({ qty: 1000, tab: "reviews" }, { qty: 3000 })).toEqual({
      qty: 3000,
      tab: "reviews",
    });
  });
});
