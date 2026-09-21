import { describe, expect, it } from "vitest";

import { validateOfferPricing } from "@/shared/lib/offer-pricing";

import { offerFormSchema, type OfferForm, parseAmount, toDraftBody } from "./offer-schema";

/* Правила ступеней — зеркало `crates/pricing/src/lib.rs::validate_offer` (Q-127).
   Проверяются на обоих уровнях: чистой функцией и через схему формы — экран обязан
   подсветить ту строку таблицы, где ошибка сделана. */

const base: OfferForm = {
  title: "Футболки 180 г/м² под СТМ",
  categoryPath: "tekstil/futbolki",
  moq: "500",
  tiers: [
    { fromQty: "500", unitPrice: "182" },
    { fromQty: "1000", unitPrice: "168" },
    { fromQty: "3000", unitPrice: "135" },
  ],
  options: [{ title: "Доп. цвет принта", price: "6000", unit: "per_batch" }],
  leadDaysMin: "14",
  leadDaysMax: "18",
  leadDaysPer1000: "3",
  sampleAvailable: true,
  samplePrice: "1500",
  sampleDays: "5",
  attributes: { material: "Кулирная гладь, хлопок 100 %", density: 180 },
};

function errorsOf(patch: Partial<OfferForm>): Record<string, string> {
  const parsed = offerFormSchema.safeParse({ ...base, ...patch });
  if (parsed.success) return {};
  return Object.fromEntries(
    parsed.error.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("схема редактора предложения", () => {
  it("принимает лестницу из макета: 500/1 000/3 000 → 182/168/135 ₽", () => {
    expect(offerFormSchema.safeParse(base).success).toBe(true);
  });

  it("название обязательно и не длиннее 80 символов", () => {
    expect(errorsOf({ title: "  " }).title).toBeDefined();
    expect(errorsOf({ title: "я".repeat(81) }).title).toBeDefined();
  });

  it("MOQ обязателен и должен быть больше нуля", () => {
    expect(errorsOf({ moq: "0" }).moq).toBeDefined();
    expect(errorsOf({ moq: "" }).moq).toBeDefined();
  });

  it("первая ступень не может быть выше MOQ", () => {
    const errors = errorsOf({
      moq: "300",
      tiers: [
        { fromQty: "500", unitPrice: "182" },
        { fromQty: "1000", unitPrice: "168" },
      ],
    });
    expect(errors["tiers.0.fromQty"]).toContain("выше MOQ");
  });

  it("объёмы ступеней обязаны строго расти", () => {
    const errors = errorsOf({
      tiers: [
        { fromQty: "500", unitPrice: "182" },
        { fromQty: "500", unitPrice: "168" },
      ],
    });
    expect(errors["tiers.1.fromQty"]).toContain("строго расти");
  });

  it("цена на большем объёме не может быть выше — ошибка в той же строке", () => {
    const errors = errorsOf({
      tiers: [
        { fromQty: "500", unitPrice: "168" },
        { fromQty: "1000", unitPrice: "182" },
      ],
    });
    expect(errors["tiers.1.unitPrice"]).toBeDefined();
    // объём при этом корректен — подсвечивается только цена
    expect(errors["tiers.1.fromQty"]).toBeUndefined();
  });

  it("равная цена на соседних ступенях допустима: цена НЕ растёт", () => {
    expect(
      offerFormSchema.safeParse({
        ...base,
        tiers: [
          { fromQty: "500", unitPrice: "168" },
          { fromQty: "1000", unitPrice: "168" },
        ],
      }).success,
    ).toBe(true);
  });

  it("без ступеней предложение не сохранить", () => {
    expect(errorsOf({ tiers: [] }).tiers).toBeDefined();
  });

  it("отрицательная цена ступени и опции отвергается", () => {
    expect(
      errorsOf({ tiers: [{ fromQty: "500", unitPrice: "-1" }] })["tiers.0.unitPrice"],
    ).toBeDefined();
    expect(
      errorsOf({ options: [{ title: "Вышивка", price: "-5", unit: "per_item" }] })[
        "options.0.price"
      ],
    ).toBeDefined();
  });

  it("опция без названия отвергается", () => {
    expect(
      errorsOf({ options: [{ title: "  ", price: "100", unit: "per_batch" }] })["options.0.title"],
    ).toBeDefined();
  });

  it("верхняя граница срока не меньше нижней", () => {
    expect(errorsOf({ leadDaysMin: "20", leadDaysMax: "14" }).leadDaysMax).toBeDefined();
  });

  it("включённый образец требует цены и срока", () => {
    const errors = errorsOf({ sampleAvailable: true, samplePrice: "", sampleDays: "" });
    expect(errors.samplePrice).toBeDefined();
    expect(errors.sampleDays).toBeDefined();
    // выключенный образец пустых полей не требует
    expect(
      offerFormSchema.safeParse({
        ...base,
        sampleAvailable: false,
        samplePrice: "",
        sampleDays: "",
      }).success,
    ).toBe(true);
  });
});

describe("перевод формы в тело запроса", () => {
  it("рубли превращаются в копейки", () => {
    const body = toDraftBody(base);
    expect(body.moq).toBe(500);
    expect(body.tiers?.[1]).toEqual({ fromQty: 1000, unitPrice: 16_800 });
    expect(body.options?.[0]?.price).toBe(600_000);
    expect(body.samplePrice).toBe(150_000);
  });

  it("выключенный образец уходит как null, а не нулём", () => {
    const body = toDraftBody({ ...base, sampleAvailable: false });
    expect(body.samplePrice).toBeNull();
    expect(body.sampleDays).toBeNull();
  });

  it("числа читаются с неразрывными пробелами и запятой", () => {
    expect(parseAmount("1 000")).toBe(1000);
    expect(parseAmount("1 000")).toBe(1000);
    expect(parseAmount("1,5")).toBe(1.5);
    expect(Number.isNaN(parseAmount("не число"))).toBe(true);
  });
});

describe("чистая проверка ступеней совпадает со схемой формы", () => {
  it("те же правила, что у движка котировок", () => {
    expect(
      validateOfferPricing({
        moq: 500,
        tiers: [
          { fromQty: 500, unitPrice: 18_200 },
          { fromQty: 1000, unitPrice: 16_800 },
        ],
      }),
    ).toEqual({});

    const errors = validateOfferPricing({
      moq: 0,
      tiers: [],
    });
    expect(errors.moq).toBeDefined();
    expect(errors.tiers).toBeDefined();
  });
});
